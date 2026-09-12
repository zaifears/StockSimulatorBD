'use client';

// components/portfolio/PortfolioSummary.tsx
// The header card of the Portfolio screen: the four figures a trader checks
// first, then a gainers/losers bar across the bottom.
import React from 'react';
import type { PortfolioTotals } from '@/lib/utils/portfolio';

const fmt = (n: number, dp = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const signed = (n: number) => `${n >= 0 ? '+' : '−'}৳${fmt(Math.abs(n))}`;

export default function PortfolioSummary({ totals }: { totals: PortfolioTotals }) {
  const { currentValue, investment, unrealisedPnl, unrealisedPercent, dayPnl, gainers, losers } = totals;
  const positions = gainers + losers + totals.unchanged;
  // Zero-width flex children collapse, so an all-gainers bar would render as
  // an empty track. Fall back to a neutral full-width bar when nothing is
  // held, and let flex-grow handle the split otherwise.
  const hasPositions = positions > 0;

  return (
    <section className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800/80">
        <Cell label="Current Value" value={`৳${fmt(currentValue)}`} big />
        <Cell label="Total Investment" value={`৳${fmt(investment)}`} big align="right" />
        <Cell
          label="Unrealised P&L"
          value={signed(unrealisedPnl)}
          sub={`${unrealisedPercent >= 0 ? '+' : '−'}${Math.abs(unrealisedPercent).toFixed(2)}%`}
          tone={unrealisedPnl > 0 ? 'up' : unrealisedPnl < 0 ? 'down' : 'flat'}
        />
        <Cell
          label="Day P&L"
          value={signed(dayPnl)}
          tone={dayPnl > 0 ? 'up' : dayPnl < 0 ? 'down' : 'flat'}
          align="right"
        />
      </div>

      <div className="px-4 py-3.5 bg-white dark:bg-[#161B22] border-t border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center justify-between mb-2 text-xs font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">{gainers} Gainer{gainers === 1 ? '' : 's'}</span>
          <span className="text-rose-600 dark:text-rose-400">{losers} Loser{losers === 1 ? '' : 's'}</span>
        </div>
        <div
          className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800"
          role="img"
          aria-label={`${gainers} positions up, ${losers} down, ${totals.unchanged} unchanged`}
        >
          {hasPositions && (
            <>
              <span className="bg-emerald-500" style={{ flexGrow: gainers }} />
              <span className="bg-gray-300 dark:bg-gray-700" style={{ flexGrow: totals.unchanged }} />
              <span className="bg-rose-500" style={{ flexGrow: losers }} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  sub,
  tone = 'neutral',
  big = false,
  align = 'left',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down' | 'flat' | 'neutral';
  big?: boolean;
  align?: 'left' | 'right';
}) {
  const toneClass =
    tone === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'down'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-gray-900 dark:text-gray-100';

  return (
    <div className={`bg-white dark:bg-[#161B22] p-3.5 sm:p-4 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        {label}
      </div>
      <div
        className={`font-mono font-bold tabular-nums ${big ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'} ${toneClass}`}
      >
        {value}
      </div>
      {sub && <div className={`text-xs font-mono font-semibold mt-0.5 ${toneClass}`}>{sub}</div>}
    </div>
  );
}
