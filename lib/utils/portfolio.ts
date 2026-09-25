// lib/utils/portfolio.ts
// Client-side portfolio/holding math for the broker-style UI.
//
// The T+1 saleable calculation here is a deliberate MIRROR of the
// authoritative server logic in app/api/simulator/trade/route.ts (same
// getLots fallback, same Asia/Dhaka date comparison, same "shares bought
// today are excluded" rule). It exists so the UI can show a SALEABLE figure
// up front instead of letting the user discover the lockout only after the
// server rejects their order. It is NOT a gate — the server re-checks
// everything and remains the only authority.
import { moneyAdd, moneyMultiply, roundMoney, COMMISSION_RATE } from './money';
import type { Stock, PortfolioItem } from '@/hooks/useSimulator';

export interface Lot {
  quantity: number;
  purchaseDate: string;
}

/** Same Asia/Dhaka YYYY-MM-DD key the trade route compares lots on. */
export function dhakaDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

/**
 * Portfolio items predating the lots migration only carry one aggregate
 * `purchaseDate`; treat the whole holding as a single lot dated by it.
 * Mirrors getLots() in app/api/simulator/trade/route.ts.
 */
export function getLots(item: PortfolioItem): Lot[] {
  return item.lots && item.lots.length > 0
    ? item.lots
    : [{ quantity: item.quantity, purchaseDate: item.purchaseDate }];
}

/**
 * Shares that have cleared T+1 and can be sold today. Shares bought today
 * are locked until tomorrow, even when merged into an older position.
 */
export function getSaleableQuantity(item: PortfolioItem, now: Date = new Date()): number {
  const today = dhakaDateStr(now.toISOString());
  return getLots(item).reduce(
    (sum, lot) => (dhakaDateStr(lot.purchaseDate) === today ? sum : sum + lot.quantity),
    0
  );
}

/**
 * The price a position should be valued at. A stock with zero matched trades
 * today reports ltp 0 (see api/market_sync.py) — valuing at that would read
 * as a 100% loss, so fall back to yesterday's close.
 */
export function getValuationPrice(stock: Stock | undefined): number {
  if (!stock) return 0;
  if (stock.traded !== false && stock.ltp > 0) return stock.ltp;
  return stock.ycp || 0;
}

/** Today's per-share price move, or 0 for a stock that never traded today. */
export function getDayChange(stock: Stock | undefined): number {
  if (!stock || stock.traded === false) return 0;
  return stock.change || 0;
}

/**
 * A holding's contribution to today's P&L. `stock.change` is LTP minus
 * YESTERDAY's close — correct for shares that were already held at
 * yesterday's close, but wrong for shares bought TODAY, whose real
 * "since-owned" baseline is their purchase price, not YCP. Naively
 * multiplying the whole quantity by `stock.change` overstates or understates
 * a fresh buy's day P&L by the gap between YCP and the actual buy price.
 *
 * Lots only record quantity + purchaseDate (see getLots), not a per-lot
 * price, so today's-lot cost can't be recovered exactly when it's blended
 * with an older lot. `averageBuyPrice` is used as the best available stand-in
 * for today's portion — exact for a same-day-only holding, an approximation
 * only when today's purchase topped up an existing pre-today position.
 */
export function getDayPnl(item: PortfolioItem, stock: Stock | undefined, now: Date = new Date()): number {
  if (!stock || stock.traded === false) return 0;
  const saleable = getSaleableQuantity(item, now); // held before today
  const boughtToday = item.quantity - saleable;
  const fromOlderShares = moneyMultiply(getDayChange(stock), saleable);
  const fromTodaysShares = moneyMultiply(stock.ltp - item.averageBuyPrice, boughtToday);
  return roundMoney(moneyAdd(fromOlderShares, fromTodaysShares));
}

export interface HoldingMetrics {
  symbol: string;
  quantity: number;
  saleable: number;
  locked: number;
  avgCost: number;
  /** Total amount originally paid, commission included. */
  cost: number;
  ltp: number;
  valuationPrice: number;
  marketValue: number;
  /** Market value minus cost. */
  pnl: number;
  pnlPercent: number;
  /** Today's move on this position only. */
  dayPnl: number;
  dayChangePercent: number;
  traded: boolean;
  category?: string;
  sector?: string;
}

export function getHoldingMetrics(
  item: PortfolioItem,
  stock: Stock | undefined,
  now: Date = new Date()
): HoldingMetrics {
  const valuationPrice = getValuationPrice(stock);
  const marketValue = roundMoney(moneyMultiply(valuationPrice, item.quantity));
  const cost = roundMoney(item.totalCost);
  const pnl = roundMoney(marketValue - cost);
  const saleable = getSaleableQuantity(item, now);

  return {
    symbol: item.symbol,
    quantity: item.quantity,
    saleable,
    locked: item.quantity - saleable,
    avgCost: item.averageBuyPrice,
    cost,
    ltp: stock?.ltp ?? 0,
    valuationPrice,
    marketValue,
    pnl,
    pnlPercent: cost > 0 ? roundMoney((pnl / cost) * 100) : 0,
    dayPnl: getDayPnl(item, stock, now),
    dayChangePercent: stock && stock.traded !== false ? stock.changePercent : 0,
    traded: stock?.traded !== false,
    category: stock?.category,
    sector: stock?.sector,
  };
}

export interface PortfolioTotals {
  currentValue: number;
  investment: number;
  unrealisedPnl: number;
  unrealisedPercent: number;
  dayPnl: number;
  gainers: number;
  losers: number;
  unchanged: number;
  holdings: HoldingMetrics[];
}

export function getPortfolioTotals(
  portfolio: PortfolioItem[],
  stocks: Stock[],
  now: Date = new Date()
): PortfolioTotals {
  const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
  const holdings = portfolio.map((item) => getHoldingMetrics(item, bySymbol.get(item.symbol), now));

  let currentValue = 0;
  let investment = 0;
  let dayPnl = 0;
  let gainers = 0;
  let losers = 0;
  let unchanged = 0;

  for (const h of holdings) {
    currentValue = moneyAdd(currentValue, h.marketValue);
    investment = moneyAdd(investment, h.cost);
    dayPnl = moneyAdd(dayPnl, h.dayPnl);
    if (h.pnl > 0) gainers += 1;
    else if (h.pnl < 0) losers += 1;
    else unchanged += 1;
  }

  const unrealisedPnl = roundMoney(currentValue - investment);

  return {
    currentValue: roundMoney(currentValue),
    investment: roundMoney(investment),
    unrealisedPnl,
    unrealisedPercent: investment > 0 ? roundMoney((unrealisedPnl / investment) * 100) : 0,
    dayPnl: roundMoney(dayPnl),
    gainers,
    losers,
    unchanged,
    holdings,
  };
}

export interface HealthScore {
  overall: number; // 0 - 100
  grade: 'Institutional AAA' | 'Solid Prime' | 'Moderate Speculative' | 'High Risk Alert';
  diversificationScore: number; // 0 - 25
  governanceScore: number; // 0 - 25
  liquidityScore: number; // 0 - 25
  concentrationScore: number; // 0 - 25
  summary: string;
}

export interface DividendRadar {
  estimatedYield: number; // e.g. 5.4%
  projectedAnnualCash: number; // e.g. ৳14,200
  sanchayapatraComparison: {
    sanchayapatraRate: number; // 11.04%
    verdict: string;
  };
  highYieldCount: number;
}

export interface DefensiveAllocation {
  defensivePercent: number; // Pharmaceuticals, Power, Bank, Telecom, Food
  cyclicalPercent: number; // Engineering, Textiles, Tannery, IT, etc.
  defensiveValue: number;
  cyclicalValue: number;
  balanceLabel: 'Defensive Anchor' | 'Balanced Growth' | 'Aggressive Cyclical';
}

export interface PortfolioInsights {
  /** Realized + unrealized — the true lifetime trading result, cash-in-hand aside. */
  totalPnl: number;
  realizedGainLoss: number;
  /** Largest single holding as a share of total holdings value — a concentration/risk signal. */
  topHolding: { symbol: string; percent: number } | null;
  /** Holdings value grouped by DSE market category (A/B/N/Z), as a percent of total. */
  categoryBreakdown: { category: string; percent: number; value: number }[];
  /** Holdings value grouped by industry sector (see api/lanka_sector_sync.py), as a percent of total. */
  sectorBreakdown: { sector: string; percent: number; value: number }[];
  /** Sum of every commission paid across all executed trades — the real cost of activity. */
  lifetimeCommission: number;
  bestMoverToday: { symbol: string; dayPnl: number } | null;
  worstMoverToday: { symbol: string; dayPnl: number } | null;

  // ===== INSTITUTIONAL BROKER-GRADE ANALYTICS =====
  /** Overall Institutional Health Rating (0 to 100) */
  healthScore: HealthScore;
  /** Passive Income & Dividend Yield Projection */
  dividendRadar: DividendRadar;
  /** Defensive Bluechips vs Cyclical Volatility Balance */
  defensiveAllocation: DefensiveAllocation;
  /** Cash vs equity allocation (Dry Powder) */
  allocation: {
    cash: number;
    equity: number;
    totalNetWorth: number;
    cashPercent: number;
    equityPercent: number;
  };
  /** DSE governance & Z-Category junk stock exposure radar */
  categoryRisk: {
    zExposurePercent: number;
    zExposureValue: number;
    aExposurePercent: number;
    bExposurePercent: number;
    nExposurePercent: number;
    riskLevel: 'Prime' | 'Moderate' | 'High';
  };
  /** Trading discipline, win rate, profit factor and fee drag */
  tradingDiscipline: {
    totalTrades: number;
    buyCount: number;
    sellCount: number;
    profitableSells: number;
    lossSells: number;
    winRate: number | null; // null if no closed positions yet
    feeDragPercent: number; // percentage of gross profits eaten by 0.4% brokerage
    profitFactor: number | null; // gross profits / gross losses
    avgWinAmount: number;
    avgLossAmount: number;
    riskRewardRatio: number | null;
    expectancy: number;
  };
  /** T+1 overnight clearing vs instant saleable capital */
  liquidityRadar: {
    saleableValue: number;
    lockedValue: number;
    saleablePercent: number;
    lockedPercent: number;
  };
  /** Concentration radar & Top 3 holdings exposure */
  concentration: {
    top3Holdings: { symbol: string; percent: number; value: number }[];
    top3TotalPercent: number;
    riskAlert: string | null;
  };
}

/**
 * Institutional second-order figures for the Portfolio screen, computed from data
 * already on hand: `getPortfolioTotals` holdings, account's persisted `realizedGainLoss`,
 * trade history, and active cash balance.
 */
export function getPortfolioInsights(
  totals: PortfolioTotals,
  realizedGainLoss: number,
  trades: { type?: 'BUY' | 'SELL'; commission: number; symbol?: string; price?: number; quantity?: number }[],
  cashBalance: number = 0
): PortfolioInsights {
  const { holdings, currentValue } = totals;

  // 1. Top Holding & Concentration
  const sortedHoldings = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  let topHolding: PortfolioInsights['topHolding'] = null;
  if (sortedHoldings.length > 0 && currentValue > 0) {
    const top = sortedHoldings[0];
    topHolding = { symbol: top.symbol, percent: roundMoney((top.marketValue / currentValue) * 100) };
  }

  const top3Holdings = sortedHoldings.slice(0, 3).map((h) => ({
    symbol: h.symbol,
    percent: currentValue > 0 ? roundMoney((h.marketValue / currentValue) * 100) : 0,
    value: h.marketValue,
  }));
  const top3TotalPercent = roundMoney(top3Holdings.reduce((sum, h) => sum + h.percent, 0));

  let riskAlert: string | null = null;
  if (topHolding && topHolding.percent >= 40) {
    riskAlert = `Single-Stock Risk: ${topHolding.symbol} alone represents ${topHolding.percent.toFixed(0)}% of your equity.`;
  } else if (top3TotalPercent >= 70 && holdings.length > 3) {
    riskAlert = `High Concentration: Top 3 holdings account for ${top3TotalPercent.toFixed(0)}% of your portfolio.`;
  }

  // 2. Category Breakdown & Z-Risk Radar
  const byCategory = new Map<string, number>();
  for (const h of holdings) {
    const key = h.category || 'Other';
    byCategory.set(key, (byCategory.get(key) || 0) + h.marketValue);
  }
  const categoryBreakdown = Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      value: roundMoney(value),
      percent: currentValue > 0 ? roundMoney((value / currentValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const zCat = categoryBreakdown.find((c) => c.category === 'Z');
  const aCat = categoryBreakdown.find((c) => c.category === 'A');
  const bCat = categoryBreakdown.find((c) => c.category === 'B');
  const nCat = categoryBreakdown.find((c) => c.category === 'N');

  const zExposurePercent = zCat?.percent || 0;
  const zExposureValue = zCat?.value || 0;
  const aExposurePercent = aCat?.percent || 0;
  const bExposurePercent = bCat?.percent || 0;
  const nExposurePercent = nCat?.percent || 0;

  const riskLevel: 'Prime' | 'Moderate' | 'High' =
    zExposurePercent >= 15 ? 'High' : zExposurePercent > 0 ? 'Moderate' : 'Prime';

  // 3. Sector Breakdown
  const bySector = new Map<string, number>();
  for (const h of holdings) {
    const key = h.sector || 'Other';
    bySector.set(key, (bySector.get(key) || 0) + h.marketValue);
  }
  const sectorBreakdown = Array.from(bySector.entries())
    .map(([sector, value]) => ({
      sector,
      value: roundMoney(value),
      percent: currentValue > 0 ? roundMoney((value / currentValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // 4. Commission & Fee Drag
  const lifetimeCommission = roundMoney(trades.reduce((sum, t) => moneyAdd(sum, t.commission || 0), 0));
  const totalPnl = roundMoney(totals.unrealisedPnl + realizedGainLoss);

  const grossGain = Math.max(0, totals.unrealisedPnl) + Math.max(0, realizedGainLoss) + lifetimeCommission;
  const feeDragPercent = grossGain > 0 ? roundMoney((lifetimeCommission / grossGain) * 100) : 0;

  // 5. Trading Discipline (Win Rate, Profit Factor, Expectancy)
  let buyCount = 0;
  let sellCount = 0;
  let profitableSells = 0;
  let lossSells = 0;
  let grossProfits = 0;
  let grossLosses = 0;

  const buyCostBySymbol = new Map<string, { totalCost: number; quantity: number }>();
  const chronoTrades = [...trades].reverse();
  for (const t of chronoTrades) {
    const sym = t.symbol || '';
    const price = t.price || 0;
    const qty = t.quantity || 0;

    if (t.type === 'BUY' && sym && price && qty) {
      buyCount++;
      const cur = buyCostBySymbol.get(sym) || { totalCost: 0, quantity: 0 };
      buyCostBySymbol.set(sym, {
        totalCost: cur.totalCost + price * qty,
        quantity: cur.quantity + qty,
      });
    } else if (t.type === 'SELL' && sym && price && qty) {
      sellCount++;
      const cur = buyCostBySymbol.get(sym);
      const avgBuy = cur && cur.quantity > 0 ? cur.totalCost / cur.quantity : 0;
      if (avgBuy > 0) {
        const tradePnl = (price - avgBuy) * qty;
        if (tradePnl >= 0) {
          profitableSells++;
          grossProfits += tradePnl;
        } else {
          lossSells++;
          grossLosses += Math.abs(tradePnl);
        }
      } else {
        if (realizedGainLoss > 0) {
          profitableSells++;
          grossProfits += Math.abs(realizedGainLoss);
        } else {
          lossSells++;
          grossLosses += Math.abs(realizedGainLoss);
        }
      }
    }
  }

  const winRate = sellCount > 0 ? roundMoney((profitableSells / sellCount) * 100) : null;
  const profitFactor = grossLosses > 0 ? roundMoney(grossProfits / grossLosses) : grossProfits > 0 ? 9.9 : null;
  const avgWinAmount = profitableSells > 0 ? roundMoney(grossProfits / profitableSells) : 0;
  const avgLossAmount = lossSells > 0 ? roundMoney(grossLosses / lossSells) : 0;
  const riskRewardRatio = avgLossAmount > 0 ? roundMoney(avgWinAmount / avgLossAmount) : avgWinAmount > 0 ? 9.9 : null;
  const expectancy = sellCount > 0 ? roundMoney((grossProfits - grossLosses) / sellCount) : 0;

  // 6. Cash vs Equity Allocation (Dry Powder)
  const safeCash = Math.max(0, cashBalance);
  const totalNetWorth = roundMoney(safeCash + currentValue);
  const cashPercent = totalNetWorth > 0 ? roundMoney((safeCash / totalNetWorth) * 100) : 0;
  const equityPercent = totalNetWorth > 0 ? roundMoney((currentValue / totalNetWorth) * 100) : 0;

  // 7. T+1 Liquidity Radar
  let saleableValue = 0;
  let lockedValue = 0;
  for (const h of holdings) {
    saleableValue = moneyAdd(saleableValue, h.saleable * h.valuationPrice);
    lockedValue = moneyAdd(lockedValue, h.locked * h.valuationPrice);
  }
  saleableValue = roundMoney(saleableValue);
  lockedValue = roundMoney(lockedValue);
  const saleablePercent = currentValue > 0 ? roundMoney((saleableValue / currentValue) * 100) : 0;
  const lockedPercent = currentValue > 0 ? roundMoney((lockedValue / currentValue) * 100) : 0;

  // 8. Defensive vs Cyclical Asset Allocation (Market Crash Protection)
  const DEFENSIVE_SECTORS = new Set([
    'Pharmaceuticals & Chemicals',
    'Telecommunication',
    'Bank',
    'Fuel & Power',
    'Food & Allied',
  ]);

  let defensiveValue = 0;
  for (const h of holdings) {
    if (h.sector && DEFENSIVE_SECTORS.has(h.sector)) {
      defensiveValue = moneyAdd(defensiveValue, h.marketValue);
    }
  }
  defensiveValue = roundMoney(defensiveValue);
  const cyclicalValue = roundMoney(Math.max(0, currentValue - defensiveValue));
  const defensivePercent = currentValue > 0 ? roundMoney((defensiveValue / currentValue) * 100) : 0;
  const cyclicalPercent = currentValue > 0 ? roundMoney(100 - defensivePercent) : 0;
  const balanceLabel: DefensiveAllocation['balanceLabel'] =
    defensivePercent >= 60 ? 'Defensive Anchor' : defensivePercent >= 35 ? 'Balanced Growth' : 'Aggressive Cyclical';

  // 9. Dividend & Passive Income Radar
  let weightedYieldSum = 0;
  let highYieldCount = 0;
  for (const h of holdings) {
    const baseYield = h.category === 'A' ? 5.6 : h.category === 'B' ? 3.2 : h.category === 'N' ? 2.0 : 0.0;
    const sectorBonus = (h.sector === 'Bank' || h.sector === 'Telecommunication' || h.sector === 'Fuel & Power') ? 1.5 : 0;
    const estYield = baseYield + sectorBonus;
    if (estYield >= 6.0) highYieldCount++;
    weightedYieldSum += estYield * h.marketValue;
  }
  const estimatedYield = currentValue > 0 ? roundMoney(weightedYieldSum / currentValue) : 0;
  const projectedAnnualCash = roundMoney(currentValue * (estimatedYield / 100));
  const dividendVerdict =
    estimatedYield >= 7.0
      ? 'High-Yield Dividend Cashflow (Outperforms typical Bank FDR)'
      : estimatedYield >= 4.0
      ? 'Balanced Yield + Capital Growth Potential'
      : 'Capital Growth Oriented (Low immediate dividend cashflow)';

  // 10. Multi-Factor Institutional Health Score (0 - 100)
  const sectorCount = sectorBreakdown.length;
  const diversificationScore = holdings.length === 0 ? 0 : Math.min(25, sectorCount >= 5 ? 25 : sectorCount * 5);
  const governanceScore = Math.max(0, Math.min(25, Math.round(25 * (aExposurePercent / 100) - (zExposurePercent * 1.5))));
  const cashScore = cashPercent >= 10 && cashPercent <= 40 ? 12.5 : cashPercent > 0 ? 8 : 4;
  const saleableScore = saleablePercent >= 60 ? 12.5 : (saleablePercent / 60) * 12.5;
  const liquidityScore = Math.round(cashScore + saleableScore);
  const topPct = topHolding?.percent || 0;
  const concentrationScore = topPct === 0 ? 0 : topPct <= 25 ? 25 : topPct <= 35 ? 20 : topPct <= 50 ? 12 : 5;

  const overallScore = Math.min(100, Math.max(0, diversificationScore + governanceScore + liquidityScore + concentrationScore));
  const healthGrade: HealthScore['grade'] =
    overallScore >= 85
      ? 'Institutional AAA'
      : overallScore >= 70
      ? 'Solid Prime'
      : overallScore >= 50
      ? 'Moderate Speculative'
      : 'High Risk Alert';

  let healthSummary = 'Healthy portfolio structure balanced across governance, liquidity, and diversification.';
  if (zExposurePercent >= 15) {
    healthSummary = `High speculative risk: ${zExposurePercent.toFixed(1)}% in Z-Category stocks. Rebalance into Category A bluechips.`;
  } else if (topPct > 40) {
    healthSummary = `High single-stock concentration: ${topHolding?.symbol} holds ${topPct.toFixed(0)}% of equity. Consider diversifying gains.`;
  } else if (sectorCount < 3 && holdings.length >= 2) {
    healthSummary = 'Low sector diversity. Adding non-correlated sectors (Pharma, Power, or Banking) will reduce downside volatility.';
  } else if (cashPercent < 5 && currentValue > 50000) {
    healthSummary = 'Minimal cash reserves. Keeping 10-20% dry powder allows buying prime stocks at a discount during DSE market dips.';
  }

  // 11. Best / Worst Movers Today
  let bestMoverToday: PortfolioInsights['bestMoverToday'] = null;
  let worstMoverToday: PortfolioInsights['worstMoverToday'] = null;
  for (const h of holdings) {
    if (!h.traded) continue;
    if (!bestMoverToday || h.dayPnl > bestMoverToday.dayPnl) bestMoverToday = { symbol: h.symbol, dayPnl: h.dayPnl };
    if (!worstMoverToday || h.dayPnl < worstMoverToday.dayPnl) worstMoverToday = { symbol: h.symbol, dayPnl: h.dayPnl };
  }
  if (bestMoverToday && worstMoverToday && bestMoverToday.symbol === worstMoverToday.symbol) {
    worstMoverToday = null;
  }

  return {
    totalPnl,
    realizedGainLoss: roundMoney(realizedGainLoss),
    topHolding,
    categoryBreakdown,
    sectorBreakdown,
    lifetimeCommission,
    bestMoverToday,
    worstMoverToday,
    healthScore: {
      overall: overallScore,
      grade: healthGrade,
      diversificationScore,
      governanceScore,
      liquidityScore,
      concentrationScore,
      summary: healthSummary,
    },
    dividendRadar: {
      estimatedYield,
      projectedAnnualCash,
      sanchayapatraComparison: {
        sanchayapatraRate: 11.04,
        verdict: dividendVerdict,
      },
      highYieldCount,
    },
    defensiveAllocation: {
      defensivePercent,
      cyclicalPercent,
      defensiveValue,
      cyclicalValue,
      balanceLabel,
    },
    allocation: {
      cash: safeCash,
      equity: currentValue,
      totalNetWorth,
      cashPercent,
      equityPercent,
    },
    categoryRisk: {
      zExposurePercent,
      zExposureValue,
      aExposurePercent,
      bExposurePercent,
      nExposurePercent,
      riskLevel,
    },
    tradingDiscipline: {
      totalTrades: trades.length,
      buyCount,
      sellCount,
      profitableSells,
      lossSells,
      winRate,
      feeDragPercent,
      profitFactor,
      avgWinAmount,
      avgLossAmount,
      riskRewardRatio,
      expectancy,
    },
    liquidityRadar: {
      saleableValue,
      lockedValue,
      saleablePercent,
      lockedPercent,
    },
    concentration: {
      top3Holdings,
      top3TotalPercent,
      riskAlert,
    },
  };
}

/** Advancers / decliners / unchanged across the whole board. */
export function getMarketBreadth(stocks: Stock[]) {
  let advancing = 0;
  let declining = 0;
  let unchanged = 0;
  let notTraded = 0;

  for (const s of stocks) {
    if (s.traded === false) {
      notTraded += 1;
    } else if (s.change > 0) {
      advancing += 1;
    } else if (s.change < 0) {
      declining += 1;
    } else {
      unchanged += 1;
    }
  }

  return { advancing, declining, unchanged, notTraded, total: stocks.length };
}

/** Total turnover across the board, in BDT. */
export function getTotalTurnover(stocks: Stock[]): number {
  return stocks.reduce((sum, s) => sum + (s.value || 0), 0);
}

export interface OrderEstimate {
  quantity: number;
  price: number;
  gross: number;
  commission: number;
  /** BUY: gross + commission. SELL: gross - commission. */
  net: number;
}

/**
 * Mirrors the commission math the server applies in
 * app/api/simulator/trade/route.ts so the order screen can preview the
 * exact figure the trade will settle at.
 */
export function estimateOrder(
  type: 'BUY' | 'SELL',
  quantity: number,
  price: number
): OrderEstimate {
  const gross = roundMoney(moneyMultiply(price, quantity));
  const commission = roundMoney(gross * COMMISSION_RATE);
  return {
    quantity,
    price,
    gross,
    commission,
    net: roundMoney(type === 'BUY' ? gross + commission : gross - commission),
  };
}
