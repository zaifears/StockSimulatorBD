'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface IndexItem {
  key: string;
  value: number;
  change: number;
  percent: number;
  prev?: number;
}

interface BreadthData {
  advanced: number;
  declined: number;
  unchanged: number;
  traded: number;
}

interface TotalsData {
  trades: number;
  volume: number;
  turnover: number;
  marketCap: number;
  tradeTime?: string;
}

interface MarketOverviewData {
  indices?: IndexItem[];
  breadth?: BreadthData;
  totals?: TotalsData;
  movers?: Record<string, any>;
  session?: {
    isOpen?: boolean;
    status?: string;
  };
}

interface Props {
  onSelectStock?: (symbol: string) => void;
}

export default function MarketOverviewBanner({ onSelectStock }: Props) {
  const [data, setData] = useState<MarketOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchOverview() {
      try {
        const res = await fetch('/api/market-overview');
        if (res.ok) {
          const json = await res.json();
          if (mounted) {
            setData(json);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Failed to load market overview:', err);
      }
    }

    fetchOverview();
    const interval = setInterval(fetchOverview, 30_000); // 30s auto-refresh
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const indices = data?.indices || [];
  const breadth = data?.breadth;
  const totals = data?.totals;

  const totalBreadth = useMemo(() => {
    if (!breadth) return 0;
    return (breadth.advanced || 0) + (breadth.declined || 0) + (breadth.unchanged || 0);
  }, [breadth]);

  const advPct = totalBreadth > 0 ? (((breadth?.advanced || 0) / totalBreadth) * 100).toFixed(1) : '0';
  const decPct = totalBreadth > 0 ? (((breadth?.declined || 0) / totalBreadth) * 100).toFixed(1) : '0';
  const uncPct = totalBreadth > 0 ? (((breadth?.unchanged || 0) / totalBreadth) * 100).toFixed(1) : '0';

  if (loading && !data) {
    return (
      <div className="pt-2 pb-3 px-3.5 sm:px-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 sm:h-20 rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-[#161B22] animate-pulse border border-gray-200/60 dark:border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (indices.length === 0 && !breadth) return null;

  return (
    <div className="pt-2 pb-4 px-3.5 sm:px-0 space-y-2.5 sm:space-y-3">
      {/* ── 1. Benchmark DSE Indices Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {indices.map((idx) => {
          const isUp = idx.change > 0;
          const isDown = idx.change < 0;
          const sign = isUp ? '+' : '';

          return (
            <div
              key={idx.key}
              className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                isUp
                  ? 'bg-gradient-to-br from-emerald-500/[0.04] to-transparent border-emerald-500/20 dark:border-emerald-500/15'
                  : isDown
                    ? 'bg-gradient-to-br from-rose-500/[0.04] to-transparent border-rose-500/20 dark:border-rose-500/15'
                    : 'bg-white dark:bg-[#161B22] border-gray-200/80 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-black tracking-wider text-gray-500 dark:text-gray-400 uppercase truncate">
                  {idx.key}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold font-mono tabular-nums shrink-0 ${
                    isUp
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isDown
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {isUp && <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  {isDown && <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  {sign}{idx.percent?.toFixed(2)}%
                </span>
              </div>

              <div className="mt-1 sm:mt-2 flex flex-col xs:flex-row xs:items-baseline justify-between gap-0.5">
                <span className="text-xs xs:text-sm sm:text-2xl font-black font-mono tabular-nums tracking-tight text-gray-900 dark:text-gray-100 truncate">
                  {idx.value?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-[10px] sm:text-xs font-bold font-mono tabular-nums shrink-0 ${
                    isUp
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isDown
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-500'
                  }`}
                >
                  {sign}{idx.change?.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 2. Market Breadth Bar & Liquidity Summary ──────────────────────── */}
      {breadth && (
        <div className="bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2 sm:pb-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Market Breadth
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-medium text-gray-400">
                ({breadth.traded || totalBreadth} issues active)
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono font-semibold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                ▲ {breadth.advanced} ({advPct}%)
              </span>
              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" />
                ■ {breadth.unchanged} ({uncPct}%)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500" />
                ▼ {breadth.declined} ({decPct}%)
              </span>
            </div>
          </div>

          {/* Segmented Breadth Bar */}
          <div className="w-full h-2 sm:h-2.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            <div
              style={{ width: `${advPct}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Advancing: ${breadth.advanced} (${advPct}%)`}
            />
            <div
              style={{ width: `${uncPct}%` }}
              className="bg-amber-400 dark:bg-amber-500 transition-all duration-500"
              title={`Unchanged: ${breadth.unchanged} (${uncPct}%)`}
            />
            <div
              style={{ width: `${decPct}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Declining: ${breadth.declined} (${decPct}%)`}
            />
          </div>

          {/* Totals Strip */}
          {totals && (
            <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 gap-y-1.5 gap-x-3">
              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
                <span>
                  Turnover:{' '}
                  <strong className="text-gray-900 dark:text-gray-100 font-mono font-bold">
                    ৳{totals.turnover?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Cr
                  </strong>
                </span>
                <span>
                  Volume:{' '}
                  <strong className="text-gray-900 dark:text-gray-100 font-mono font-bold">
                    {(totals.volume / 10_000_000).toFixed(2)} Cr
                  </strong>
                </span>
                <span className="hidden xs:inline sm:inline">
                  Trades:{' '}
                  <strong className="text-gray-900 dark:text-gray-100 font-mono font-bold">
                    {totals.trades?.toLocaleString()}
                  </strong>
                </span>
              </div>

              {totals.tradeTime && (
                <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono">
                  {totals.tradeTime}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
