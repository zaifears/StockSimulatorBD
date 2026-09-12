import React from 'react';
import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { getCompanyName } from '@/lib/dseCompanyNames';
import type { Stock, PortfolioItem } from '@/hooks/useSimulator';
import NotTradedInfo from './NotTradedInfo';

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
  variant: 'market' | 'portfolio';
  onTrade: (symbol: string, type: 'buy' | 'sell') => void;
}

export default function StockCardMobile({ stock, portfolioItem, marketOpen, variant, onTrade }: Props) {
  const isUp = stock.change > 0;
  const isDown = stock.change < 0;
  const companyName = getCompanyName(stock.symbol);
  const isTraded = stock.traded !== false;
  const symbolHref = `/stocks/${stock.symbol.toLowerCase()}`;

  const handleStockClick = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ssbd_last_stock_source', '/trade');
      sessionStorage.setItem('ssbd_trade_scroll_state', JSON.stringify({
        scrollY: window.scrollY,
        symbol: stock.symbol.toLowerCase(),
        timestamp: Date.now(),
      }));
    }
  };

  if (variant === 'portfolio' && portfolioItem) {
    const avgCost = portfolioItem.averageBuyPrice;
    const valuationPrice = isTraded ? stock.ltp : (stock.ycp || stock.ltp);
    const currentValue = valuationPrice * portfolioItem.quantity;
    const investedValue = avgCost * portfolioItem.quantity;
    const pnl = currentValue - investedValue;
    const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
    const isPnlUp = pnl >= 0;

    return (
      <div className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-base text-gray-900 dark:text-gray-100">{stock.symbol}</span>
              {stock.category && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_TONE[stock.category] || 'bg-gray-500/10 text-gray-600'}`}>
                  [{stock.category}]
                </span>
              )}
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                {portfolioItem.quantity} shares
              </span>
            </div>
            {companyName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{companyName}</p>}
          </div>
          <div className="text-right shrink-0">
            {isTraded ? (
              <div className="font-mono font-bold text-base text-gray-900 dark:text-white">৳{fmtPrice(stock.ltp)}</div>
            ) : (
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
                Not traded
                <NotTradedInfo lastClose={stock.ycp} />
              </div>
            )}
            <div
              className={`min-w-[65px] text-center px-1.5 py-0.5 rounded text-white font-mono font-bold text-xs mt-1 ${
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
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 py-1.5 px-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Avg Cost</span>
            <div className="font-mono text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">৳{fmtPrice(avgCost)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">P&L</span>
            <div className={`font-mono text-xs sm:text-sm font-bold ${isPnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isPnlUp ? '+' : '−'}৳{fmtPrice(Math.abs(pnl))}
              <span className="text-[10px] font-medium ml-1">({isPnlUp ? '+' : '−'}{Math.abs(pnlPercent).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={symbolHref}
            onClick={handleStockClick}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Chart</span>
          </Link>
          <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen || !isTraded} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs">Buy</button>
          <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen || !isTraded} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs">Sell</button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`market-card-${stock.symbol.toLowerCase()}`}
      className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-base text-gray-900 dark:text-gray-100">{stock.symbol}</span>
            {stock.category && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_TONE[stock.category] || 'bg-gray-500/10 text-gray-600'}`}>
                [{stock.category}]
              </span>
            )}
          </div>
          {/* Day H/L */}
          <div className="text-xs font-mono mt-0.5 flex items-center gap-2">
            <span className="text-teal-600 dark:text-teal-400 font-semibold">
              H:{stock.high ? fmtPrice(stock.high) : '—'}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              L:{stock.low ? fmtPrice(stock.low) : '—'}
            </span>
          </div>
          {/* TK / V */}
          <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
            <span>TK: {typeof stock.value === 'number' && stock.value > 0 ? fmtCompact(stock.value) : '—'}</span>
            <span>V: {typeof stock.volume === 'number' && stock.volume > 0 ? fmtCompact(stock.volume) : '—'}</span>
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          {isTraded ? (
            <div className="font-mono font-bold text-lg text-gray-900 dark:text-white tabular-nums">৳{fmtPrice(stock.ltp)}</div>
          ) : (
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500">
              Not traded
              <NotTradedInfo lastClose={stock.ycp} />
            </div>
          )}
          <div
            className={`min-w-[65px] text-center px-1.5 py-0.5 rounded text-white font-mono font-bold text-xs mt-1 tabular-nums ${
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
          {isTraded && (
            <div className={`font-mono text-xs font-semibold tabular-nums mt-0.5 ${isUp ? 'text-teal-600 dark:text-teal-400' : isDown ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}`}>
              {isUp ? '+' : ''}{stock.change.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/80">
        <Link
          href={symbolHref}
          onClick={handleStockClick}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0"
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Chart</span>
        </Link>
        <button onClick={() => onTrade(stock.symbol, 'buy')} disabled={!marketOpen || !isTraded} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs">Buy</button>
        <button onClick={() => onTrade(stock.symbol, 'sell')} disabled={!marketOpen || !isTraded} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 transition-all shadow-xs">Sell</button>
      </div>
    </div>
  );
}