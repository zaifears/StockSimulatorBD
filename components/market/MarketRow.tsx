'use client';

// components/market/MarketRow.tsx
// The mobile market-board card, patterned directly on the reference broker
// app: standalone card with spacious padding and soft grey resting zones.
// Left column has symbol + category, day high/low, turnover + volume, and trades.
// Right column has large LTP, solid change % pill, and net change.
// Bottom has comfortable Chart, Buy, and Sell action buttons.
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LineChart } from 'lucide-react';
import { getCompanyName } from '@/lib/dseCompanyNames';
import type { Stock, PortfolioItem } from '@/hooks/useSimulator';
import NotTradedInfo from '@/components/simulator/trade/NotTradedInfo';

const CATEGORY_TONE: Record<string, string> = {
  A: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
  B: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
  N: 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
  Z: 'text-rose-700 dark:text-rose-400 bg-rose-500/10',
};

const fmtPrice = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCompact = (n: number) => {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)}cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

interface Props {
  stock: Stock;
  portfolioItem?: PortfolioItem;
  marketOpen: boolean;
  onTrade: (symbol: string, type: 'buy' | 'sell') => void;
  onMarketClosedClick?: (symbol: string, type: 'buy' | 'sell') => void;
}

export default function MarketRow({
  stock,
  portfolioItem,
  marketOpen,
  onTrade,
  onMarketClosedClick,
}: Props) {
  const router = useRouter();
  const isTraded = stock.traded !== false;
  const isUp = stock.change > 0;
  const isDown = stock.change < 0;
  const companyName = getCompanyName(stock.symbol);
  const symbolHref = `/stocks/${stock.symbol.toLowerCase()}`;

  const handleNavigate = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ssbd_last_stock_source', '/trade');
      sessionStorage.setItem('ssbd_trade_scroll_state', JSON.stringify({
        scrollY: window.scrollY,
        symbol: stock.symbol.toLowerCase(),
        timestamp: Date.now(),
      }));
    }
    router.push(symbolHref);
  };

  return (
    <div
      id={`market-row-${stock.symbol.toLowerCase()}`}
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigate();
        }
      }}
      className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all cursor-pointer select-none"
    >
      {/* Top section: Left metrics & Right price/pill */}
      <div className="flex items-start justify-between gap-2">
        {/* Left Column: Symbol, Category, H/L, TK/V, TRD */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Symbol + Category + Held */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
              {stock.symbol}
            </span>
            {stock.category && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_TONE[stock.category] || 'text-gray-600 dark:text-gray-400 bg-gray-500/10'}`}
              >
                [{stock.category}]
              </span>
            )}
            {portfolioItem && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {portfolioItem.quantity} held
              </span>
            )}
          </div>

          {/* Row 2: High / Low */}
          <div className="text-xs font-mono mt-1 flex items-center gap-2">
            <span className="text-teal-600 dark:text-teal-400 font-semibold">
              H:{stock.high ? fmtPrice(stock.high) : '—'}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              L:{stock.low ? fmtPrice(stock.low) : '—'}
            </span>
          </div>

          {/* Row 3: Turnover & Volume */}
          <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2.5">
            <span>
              TK: {typeof stock.value === 'number' && stock.value > 0 ? fmtCompact(stock.value) : '—'}
            </span>
            <span>
              V: {typeof stock.volume === 'number' && stock.volume > 0 ? fmtCompact(stock.volume) : '—'}
            </span>
          </div>

          {/* Row 4: Trade count & optional company name preview */}
          <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
            <span>
              TRD: {typeof stock.trade === 'number' && stock.trade > 0 ? stock.trade.toLocaleString() : '—'}
            </span>
            {companyName && (
              <span className="text-[10px] font-sans text-gray-400 dark:text-gray-500 truncate max-w-[140px] sm:max-w-[200px]" title={companyName}>
                · {companyName}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: LTP, Pill Badge, Net Change */}
        <div className="text-right shrink-0 flex flex-col items-end">
          {/* Price (LTP) */}
          {isTraded ? (
            <div className="font-mono font-bold text-lg text-gray-900 dark:text-white tabular-nums">
              {fmtPrice(stock.ltp)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Not traded
              <NotTradedInfo lastClose={stock.ycp} />
            </div>
          )}

          {/* Change % Solid Pill Badge */}
          <div
            className={`min-w-[70px] text-center px-2 py-0.5 rounded-md font-mono font-bold text-xs text-white mt-1 tabular-nums ${
              !isTraded
                ? 'bg-gray-400 dark:bg-gray-600'
                : isUp
                  ? 'bg-teal-600 dark:bg-teal-500'
                  : isDown
                    ? 'bg-rose-600 dark:bg-rose-500'
                    : 'bg-gray-600 dark:bg-gray-600'
            }`}
          >
            {isTraded ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '0.00%'}
          </div>

          {/* Change Value in BDT */}
          {isTraded && (
            <div
              className={`font-mono text-xs font-semibold tabular-nums mt-0.5 ${
                isUp
                  ? 'text-teal-600 dark:text-teal-400'
                  : isDown
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {isUp ? '+' : ''}{stock.change.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Action Row: Chart, Buy, Sell */}
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80">
        <Link
          href={symbolHref}
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate();
          }}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95 transition-all shrink-0"
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Chart</span>
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!marketOpen) {
              if (onMarketClosedClick) {
                onMarketClosedClick(stock.symbol, 'buy');
              } else {
                onTrade(stock.symbol, 'buy');
              }
              return;
            }
            if (!isTraded) return;
            onTrade(stock.symbol, 'buy');
          }}
          disabled={marketOpen && !isTraded}
          title={!marketOpen ? 'Market is closed — click to set calendar alarm' : !isTraded ? 'Not traded today' : undefined}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs ${
            marketOpen
              ? isTraded
                ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 cursor-pointer'
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!marketOpen) {
              if (onMarketClosedClick) {
                onMarketClosedClick(stock.symbol, 'sell');
              } else {
                onTrade(stock.symbol, 'sell');
              }
              return;
            }
            if (!isTraded) return;
            onTrade(stock.symbol, 'sell');
          }}
          disabled={marketOpen && !isTraded}
          title={!marketOpen ? 'Market is closed — click to set calendar alarm' : !isTraded ? 'Not traded today' : undefined}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs ${
            marketOpen
              ? isTraded
                ? 'text-white bg-rose-600 hover:bg-rose-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 cursor-pointer'
          }`}
        >
          Sell
        </button>
      </div>
    </div>
  );
}
