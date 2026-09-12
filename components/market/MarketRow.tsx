'use client';

// components/market/MarketRow.tsx
// The mobile market-board row, patterned directly on the reference broker
// app: symbol + category on top, a second line of H/L, then a third line of
// turnover/volume/trade-count — all real fields api/market_sync.py already
// scrapes (see hooks/useSimulator.ts's Stock interface) that the old
// StockCardMobile never surfaced. Price and today's move sit on the right,
// with the move rendered as a solid pill the way DSE terminals do it rather
// than plain colored text, so a glance at the right edge of the list reads
// the whole day's direction.
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
}

export default function MarketRow({ stock, portfolioItem, marketOpen, onTrade }: Props) {
  const router = useRouter();
  const isTraded = stock.traded !== false;
  const isUp = stock.change >= 0;
  const companyName = getCompanyName(stock.symbol);
  const hasQuoteDetail = isTraded && (stock.high || stock.low || stock.value || stock.volume || stock.trade);
  const symbolHref = `/stocks/${stock.symbol.toLowerCase()}`;

  // Not a <Link> wrapping the whole row: it would nest <button> inside <a>,
  // which is invalid HTML and makes browsers reparent/close the anchor,
  // breaking both navigation and the Buy/Sell clicks. Instead the row
  // navigates via a click handler, and each button stops propagation so a
  // trade tap doesn't also open the chart.
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
      className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={symbolHref}
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate();
              }}
              className="font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {stock.symbol}
            </Link>
            {stock.category && (
              <span
                className={`text-[10px] font-bold px-1 py-px rounded ${CATEGORY_TONE[stock.category] || 'text-gray-600 dark:text-gray-400 bg-gray-500/10'}`}
              >
                {stock.category}
              </span>
            )}
            {portfolioItem && (
              <span className="text-[10px] font-bold px-1 py-px rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {portfolioItem.quantity} held
              </span>
            )}
          </div>

          {companyName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{companyName}</p>
          )}

          {hasQuoteDetail && (
            <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {(stock.high || stock.low) && (
                <span>
                  <span className="text-emerald-600/70 dark:text-emerald-400/60">H:{fmtPrice(stock.high || 0)}</span>
                  {' '}
                  <span className="text-rose-600/70 dark:text-rose-400/60">L:{fmtPrice(stock.low || 0)}</span>
                </span>
              )}
              {typeof stock.value === 'number' && stock.value > 0 && <span>TK:{fmtCompact(stock.value)}</span>}
              {typeof stock.volume === 'number' && stock.volume > 0 && <span>V:{fmtCompact(stock.volume)}</span>}
              {typeof stock.trade === 'number' && stock.trade > 0 && <span>TRD:{stock.trade.toLocaleString()}</span>}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          {isTraded ? (
            <div className="font-mono font-bold text-base text-gray-900 dark:text-white tabular-nums">
              {fmtPrice(stock.ltp)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Not traded
              <NotTradedInfo lastClose={stock.ycp} />
            </div>
          )}
          <div
            className={`inline-flex flex-col items-end mt-1 px-1.5 py-0.5 rounded text-white ${
              !isTraded ? 'bg-gray-400 dark:bg-gray-600' : isUp ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            <span className="text-xs font-mono font-bold tabular-nums leading-none">
              {isTraded ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '—'}
            </span>
            {isTraded && (
              <span className="text-[10px] font-mono opacity-90 leading-none mt-0.5">
                {isUp ? '+' : ''}{stock.change.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(stock.symbol, 'buy');
          }}
          disabled={!marketOpen || !isTraded}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 active:scale-95 transition-all"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(stock.symbol, 'sell');
          }}
          disabled={!marketOpen || !isTraded}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 active:scale-95 transition-all"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
