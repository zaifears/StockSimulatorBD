// app/api/simulator/trade/route.ts
// Authoritative, server-side trade execution.
//
// Previously hooks/useSimulator.ts's executeTrade() ran the ENTIRE BUY/SELL
// transaction client-side via the Firestore client SDK, trusting the
// client's own in-memory `stock.ltp` and writing balance/portfolio straight
// to Firestore. Anyone with devtools access could fabricate a price locally
// (or, before firestore.rules gained isSaneBalance(), edit the balance field
// directly) — see the four accounts with 10^10-10^31 "coins" that prompted
// this fix.
//
// This route re-derives the price server-side from the same market_info
// document the client reads for display, runs the same BUY/SELL business
// rules (commission, T+2/T+3 settlement, insufficient balance/shares) inside an Admin SDK
// transaction, and is the only thing that may accept a trade request; the
// client no longer computes or writes balance/portfolio itself.

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isMarketOpenCorroborated } from '@/lib/utils/marketHours';
import { COMMISSION_RATE, moneyAdd, moneySubtract, moneyMultiply, roundMoney } from '@/lib/utils/money';
import {
  addTradingDays,
  dhakaDateKey,
  formatSettlement,
  formatUnlockDate,
  getNextUnlock,
  getLotSettlementDays,
  getSaleableQuantityFromLots,
  getSettlementDays,
} from '@/lib/utils/settlement';

// Ensure Firebase Admin is initialized with full credentials
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUANTITY = 1_000_000;
// Matches firestore.rules' isSaneBalance() cap. Admin SDK writes bypass
// firestore.rules entirely, so this route has to re-enforce the same
// ceiling by hand on the one side (SELL) where a trade increases balance —
// otherwise this endpoint would itself become a new path to an unbounded
// balance.
const SANE_BALANCE_CAP = 100_000_000;

interface Lot {
  quantity: number;
  purchaseDate: string;
  /** Settlement length stamped when the shares were bought (2 for A/B/G/N, 3 for Z). */
  settlementDays?: number;
}

interface PortfolioItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalCost: number;
  purchaseDate: string;
  lots?: Lot[];
}

// Portfolio items only had a single aggregate `purchaseDate` before lots
// were introduced; treat the whole holding as one lot dated by that field.
function getLots(item: PortfolioItem): Lot[] {
  return item.lots && item.lots.length > 0
    ? item.lots
    : [{ quantity: item.quantity, purchaseDate: item.purchaseDate }];
}

function dhakaDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

interface SimulatorStateDoc {
  balance: number;
  portfolio: PortfolioItem[];
  totalInvested?: number;
  realizedGainLoss?: number;
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();

    const adminAuth = getAuth();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { symbol: rawSymbol, type, quantity } = body || {};

    if (typeof rawSymbol !== 'string' || !rawSymbol.trim()) {
      return NextResponse.json({ success: false, error: 'Invalid Stock' }, { status: 400 });
    }
    const symbol = rawSymbol.trim().toUpperCase();
    if (type !== 'BUY' && type !== 'SELL') {
      return NextResponse.json({ success: false, error: "Type must be 'BUY' or 'SELL'" }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
      return NextResponse.json({ success: false, error: 'Quantity must be a positive integer' }, { status: 400 });
    }

    const db = getFirestore();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';

    // Real enforcement, not just a UI wall (see components/app/DisclaimerGate.tsx):
    // an account with no recorded agreement to the educational-use-only
    // disclaimer cannot trade, even if someone bypassed the client-side gate.
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists || !userSnap.data()?.disclaimerAgreedAt) {
      return NextResponse.json(
        { success: false, error: 'You must agree to the educational-use disclaimer before trading.' },
        { status: 403 }
      );
    }

    // Authoritative price: the same market_info doc the client displays.
    // The request body's price (if any) is never read or trusted.
    const marketRef = db.doc(`artifacts/${appId}/public/data/market_info/latest`);
    const marketSnap = await marketRef.get();
    if (!marketSnap.exists) {
      return NextResponse.json({ success: false, error: 'Market data not available' }, { status: 503 });
    }
    const marketDoc = marketSnap.data() || {};

    // Market-open decision, made AFTER loading market data on purpose: it
    // uses DSE's own "Market Status" from the board we scrape, which
    // outranks our hand-maintained holiday calendar in both directions.
    // A wrong calendar date once rejected every order for a full session
    // while DSE traded normally — see lib/utils/marketHours.ts.
    const marketState = isMarketOpenCorroborated({
      marketStatus: marketDoc.marketStatus,
      lastUpdated: marketDoc.lastUpdated,
    });
    if (!marketState.open) {
      console.warn(`[trade] Rejected: market closed (${marketState.reason})`);
      return NextResponse.json(
        { success: false, error: 'Market is closed. Orders are only allowed during market hours (10:00 AM - 2:15 PM).' },
        { status: 400 }
      );
    }
    if (marketState.reason === 'dse-open-overrides-calendar-holiday') {
      // Loud on purpose: this means bangladeshHolidays.ts has a wrong date
      // that would otherwise be blocking trading right now, and needs fixing.
      console.warn('[trade] Holiday calendar says closed but DSE reports Open — trading allowed. Fix lib/bangladeshHolidays.ts.');
    } else if (marketState.reason === 'dse-open-overrides-weekend') {
      console.info('[trade] Weekend calendar says closed but DSE reports Open (special working Saturday) — trading allowed.');
    }

    const stocks = (marketDoc.stocks || []) as Array<{ symbol: string; ltp: number; traded?: boolean; category?: string }>;
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) {
      return NextResponse.json({ success: false, error: 'Stock not found' }, { status: 400 });
    }
    // A stock with zero matched trades today has no live price (ltp is 0 —
    // see api/market_sync.py's `traded` field). Reject rather than let a
    // trade execute against a non-price; this is the server-side backstop
    // behind the client's own disabled Buy/Sell state.
    if (stock.traded === false || typeof stock.ltp !== 'number' || !Number.isFinite(stock.ltp) || stock.ltp <= 0) {
      return NextResponse.json(
        { success: false, error: 'This stock has not traded today, so there is no live price to trade at.' },
        { status: 400 }
      );
    }

    // Settlement is decided by DSE market category (A/B/G/N settle T+2, Z settles
    // T+3). The category comes from the same map the client displays
    // (market_info/categories, written by api/category_sync.py), falling back to
    // the category carried on the price row. A missing category means T+2.
    let category: string | undefined = typeof stock.category === 'string' ? stock.category : undefined;
    try {
      const categoriesSnap = await db.doc(`artifacts/${appId}/public/data/market_info/categories`).get();
      const mapped = categoriesSnap.exists ? categoriesSnap.data()?.categories?.[symbol] : undefined;
      if (typeof mapped === 'string' && mapped.trim()) category = mapped;
    } catch (err) {
      console.warn('[trade] Could not read market categories, using price-row category:', err);
    }
    const settlementDays = getSettlementDays(category);

    const stateRef = db.doc(`artifacts/${appId}/users/${uid}/simulator/state`);
    const historyColRef = db.collection(`artifacts/${appId}/users/${uid}/simulator/state/trade_history`);

    const result = await db.runTransaction(async (transaction) => {
      const stateDoc = await transaction.get(stateRef);
      if (!stateDoc.exists) throw new Error('Simulator state not found');

      const currentState = stateDoc.data() as SimulatorStateDoc;
      const currentBalance =
        typeof currentState.balance === 'number' && Number.isFinite(currentState.balance) ? currentState.balance : 0;
      const portfolio = [...(currentState.portfolio || [])];
      const itemIndex = portfolio.findIndex((item) => item.symbol === symbol);
      const existingItem = itemIndex >= 0 ? portfolio[itemIndex] : null;

      const grossValue = moneyMultiply(stock!.ltp, quantity);
      const commission = roundMoney(grossValue * COMMISSION_RATE);

      let newBalance: number;
      let tradeTotalAmount: number;

      if (type === 'BUY') {
        const totalCost = moneyAdd(grossValue, commission);
        if (currentBalance < totalCost) {
          throw new Error(`Insufficient balance. Required: ৳${totalCost.toFixed(2)}`);
        }

        const nowIso = new Date().toISOString();
        const todayDhaka = dhakaDateStr(nowIso);
        const newLot: Lot = { quantity, purchaseDate: nowIso, settlementDays };

        if (existingItem) {
          const newTotalCost = moneyAdd(existingItem.totalCost, totalCost);
          const newQuantity = existingItem.quantity + quantity;
          const existingLots = getLots(existingItem);
          const lastLot = existingLots[existingLots.length - 1];
          // Fold same-day purchases into one lot instead of growing the array forever,
          // but only when they settle on the same cycle.
          const newLots: Lot[] =
            lastLot &&
            dhakaDateStr(lastLot.purchaseDate) === todayDhaka &&
            getLotSettlementDays(lastLot, category) === settlementDays
              ? [...existingLots.slice(0, -1), { ...lastLot, quantity: lastLot.quantity + quantity, settlementDays }]
              : [...existingLots, newLot];
          portfolio[itemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            averageBuyPrice: roundMoney(newTotalCost / newQuantity),
            totalCost: newTotalCost,
            lots: newLots,
          };
        } else {
          portfolio.push({
            symbol,
            quantity,
            averageBuyPrice: roundMoney(totalCost / quantity),
            totalCost,
            purchaseDate: nowIso,
            lots: [newLot],
          });
        }

        newBalance = moneySubtract(currentBalance, totalCost);
        tradeTotalAmount = -totalCost;

        transaction.set(stateRef, {
          ...currentState,
          balance: newBalance,
          portfolio,
          totalInvested: moneyAdd(currentState.totalInvested || 0, totalCost),
        });
      } else {
        if (!existingItem || existingItem.quantity < quantity) {
          throw new Error(`Insufficient shares. You own ${existingItem?.quantity || 0}.`);
        }

        const now = new Date();
        const existingLots = getLots(existingItem);
        // A lot is sellable once its own settlement cycle (T+2 for A/B/G/N, T+3 for
        // Z, counted in trading days) has elapsed. Lots from before this rule
        // carry no settlementDays and use the stock's current category.
        const eligibleQuantity = getSaleableQuantityFromLots(existingLots, now, category);
        if (quantity > eligibleQuantity) {
          const label = formatSettlement(settlementDays);
          const next = getNextUnlock(existingLots, now, category);
          const unlockNote = next ? ` ${next.quantity} unlock on ${formatUnlockDate(next.date)}.` : '';
          throw new Error(
            eligibleQuantity > 0
              ? `${label} Rule: Only ${eligibleQuantity} of your ${existingItem.quantity} shares have settled and can be sold.${unlockNote}`
              : `${label} Rule: None of your ${existingItem.symbol} shares have settled yet.${unlockNote}`
          );
        }

        // Consume oldest lots first. Because `quantity <= eligibleQuantity`,
        // the shares sold are always drawn from lots that have settled.
        let remainingToSell = quantity;
        const newLots: Lot[] = [];
        for (const lot of existingLots) {
          if (remainingToSell <= 0) {
            newLots.push(lot);
          } else if (lot.quantity <= remainingToSell) {
            remainingToSell -= lot.quantity;
          } else {
            newLots.push({ ...lot, quantity: lot.quantity - remainingToSell });
            remainingToSell = 0;
          }
        }

        const netProceeds = moneySubtract(grossValue, commission);
        const averageCost = existingItem.averageBuyPrice;
        // When selling the full position, use existingItem.totalCost directly so rounding
        // in averageBuyPrice never leaves residual positive or negative totalInvested.
        const costOfSoldShares =
          existingItem.quantity === quantity
            ? roundMoney(existingItem.totalCost)
            : moneyMultiply(averageCost, quantity);
        const realizedGain = moneySubtract(netProceeds, costOfSoldShares);

        newBalance = moneyAdd(currentBalance, netProceeds);
        if (newBalance > SANE_BALANCE_CAP) {
          throw new Error('Trade rejected: resulting balance would exceed the allowed maximum.');
        }

        if (existingItem.quantity === quantity) {
          portfolio.splice(itemIndex, 1);
        } else {
          portfolio[itemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity - quantity,
            totalCost: Math.max(0, moneySubtract(existingItem.totalCost, costOfSoldShares)),
            lots: newLots,
          };
        }

        tradeTotalAmount = netProceeds;

        transaction.set(stateRef, {
          ...currentState,
          balance: newBalance,
          portfolio,
          totalInvested: portfolio.length === 0 ? 0 : Math.max(0, moneySubtract(currentState.totalInvested || 0, costOfSoldShares)),
          realizedGainLoss: moneyAdd(currentState.realizedGainLoss || 0, realizedGain),
        });
      }

      const newHistoryRef = historyColRef.doc();
      transaction.set(newHistoryRef, {
        symbol,
        type,
        quantity,
        price: stock!.ltp,
        commission,
        totalAmount: tradeTotalAmount,
        timestamp: new Date().toISOString(),
      });

      return { newBalance };
    });

    const unlockDate = addTradingDays(dhakaDateKey(new Date()), settlementDays);

    return NextResponse.json({
      success: true,
      message:
        type === 'BUY'
          ? `Successfully bought ${quantity} shares of ${symbol}. Settlement ${formatSettlement(settlementDays)}: you can sell them from ${formatUnlockDate(unlockDate)}.`
          : `Successfully sold ${quantity} shares of ${symbol}.`,
      newBalance: result.newBalance,
      settlement: { category: category ?? null, days: settlementDays, unlockDate },
    });
  } catch (error: any) {
    console.error('❌ Trade API error:', error);
    const message = error?.message || 'Failed to execute trade';
    // Business-rule rejections (insufficient balance/shares, T+2/T+3, missing
    // state, cap) are client-correctable — surface them as 400s with their
    // real message. Anything else stays a generic 500 so internals aren't leaked.
    const isBusinessRuleError = /Insufficient|T\+\d Rule|Simulator state not found|exceed the allowed maximum/.test(
      message
    );
    return NextResponse.json(
      { success: false, error: isBusinessRuleError ? message : 'Failed to execute trade' },
      { status: isBusinessRuleError ? 400 : 500 }
    );
  }
}
