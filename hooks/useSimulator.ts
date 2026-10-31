'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  doc,
  onSnapshot,
  getDoc,
  Unsubscribe
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getUpcomingHolidays, isSpecialWorkingDay } from '@/lib/bangladeshHolidays';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';

// =====================================================
// PRECISION MONEY MATH UTILITIES
// Shared with the server-side trade API (app/api/simulator/trade/route.ts)
// via lib/utils/money.ts so the two never compute a trade differently. Used
// here only for fast client-side display math (portfolio value/gain-loss);
// the actual trade cost/proceeds are now computed authoritatively server-side.
// =====================================================
import { moneyAdd, moneyMultiply, moneySubtract, roundMoney } from '@/lib/utils/money';
import { getDseReportedOpen } from '@/lib/utils/marketHours';

export interface Stock {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  category?: string;
  /** Industry/sector (e.g. "Bank", "Pharmaceuticals & Chemicals"), sourced
   * from lankabd.com — see api/lanka_sector_sync.py. DSE's own boards don't
   * publish this field, so unlike `category` it has no dsebd.org fallback. */
  sector?: string;
  /**
   * False when the stock has had zero matched trades today (see
   * api/market_sync.py). ltp is 0 in that case — it is not a real price, so
   * every consumer must gate on `traded`, not on `ltp > 0`, before treating
   * the price as tradeable or using it for valuation math.
   */
  traded?: boolean;
  /** Yesterday's closing price. Stays populated even when traded is false,
   * so UI can show "last close ৳X" instead of a misleading ৳0.00. */
  ycp?: number;
  // ── Fields below are all written by api/market_sync.py and stored verbatim
  // by app/api/stock-sync/route.ts, but went undeclared here for a long time,
  // so every component silently lost them. They are what a broker-style quote
  // panel needs; do not drop them from this interface again.
  /** Session high. 0 when the stock never traded today. */
  high?: number;
  /** Session low. 0 when the stock never traded today. */
  low?: number;
  /** Today's closing price as published by DSE. */
  close?: number;
  /** Number of matched trades today. `traded` is derived from this > 0. */
  trade?: number;
  /** Turnover in BDT ("TK" on DSE boards). */
  value?: number;
  /** Shares traded today. */
  volume?: number;
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalCost: number;
  purchaseDate: string;
  lots?: { quantity: number; purchaseDate: string; settlementDays?: number }[];
}

export interface SimulatorState {
  balance: number;
  portfolio: PortfolioItem[];
  totalInvested: number;
  totalCurrentValue: number;
  totalGainLoss: number;
  gainLossPercent: number;
  realizedGainLoss: number;
}

export interface MarketInfo {
  stocks: Stock[];
  lastUpdated: string;
  totalStocks: number;
  /** DSE's own session state ("Open" / "Closed" / "Post Close"), scraped off
   * the board by api/market_sync.py. Absent on documents written before that
   * was captured; treated as "no opinion", never as closed. */
  marketStatus?: string | null;
}

export const useSimulator = () => {
  const { user } = useAuth();
  const db = getFirestore();
  
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [simulatorState, setSimulatorState] = useState<SimulatorState>({
    balance: 10000,
    portfolio: [],
    totalInvested: 0,
    totalCurrentValue: 0,
    totalGainLoss: 0,
    gainLossPercent: 0,
    realizedGainLoss: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [bangladeshHolidays, setBangladeshHolidays] = useState<string[]>([]);
  const [nextUpdateIn, setNextUpdateIn] = useState(180); // 3 minutes countdown
  
  const marketUnsubscribe = useRef<Unsubscribe | null>(null);
  const categoriesUnsubscribe = useRef<Unsubscribe | null>(null);
  const sectorsUnsubscribe = useRef<Unsubscribe | null>(null);
  const stateUnsubscribe = useRef<Unsubscribe | null>(null);
  const ensureStateAttempted = useRef(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const categoryMapRef = useRef<Record<string, string>>({});
  const sectorMapRef = useRef<Record<string, string>>({});
  const marketInfoRef = useRef<MarketInfo | null>(null);

  useEffect(() => {
    categoryMapRef.current = categoryMap;
    setMarketInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stocks: prev.stocks.map((s) => ({
          ...s,
          category: categoryMap[s.symbol] || s.category,
        })),
      };
    });
  }, [categoryMap]);

  useEffect(() => {
    sectorMapRef.current = sectorMap;
    setMarketInfo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stocks: prev.stocks.map((s) => ({
          ...s,
          sector: sectorMap[s.symbol] || s.sector,
        })),
      };
    });
  }, [sectorMap]);

  useEffect(() => {
    marketInfoRef.current = marketInfo;
  }, [marketInfo]);

  // ── 1. Load Bangladesh Holidays ──
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const holidays = await getUpcomingHolidays();
        setBangladeshHolidays(holidays);
      } catch (err) {
        console.warn('Failed to load holidays:', err);
        setBangladeshHolidays([]);
      }
    };
    loadHolidays();
  }, []);

  // ── 2. Polling Market Data (With Efficient Countdown) ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const fetchMarketData = async () => {
      if (document.hidden) return; // Efficiency Upgrade
      
      try {
        const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
        const marketRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_info', 'latest');
        const snapshot = await getDoc(marketRef);

        if (snapshot.exists() && isMounted) {
          const data = snapshot.data() as MarketInfo;
          const rawStocks = Array.isArray(data.stocks) ? data.stocks : [];
          // Normalize turnover (`value`): older DSE new-API snapshots stored `valueMn`
          // in millions of BDT (where total market turnover across 390+ stocks is ~3,000-15,000)
          // instead of raw BDT (~3,000,000,000+). Detect and scale to raw BDT automatically.
          const totalRawValue = rawStocks.reduce(
            (sum, s) => sum + (typeof s.value === 'number' && Number.isFinite(s.value) ? s.value : 0),
            0
          );
          const valueScale = totalRawValue > 0 && totalRawValue < 500_000 ? 1_000_000 : 1;

          const mergedStocks = rawStocks.map(stock => {
            const calculatedChangePercent = stock.changePercent !== undefined 
              ? stock.changePercent 
              : (stock.ltp - stock.change > 0 ? (stock.change / (stock.ltp - stock.change)) * 100 : 0);
            const normalizedValue =
              typeof stock.value === 'number' && Number.isFinite(stock.value)
                ? Math.round(stock.value * valueScale * 100) / 100
                : stock.value;

            return {
              ...stock,
              value: normalizedValue,
              changePercent: calculatedChangePercent,
              category: categoryMapRef.current[stock.symbol] || stock.category,
              sector: sectorMapRef.current[stock.symbol] || stock.sector
            };
          });
          setMarketInfo({ ...data, stocks: mergedStocks });
          setNextUpdateIn(180); // Reset timer on successful fetch
        } else if (isMounted && !marketInfoRef.current) {
          setMarketInfo({ stocks: [], lastUpdated: new Date().toISOString(), totalStocks: 0 });
        }
      } catch (err) {
        if (isMounted) setError('Failed to load market data');
      }
    };

    fetchMarketData();

    // 1-second interval handles both the UI countdown and triggering the fetch
    timerId = setInterval(() => {
      if (document.hidden) return; // Pause countdown if user is in another tab
      
      setNextUpdateIn((prev) => {
        if (prev <= 1) {
          fetchMarketData();
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    // Fetch immediately and reset timer when user comes back to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMarketData();
        setNextUpdateIn(180);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => { 
      isMounted = false; 
      clearInterval(timerId); 
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, db]);

  // ── 3. Categories Listener ──
  useEffect(() => {
    if (!user) return;
    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const categoriesRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_info', 'categories');
      categoriesUnsubscribe.current = onSnapshot(categoriesRef, (snapshot) => {
        if (snapshot.exists()) setCategoryMap(snapshot.data().categories || {});
      });
    } catch (err) { console.warn('Categories listener error:', err); }

    return () => { if (categoriesUnsubscribe.current) categoriesUnsubscribe.current(); };
  }, [user, db]);

  // ── 3b. Sectors Listener ── (see api/lanka_sector_sync.py)
  useEffect(() => {
    if (!user) return;
    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const sectorsRef = doc(db, 'artifacts', appId, 'public', 'data', 'market_info', 'sectors');
      sectorsUnsubscribe.current = onSnapshot(sectorsRef, (snapshot) => {
        if (snapshot.exists()) setSectorMap(snapshot.data().sectors || {});
      });
    } catch (err) { console.warn('Sectors listener error:', err); }

    return () => { if (sectorsUnsubscribe.current) sectorsUnsubscribe.current(); };
  }, [user, db]);

  // ── 4. Simulator State Listener ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    ensureStateAttempted.current = false;
    try {
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
      const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');

      stateUnsubscribe.current = onSnapshot(stateRef, async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Omit<SimulatorState, 'totalCurrentValue' | 'totalGainLoss' | 'gainLossPercent'>;
          const currentStocks = marketInfoRef.current?.stocks || [];
          setSimulatorState(prev => ({
            ...data,
            portfolio: data.portfolio || [],
            realizedGainLoss: data.realizedGainLoss || 0,
            totalCurrentValue: calculatePortfolioValue(data.portfolio || [], currentStocks),
            totalGainLoss: calculateGainLoss(data.portfolio || [], currentStocks),
            gainLossPercent: calculateGainLossPercent(data.portfolio || [], currentStocks)
          }));
        } else if (!snapshot.metadata.fromCache && !ensureStateAttempted.current) {
          // Only treat this as a genuinely new user once Firestore has
          // confirmed "not found" from the server (not a stale local cache
          // read racing a concurrent trade), and only try once per mount.
          // The actual creation happens server-side in one atomic
          // transaction (see app/api/simulator/ensure-state) so there is no
          // client-side window where an existing user's real balance and
          // portfolio could be overwritten by this fallback — a bug that
          // previously wiped several real accounts to zero.
          ensureStateAttempted.current = true;
          try {
            await fetchWithFreshToken('/api/simulator/ensure-state', { method: 'POST' });
          } catch (err) {
            console.warn('Failed to initialize simulator state:', err);
            ensureStateAttempted.current = false;
          }
        }
        setLoading(false);
      });
    } catch (err) {
      setError('Failed to initialize state listener');
      setLoading(false);
    }

    return () => { if (stateUnsubscribe.current) stateUnsubscribe.current(); };
  }, [user, db]);

  // Recompute derived portfolio valuations when live market prices update
  // without tearing down the simulator/state Firestore listener.
  useEffect(() => {
    if (!marketInfo) return;
    setSimulatorState(prev => ({
      ...prev,
      totalCurrentValue: calculatePortfolioValue(prev.portfolio, marketInfo.stocks),
      totalGainLoss: calculateGainLoss(prev.portfolio, marketInfo.stocks),
      gainLossPercent: calculateGainLossPercent(prev.portfolio, marketInfo.stocks),
    }));
  }, [marketInfo]);

  // ── 5. Math Calculations ──
  // Bug fixed 2026-08-24: this used to skip any holding whose stock had
  // `traded === false` entirely (ltp is 0 on a no-match day — see
  // api/market_sync.py), valuing it at ৳0 instead of its last close. On any
  // day where even one held stock went untraded, this silently understated
  // totalCurrentValue/totalGainLoss/gainLossPercent for every consumer of
  // this hook. Now falls back to `ycp` exactly like
  // lib/utils/portfolio.ts's getValuationPrice, which the Portfolio/Market
  // screens already use.
  const SANE_PRICE_CAP = 1_000_000; // defensive ceiling against a corrupted scrape value, not a real DSE price
  const calculatePortfolioValue = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const total = portfolio.reduce((sum, item) => {
      const stock = stocks.find(s => s.symbol === item.symbol);
      if (!stock) return sum;
      const price = stock.traded !== false && stock.ltp > 0 ? stock.ltp : (stock.ycp || 0);
      if (price <= 0 || price > SANE_PRICE_CAP) return sum;
      return moneyAdd(sum, moneyMultiply(price, item.quantity));
    }, 0);
    return roundMoney(total);
  };

  const calculateGainLoss = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const currentValue = calculatePortfolioValue(portfolio, stocks);
    const invested = portfolio.reduce((total, item) => moneyAdd(total, item.totalCost), 0);
    return roundMoney(moneySubtract(currentValue, invested));
  };

  const calculateGainLossPercent = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    const invested = portfolio.reduce((total, item) => moneyAdd(total, item.totalCost), 0);
    if (invested === 0) return 0;
    return roundMoney((calculateGainLoss(portfolio, stocks) / invested) * 100);
  };

  const isMarketOpen = useCallback(() => {
    // 1. Force Open if we are in the Preview Environment
    if (process.env.NEXT_PUBLIC_IS_PREVIEW_MODE === 'true') {
      return true;
    }

    // 2. Standard Production Logic
    const now = new Date();
    const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    const hour = bdTime.getUTCHours();
    const minute = bdTime.getUTCMinutes();
    const dayOfWeek = bdTime.getUTCDay();
    
    const dateStr = `${bdTime.getUTCFullYear()}-${String(bdTime.getUTCMonth() + 1).padStart(2, '0')}-${String(bdTime.getUTCDate()).padStart(2, '0')}`;

    const withinHours = hour >= 10 && (hour < 14 || (hour === 14 && minute <= 15));
    if (!withinHours) return false;

    // DSE's own "Market Status", captured by api/market_sync.py off the same
    // board we scrape for prices, outranks both the holiday calendar and the
    // weekend rule whenever it's present and fresh (<= 20m) — mirroring
    // isMarketOpenCorroborated() on the server (lib/utils/marketHours.ts) so
    // the Buy button and the trade API always agree, including on government-
    // declared working Saturdays (e.g. 2026-10-17).
    const dseOpen = getDseReportedOpen({
      marketStatus: marketInfo?.marketStatus,
      lastUpdated: marketInfo?.lastUpdated,
    }, now);
    if (dseOpen !== null) return dseOpen;

    if ((dayOfWeek === 5 || dayOfWeek === 6) && !isSpecialWorkingDay(dateStr)) return false;

    return !bangladeshHolidays.includes(dateStr);
  }, [bangladeshHolidays, marketInfo?.marketStatus, marketInfo?.lastUpdated]);

  // ── 6. UNIFIED TRADE EXECUTION ENGINE ──
  // Trade math/writes now happen server-side (app/api/simulator/trade) via
  // an Admin SDK transaction that re-derives the price from Firestore
  // itself — this hook no longer computes or writes balance/portfolio.
  // Everything below before the fetch is fast client-side UX pre-validation
  // only; the server route re-checks all of it authoritatively and is the
  // real gate. The resulting balance/portfolio changes arrive back through
  // the onSnapshot listener in step 4 above, same as before.
  const executeTrade = useCallback(async (symbol: string, type: 'BUY' | 'SELL', quantity: number) => {
    if (!user || !marketInfo) {
      setTransactionStatus('error');
      setTransactionMessage('User not authenticated or market data not loaded');
      throw new Error('Not authenticated');
    }

    if (!isMarketOpen()) {
      setTransactionStatus('error');
      setTransactionMessage('Market is closed. Orders are only allowed during market hours (10:00 AM - 2:15 PM).');
      throw new Error('Market Closed');
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setTransactionStatus('error');
      setTransactionMessage('Quantity must be a positive integer');
      throw new Error('Invalid Quantity');
    }

    const normalizedSymbol = symbol.trim().toUpperCase();
    const stock = marketInfo.stocks.find(s => s.symbol === normalizedSymbol);
    if (!stock || stock.traded === false || stock.ltp <= 0) {
      setTransactionStatus('error');
      setTransactionMessage('This stock has not traded today or has no live price available.');
      throw new Error('Invalid Stock');
    }

    setTransactionStatus('processing');
    setTransactionMessage(`Processing ${type} order for ${quantity} shares...`);

    try {
      const response = await fetchWithFreshToken('/api/simulator/trade', {
        method: 'POST',
        body: JSON.stringify({ symbol, type, quantity }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json.success) {
        throw new Error(json.error || `Failed to execute ${type} order.`);
      }

      setTransactionStatus('success');
      setTransactionMessage(json.message || `Successfully ${type === 'BUY' ? 'bought' : 'sold'} ${quantity} shares of ${symbol}.`);

    } catch (err: any) {
      console.error(`[Trade Engine] ${type} error:`, err);
      setTransactionStatus('error');
      setTransactionMessage(err.message || `Failed to execute ${type} order.`);
    }
  }, [user, marketInfo, isMarketOpen]);

  const resetTransaction = useCallback(() => {
    setTransactionStatus('idle');
    setTransactionMessage('');
  }, []);

  return {
    marketInfo,
    simulatorState,
    loading,
    error,
    transactionStatus,
    transactionMessage,
    executeTrade,
    isMarketOpen,
    resetTransaction,
    nextUpdateIn // <-- EXPORTING THE TIMER
  };
};