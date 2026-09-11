'use client';

// components/portfolio/PortfolioInsights.tsx
// Second-order figures that genuinely help someone learning to trade:
// lifetime result (realized + unrealized), concentration risk, today's
// biggest mover, and the real cost of activity (commission paid).
//
// Boss Feature Ready:
// If the user has an active Boss membership (or is in Boss preview mode),
// full insights, sector radar, and commission analytics render seamlessly.
// For Bro users, a sleek locked preview with value highlights and upgrade CTA is displayed.

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Building2,
  Landmark,
  TrendingUp,
  TrendingDown,
  Receipt,
  Lock,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import type { PortfolioInsights as Insights } from '@/lib/utils/portfolio';
import BossBadge from '@/components/ui/BossBadge';
import { useAuth } from '@/contexts/AuthContext';

const fmt = (n: number, dp = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const CATEGORY_COLOR: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-amber-500',
  N: 'bg-blue-500',
  Z: 'bg-rose-500',
  Other: 'bg-gray-400',
};

// Sector names come from lankabd.com (~21 possible values, not a fixed small
// set like category), so there's no single canonical color per name — cycle
// a fixed palette by rank order instead. "Other" (no sector data yet) always
// gets the same neutral gray regardless of rank.
const SECTOR_PALETTE = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
];

interface PortfolioInsightsProps {
  insights: Insights;
  isBoss?: boolean;
}

export default function PortfolioInsights({ insights, isBoss: isBossProp }: PortfolioInsightsProps) {
  const { isBoss: authIsBoss } = useAuth();
  const [demoUnlocked, setDemoUnlocked] = useState(false);

  // If explicit prop is given, use it; otherwise use auth status; or allow demo toggle
  const isUnlocked = isBossProp !== undefined ? isBossProp : (authIsBoss || demoUnlocked);

  const {
    totalPnl, realizedGainLoss, topHolding, categoryBreakdown, sectorBreakdown,
    lifetimeCommission, bestMoverToday, worstMoverToday,
  } = insights;

  // ─────────────────────────────────────────────
  // LOCKED BRO VIEW (WITH UPGRADE CTA & PREVIEW)
  // ─────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="space-y-4">
        {/* Boss Upgrade Pitch Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-500/15 dark:via-[#151B26] dark:to-[#111620] border-2 border-amber-400/60 dark:border-amber-500/40 p-5 sm:p-6 shadow-md">
          <BossBadge corner size="xs" />

          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                  Portfolio Insights & Risk Radar
                </h3>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Boss Exclusive Analytics for Serious DSE Traders
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Trade like a Boss. Unlock comprehensive portfolio intelligence to audit your true investment performance beyond daily paper fluctuations:
          </p>

          {/* Feature Highlight Pills */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Banked Realized P&L</div>
                <div className="text-[10px] text-gray-400">Separate paper from banked</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">21 DSE Sectors</div>
                <div className="text-[10px] text-gray-400">Industry exposure radar</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Concentration Radar</div>
                <div className="text-[10px] text-gray-400">40%+ single-stock alerts</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Lifetime Commission</div>
                <div className="text-[10px] text-gray-400">0.4% brokerage cost audit</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <Link
              href="/boss"
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 shadow-md hover:brightness-105 active:scale-98"
            >
              <span>Unlock Full Radar with Boss (৳20 / 31 Days)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setDemoUnlocked(true)}
              className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center gap-1.5"
              title="Preview how insights look"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Demo</span>
            </button>
          </div>
        </div>

        {/* Blurred Teaser Behind Frosted Layer */}
        <div className="relative rounded-2xl overflow-hidden filter blur-[2px] opacity-60 pointer-events-none select-none space-y-3">
          <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                <Landmark className="w-3 h-3" /> Realized P&L
              </div>
              <div className="font-mono font-bold text-base text-emerald-600">+৳12,450.00</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Banked from closed trades</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Lifetime Result
              </div>
              <div className="font-mono font-bold text-base text-emerald-600">+৳18,920.00</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Realized + unrealized</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Industry Exposure (21 Sectors)
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 mb-2">
              <span className="bg-blue-500 flex-1" />
              <span className="bg-emerald-500 flex-1" />
              <span className="bg-amber-500 flex-1" />
            </div>
            <div className="text-xs text-gray-400 font-mono">Pharmaceuticals 42% • Bank 35% • Fuel 23%</div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // UNLOCKED BOSS VIEW (FULL ACTIVE RADAR)
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Boss Active Header Strip */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2">
          <BossBadge size="xs" interactive={false} />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            Portfolio Insights Active
          </span>
        </div>
        {demoUnlocked && (
          <button
            type="button"
            onClick={() => setDemoUnlocked(false)}
            className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1"
          >
            <EyeOff className="w-3 h-3" /> Exit Demo
          </button>
        )}
      </div>

      {/* Realized vs Total — the number that separates paper gains from banked ones */}
      <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            <Landmark className="w-3 h-3" /> Realized P&L
          </div>
          <div className={`font-mono font-bold text-base tabular-nums ${realizedGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {realizedGainLoss >= 0 ? '+' : '−'}৳{fmt(Math.abs(realizedGainLoss))}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Banked from closed trades</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            Lifetime Result
          </div>
          <div className={`font-mono font-bold text-base tabular-nums ${totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalPnl >= 0 ? '+' : '−'}৳{fmt(Math.abs(totalPnl))}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Realized + unrealized</p>
        </div>
      </div>

      {/* Today's movers */}
      {(bestMoverToday || worstMoverToday) && (
        <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
            Today&apos;s Movers
          </div>
          <div className="flex gap-3">
            {bestMoverToday && (
              <Link
                href={`/stocks/${bestMoverToday.symbol.toLowerCase()}`}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{bestMoverToday.symbol}</div>
                  <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    +৳{fmt(Math.abs(bestMoverToday.dayPnl))}
                  </div>
                </div>
              </Link>
            )}
            {worstMoverToday && (
              <Link
                href={`/stocks/${worstMoverToday.symbol.toLowerCase()}`}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 transition-colors"
              >
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{worstMoverToday.symbol}</div>
                  <div className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                    −৳{fmt(Math.abs(worstMoverToday.dayPnl))}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Diversification — category breakdown + concentration flag */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
            <PieChart className="w-3 h-3" /> Diversification
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5">
            {categoryBreakdown.map((c) => (
              <span
                key={c.category}
                className={CATEGORY_COLOR[c.category] || CATEGORY_COLOR.Other}
                style={{ flexGrow: c.value }}
                title={`Category ${c.category}: ${c.percent.toFixed(1)}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
            {categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${CATEGORY_COLOR[c.category] || CATEGORY_COLOR.Other}`} />
                <span className="font-semibold text-gray-600 dark:text-gray-300">Cat {c.category}</span>
                <span className="font-mono text-gray-400 dark:text-gray-500">{c.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {topHolding && topHolding.percent >= 40 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1.5 mt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>{topHolding.symbol}</strong> alone is {topHolding.percent.toFixed(0)}% of your holdings — a single stock moving hard will move your whole portfolio with it.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Industry exposure — same shape as Diversification, grouped by
          sector instead of DSE market category */}
      {sectorBreakdown.length > 0 && (
        <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
            <Building2 className="w-3 h-3" /> Industry Sector Exposure (21 Sectors)
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5">
            {sectorBreakdown.map((s, i) => (
              <span
                key={s.sector}
                className={s.sector === 'Other' ? 'bg-gray-400' : SECTOR_PALETTE[i % SECTOR_PALETTE.length]}
                style={{ flexGrow: s.value }}
                title={`${s.sector}: ${s.percent.toFixed(1)}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {sectorBreakdown.map((s, i) => (
              <div key={s.sector} className="flex items-center gap-1.5 text-xs min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${s.sector === 'Other' ? 'bg-gray-400' : SECTOR_PALETTE[i % SECTOR_PALETTE.length]}`}
                />
                <span className="font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={s.sector}>
                  {s.sector}
                </span>
                <span className="font-mono text-gray-400 dark:text-gray-500 shrink-0">{s.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lifetime cost of activity */}
      {lifetimeCommission > 0 && (
        <div className="bg-white dark:bg-[#1A1F26] border sm:rounded-2xl border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Commission paid to date</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">0.4% per trade, buy and sell</div>
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">৳{fmt(lifetimeCommission)}</div>
        </div>
      )}
    </div>
  );
}
