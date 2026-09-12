'use client';

// components/portfolio/HoldingRow.tsx
// One position, laid out the way a broker holdings list is: identity and the
// settlement-relevant quantities on the left, live price and today's move on
// the right, cost basis and P&L underneath.
//
// SALEABLE is a first-class figure here rather than something the user
// discovers when the server rejects a sell. It is the T+1 eligible quantity
// (see lib/utils/portfolio.ts), and the row says plainly how many shares are
// locked and why.
import React from 'react';
import Link from 'next/link';
import { Lock, LineChart } from 'lucide-react';
import { getCompanyName } from '@/lib/dseCompanyNames';
import NotTradedInfo from '@/components/simulator/trade/NotTradedInfo';
import type { HoldingMetrics } from '@/lib/utils/portfolio';

const fmt = (n: number, dp = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const CATEGORY_TONE: Record<string, string> = {
  A: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
  B: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
  N: 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
  Z: 'text-rose-700 dark:text-rose-400 bg-rose-500/10',
};

interface Props {
  holding: HoldingMetrics;
  marketOpen: boolean;
  onTrade: (symbol: string, type: 'buy' | 'sell') => void;
  lastClose?: number;
}

export default function HoldingRow({ holding, marketOpen, onTrade, lastClose }: Props) {
  const {
    symbol, quantity, saleable, locked, avgCost, cost,
    ltp, marketValue, pnl, pnlPercent, dayPnl, dayChangePercent, traded, category, sector,
  } = holding;

  const companyName = getCompanyName(symbol);
  const pnlUp = pnl >= 0;
  const dayUp = dayChangePercent >= 0;
  const canSell = marketOpen && traded && saleable > 0;

  const sellBlockedReason = !marketOpen
    ? 'Market is closed'
    : !traded
      ? 'This stock has not traded today'
      : saleable === 0
        ? 'All shares were bought today and are locked until tomorrow (T+1)'
        : undefined;

  const handleStockClick = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('ssbd_last_stock_source', '/portfolio');
    sessionStorage.setItem(
      'ssbd_portfolio_scroll_state',
      JSON.stringify({
        scrollY: window.scrollY,
        symbol: symbol.toLowerCase(),
        timestamp: Date.now(),
      })
    );
  };

  return (
    <article
      id={`portfolio-holding-${symbol.toLowerCase()}`}
      className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all"
    >
      {/* Top Header: Symbol, Category, Chart icon, Price & Day Change Pill */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/stocks/${symbol.toLowerCase()}`}
              onClick={handleStockClick}
              className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {symbol}
            </Link>
            {category && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_TONE[category] || 'text-gray-600 dark:text-gray-400 bg-gray-500/10'}`}
              >
                [{category}]
              </span>
            )}
            <Link
              href={`/stocks/${symbol.toLowerCase()}`}
              onClick={handleStockClick}
              aria-label={`View ${symbol} chart`}
              title="View chart"
              className="flex items-center justify-center w-5 h-5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors shrink-0"
            >
              <LineChart className="w-3 h-3" />
            </Link>
          </div>
          {(companyName || sector) && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {companyName}
              {companyName && sector && <span className="text-gray-300 dark:text-gray-600"> · </span>}
              {sector}
            </p>
          )}
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          {traded ? (
            <div className="font-mono font-bold text-lg text-gray-900 dark:text-white tabular-nums">
              ৳{fmt(ltp)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Not traded
              <NotTradedInfo lastClose={lastClose} />
            </div>
          )}
          <div
            className={`min-w-[65px] text-center px-1.5 py-0.5 rounded text-white font-mono font-bold text-xs mt-1 tabular-nums ${
              !traded
                ? 'bg-gray-400 dark:bg-gray-600'
                : dayUp
                  ? 'bg-teal-600 dark:bg-teal-500'
                  : 'bg-rose-600 dark:bg-rose-500'
            }`}
          >
            {traded ? `${dayUp ? '+' : '−'}${Math.abs(dayChangePercent).toFixed(2)}%` : '0.00%'}
          </div>
        </div>
      </div>

      {/* The broker figure grid: cost basis, valuation, and settlement state */}
      <dl className="grid grid-cols-3 gap-x-2.5 gap-y-2 text-xs py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800/80 mb-3">
        <Figure label="Qty" value={String(quantity)} />
        <Figure label="Avg Cost" value={`৳${fmt(avgCost)}`} />
        <Figure label="Cost Basis" value={`৳${fmt(cost)}`} />
        <Figure
          label="Saleable"
          value={String(saleable)}
          hint={locked > 0 ? `${locked} locked until tomorrow (T+1)` : undefined}
          warn={locked > 0}
        />
        <Figure label="Mkt Val" value={`৳${fmt(marketValue)}`} />
        <Figure
          label="Day P&L"
          value={`${dayPnl >= 0 ? '+' : '−'}৳${fmt(Math.abs(dayPnl))}`}
          tone={dayPnl > 0 ? 'up' : dayPnl < 0 ? 'down' : 'flat'}
        />
      </dl>

      {/* P&L Bar + Buy/Sell Actions */}
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 flex items-baseline gap-1.5 px-3 py-2 rounded-xl ${
            pnlUp ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            P&L
          </span>
          <span
            className={`font-mono font-bold text-sm tabular-nums ${
              pnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {pnlUp ? '+' : '−'}৳{fmt(Math.abs(pnl))}
          </span>
          <span
            className={`font-mono text-xs font-semibold ${
              pnlUp ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'
            }`}
          >
            ({pnlUp ? '+' : '−'}{Math.abs(pnlPercent).toFixed(1)}%)
          </span>
        </div>

        <button
          type="button"
          onClick={() => onTrade(symbol, 'buy')}
          disabled={!marketOpen || !traded}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => onTrade(symbol, 'sell')}
          disabled={!canSell}
          title={sellBlockedReason}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs"
        >
          Sell
        </button>
      </div>
    </article>
  );
}

function Figure({
  label,
  value,
  hint,
  warn = false,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
  tone?: 'up' | 'down' | 'flat' | 'neutral';
}) {
  const toneClass =
    tone === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'down'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-800 dark:text-gray-200';

  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className={`font-mono font-semibold tabular-nums ${toneClass}`}>
        <span className={warn ? 'text-amber-600 dark:text-amber-400' : undefined}>{value}</span>
        {hint && (
          <span
            className="inline-flex items-center gap-0.5 ml-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 align-middle"
            title={hint}
          >
            <Lock className="w-2.5 h-2.5" />
          </span>
        )}
      </dd>
    </div>
  );
}
