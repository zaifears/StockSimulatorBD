'use client';

// components/portfolio/PortfolioInsights.tsx
// Institutional-grade portfolio analytics for serious DSE traders:
// 1. Banked Realized P&L vs Paper Gains
// 2. Trader Batting Average & Win Rate (Closed trades discipline)
// 3. DSE Governance & Z-Category Speculation Radar
// 4. 21 DSE Industry Sector Distribution (LankaBangla taxonomy)
// 5. Dry Powder & Cash Deployment Ratio
// 6. Lifetime Brokerage Fee Drag (0.4% transaction cost erosion audit)
// 7. T+1 Immediate Liquidity & Overnight Lockup Radar
// 8. Single-Stock & Top 3 Concentration Risk
//
// Security & DOM Isolation:
// When !isBoss, real user analytics are strictly null and NEVER computed or rendered.
// The Bro-tier view renders readable, enticing headings with static promotional mockups
// behind a frosted overlay. Removing blur via DevTools reveals only static demo data.

import React from 'react';
import Link from 'next/link';
import {
  PieChart,
  Building2,
  Landmark,
  TrendingUp,
  TrendingDown,
  Receipt,
  Lock,
  ArrowRight,
  AlertTriangle,
  Target,
  Scale,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Clock,
  Sparkles,
  Coins,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import type { PortfolioInsights as Insights } from '@/lib/utils/portfolio';
import BossBadge from '@/components/ui/BossBadge';

const fmt = (n: number, dp = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const CATEGORY_COLOR: Record<string, string> = {
  A: 'bg-emerald-500',
  B: 'bg-amber-500',
  N: 'bg-blue-500',
  Z: 'bg-rose-500',
  Other: 'bg-gray-400',
};

const SECTOR_PALETTE = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
];

interface PortfolioInsightsProps {
  insights: Insights | null;
  isBoss?: boolean;
}

export default function PortfolioInsights({ insights, isBoss: isUnlocked = false }: PortfolioInsightsProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔒 LOCKED BRO VIEW: READABLE HEADINGS + PROMOTIONAL FROSTED TEASERS
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isUnlocked || !insights) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Boss Upgrade Pitch Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-500/15 dark:via-[#151B26] dark:to-[#111620] border-2 border-amber-400/60 dark:border-amber-500/40 p-5 sm:p-6 shadow-md">
          <BossBadge corner size="xs" />

          <div className="flex items-center gap-2.5 mb-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white">
                Portfolio Insights & Risk Radar
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Institutional DSE Portfolio Intelligence for Serious Traders
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Audit your true trading edge like a Dhaka Stock Exchange broker. Uncover your trading win rate, speculative Z-category risk, dry powder cash ratio, and 0.4% brokerage fee leakage:
          </p>

          {/* Quick Value Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Banked P&L</div>
                <div className="text-[10px] text-gray-400 truncate">Closed trade cash</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Win Rate %</div>
                <div className="text-[10px] text-gray-400 truncate">Trader batting avg</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Z-Stock Radar</div>
                <div className="text-[10px] text-gray-400 truncate">Junk stock audit</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-500 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">Fee Drag</div>
                <div className="text-[10px] text-gray-400 truncate">0.4% commission</div>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <Link
            href="/boss"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-extrabold text-xs sm:text-sm transition-all bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 shadow-md hover:brightness-105 active:scale-95"
          >
            <span>Unlock Full Radar with Boss (৳20 / Month)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* WHAT YOU'RE MISSING: READABLE HEADINGS + FROSTED DEMO CARDS  */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                  What You&apos;re Missing
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Locked for Bro Tier
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Here are the 12 broker-grade portfolio analytics Boss Tier unlocks for your account:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Banked Realized P&L vs Paper Gains */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      1. Banked Realized P&L vs Paper Gains
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Separates real closed cash profits from unrealized paper fluctuations
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Realized P&L</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">+৳18,450.00</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Lifetime Result</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">+৳29,120.00</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Realized P&L
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trader Batting Average & Win Rate */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      2. Trader Batting Average & Win Rate
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Audit your closed-trade accuracy, win/loss ratio, and profitable exit rate
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Batting Average</div>
                    <div className="font-mono font-bold text-sm text-blue-600">68% Win Rate</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Trade Record</div>
                    <div className="font-mono text-xs text-gray-400">17 Wins • 8 Losses</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Win Rate
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DSE Governance & Z-Category Speculation Radar */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      3. DSE Governance & Z-Stock Speculation Radar
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Detects capital trapped in non-compliant Z-Category defaulter stocks
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span>Cat A: 84%</span>
                    <span>Cat B: 12%</span>
                    <span className="text-rose-500">Cat Z: 4%</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <span className="bg-emerald-500 w-[84%]" />
                    <span className="bg-amber-500 w-[12%]" />
                    <span className="bg-rose-500 w-[4%]" />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Audit Z-Category Risk
                  </span>
                </div>
              </div>
            </div>

            {/* 4. 21 DSE Industry Sector Radar */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      4. 21 DSE Industry Sector Distribution
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Multi-sector diversification breakdown mapped to LankaBangla industry sectors
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 space-y-1.5">
                  <div className="text-[10px] font-mono text-gray-400">
                    Pharma 45% • Bank 28% • Fuel & Power 15%
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <span className="bg-blue-500 w-[45%]" />
                    <span className="bg-emerald-500 w-[28%]" />
                    <span className="bg-amber-500 w-[15%]" />
                    <span className="bg-purple-500 w-[12%]" />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Sector Radar
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Dry Powder & Cash Deployment Ratio */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      5. Dry Powder & Cash Deployment Ratio
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Measures idle liquid buying power vs total committed equity capital
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Equity Ratio</div>
                    <div className="font-mono font-bold text-sm text-blue-600">76% Equities</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Dry Powder</div>
                    <div className="font-mono font-bold text-sm text-amber-600">24% Liquid Cash</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Cash Ratio
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Lifetime Brokerage Fee Drag */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      6. Lifetime Brokerage Fee Drag Audit
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Calculates the exact drag of 0.4% DSE transaction commissions on gross profit
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Commission Paid</div>
                    <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">৳3,820.00</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Fee Drag</div>
                    <div className="font-mono font-bold text-sm text-rose-500">8.4% of Profits</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Audit Fee Drag
                  </span>
                </div>
              </div>
            </div>

            {/* 7. T+1 Immediate Liquidity Radar */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      7. T+1 Immediate Liquidity & Lockup Radar
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Capital ready to sell right now vs shares locked in overnight DSE clearing
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Saleable Today</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">৳142,500 (72%)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">T+1 Locked</div>
                    <div className="font-mono font-bold text-sm text-amber-600">৳55,200 (28%)</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal T+1 Liquidity
                  </span>
                </div>
              </div>
            </div>

            {/* 8. Single-Stock & Top 3 Concentration Risk */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      8. Concentration Risk & Top 3 Holdings
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Early warning trigger when a single holding or top 3 stocks dominate your capital
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Top 3 Holdings</div>
                    <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">58% of Portfolio</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Concentration Risk</div>
                    <div className="font-mono text-xs font-bold text-emerald-600">Balanced</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Audit Concentration
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Institutional Health Score & Portfolio Diagnosis */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      9. Institutional Health Rating (0–100)
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Multi-factor portfolio grade across governance, diversity & liquidity
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Health Score</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">88/100 · Prime</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Diagnosis</div>
                    <div className="font-mono text-xs font-bold text-sky-600">Balanced Structure</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Health Score
                  </span>
                </div>
              </div>
            </div>

            {/* 10. Dividend & Passive Income Radar */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      10. Dividend Yield & Passive Income Radar
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Annual cashflow projection vs 11.04% Sanchayapatra benchmark
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Estimated Yield</div>
                    <div className="font-mono font-bold text-sm text-emerald-600">5.8% / year</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Projected Cash</div>
                    <div className="font-mono text-xs font-bold text-emerald-600">৳24,500 / yr</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Dividend Radar
                  </span>
                </div>
              </div>
            </div>

            {/* 11. Crash Protection & Defensive Cyclical Balance */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      11. Crash Protection & Defensive Balance
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Defensive shields (Pharma/Power/Bank) vs Cyclical high-beta stocks
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Defensive Shield</div>
                    <div className="font-mono font-bold text-sm text-sky-600">68% Allocation</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Downside Buffer</div>
                    <div className="font-mono text-xs font-bold text-sky-600">High Protection</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Crash Radar
                  </span>
                </div>
              </div>
            </div>

            {/* 12. Profit Factor & Trade Expectancy Audit */}
            <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      12. Profit Factor & Trade Expectancy
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Audit whether you cut losses fast and let winners run
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Boss Pro
                </span>
              </div>

              {/* Static Frosted Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-50 dark:bg-[#121720] border border-dashed border-gray-200 dark:border-gray-800 p-3 select-none pointer-events-none">
                <div className="filter blur-sm opacity-40 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400">Profit Factor</div>
                    <div className="font-mono font-bold text-sm text-purple-600">2.6x Edge</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400">Expectancy</div>
                    <div className="font-mono text-xs font-bold text-purple-600">+৳1,450 / trade</div>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 dark:bg-black/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-[#1A2230]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Upgrade to Reveal Profit Factor
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 👑 ACTIVE BOSS VIEW: FULL 8-MODULE INSTITUTIONAL RADAR DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  const {
    totalPnl,
    realizedGainLoss,
    topHolding,
    categoryBreakdown,
    sectorBreakdown,
    lifetimeCommission,
    bestMoverToday,
    worstMoverToday,
    healthScore,
    dividendRadar,
    defensiveAllocation,
    allocation,
    categoryRisk,
    tradingDiscipline,
    liquidityRadar,
    concentration,
  } = insights;

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Boss Active Header Strip */}
      <div className="flex items-center justify-between px-1 py-0.5">
        <div className="flex items-center gap-2">
          <BossBadge size="xs" interactive={false} />
          <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
            Institutional Risk Radar Active
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
          12 Broker Analytics Live
        </span>
      </div>

      {/* Institutional Health Score Hero Banner */}
      <div className="rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-white to-amber-500/[0.04] dark:from-amber-500/[0.12] dark:via-[#161D27] dark:to-[#111620] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/50 dark:border-amber-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black font-mono text-lg shrink-0">
              {healthScore.overall}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                  Institutional Health Rating
                </h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  healthScore.overall >= 85
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : healthScore.overall >= 70
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                    : healthScore.overall >= 50
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}>
                  {healthScore.grade}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {healthScore.summary}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <BossBadge size="xs" interactive={false} />
          </div>
        </div>

        {/* 4 Factor Sub-scores Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-gray-200/60 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Governance</span>
            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{healthScore.governanceScore}/25</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-gray-200/60 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Diversity</span>
            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{healthScore.diversificationScore}/25</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-gray-200/60 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Liquidity & Cash</span>
            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{healthScore.liquidityScore}/25</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-gray-200/60 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Concentration</span>
            <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{healthScore.concentrationScore}/25</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 1. Banked Realized P&L vs Lifetime Wealth Result */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Banked Realized P&L
              </h4>
              <p className="text-[10px] text-gray-400">Cash locked from completed sales</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                Banked Realized
              </div>
              <div className={`font-mono font-bold text-base tabular-nums ${realizedGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {realizedGainLoss >= 0 ? '+' : '−'}৳{fmt(Math.abs(realizedGainLoss))}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Closed trade cash</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                Lifetime Wealth Result
              </div>
              <div className={`font-mono font-bold text-base tabular-nums ${totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : '−'}৳{fmt(Math.abs(totalPnl))}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Realized + unrealized</p>
            </div>
          </div>
        </div>

        {/* 2. Trader Batting Average & Win Rate */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Trader Batting Average
                </h4>
                <p className="text-[10px] text-gray-400">Closed position accuracy</p>
              </div>
            </div>
            {tradingDiscipline.winRate !== null && (
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                tradingDiscipline.winRate >= 50
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {tradingDiscipline.winRate}% Win Rate
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Winning Sells</div>
              <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {tradingDiscipline.profitableSells} Trades
              </div>
              <p className="text-[10px] text-gray-400">Avg +৳{fmt(tradingDiscipline.avgWinAmount, 0)}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Losing Sells</div>
              <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                {tradingDiscipline.lossSells} Trades
              </div>
              <p className="text-[10px] text-gray-400">Avg −৳{fmt(tradingDiscipline.avgLossAmount, 0)}</p>
            </div>
          </div>

          {tradingDiscipline.sellCount > 0 ? (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-gray-400">Profit Factor:</span>
                <span className={`font-mono font-bold ${
                  tradingDiscipline.profitFactor && tradingDiscipline.profitFactor >= 1.5
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {tradingDiscipline.profitFactor ? `${tradingDiscipline.profitFactor}x` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-right">
                <span className="text-[10px] font-bold uppercase text-gray-400">Expectancy:</span>
                <span className={`font-mono font-bold ${
                  tradingDiscipline.expectancy >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {tradingDiscipline.expectancy >= 0 ? '+' : ''}৳{fmt(tradingDiscipline.expectancy, 0)}/tr
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg p-2 text-center">
              No closed positions yet — your win rate & profit factor will appear after your first sell order.
            </p>
          )}
        </div>

        {/* 3. DSE Governance & Z-Category Speculation Radar */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                {categoryRisk.riskLevel === 'Prime' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Governance Quality Radar
                </h4>
                <p className="text-[10px] text-gray-400">DSE Categories (A/B/N/Z)</p>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              categoryRisk.riskLevel === 'Prime'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : categoryRisk.riskLevel === 'Moderate'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {categoryRisk.riskLevel === 'Prime'
                ? 'Prime Quality'
                : categoryRisk.riskLevel === 'Moderate'
                ? 'Caution (Z-Stocks)'
                : 'High Speculation'}
            </span>
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
            {categoryBreakdown.map((c) => (
              <span
                key={c.category}
                className={CATEGORY_COLOR[c.category] || CATEGORY_COLOR.Other}
                style={{ flexGrow: c.value }}
                title={`Category ${c.category}: ${c.percent.toFixed(1)}%`}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${CATEGORY_COLOR[c.category] || CATEGORY_COLOR.Other}`} />
                <span className="font-semibold text-gray-700 dark:text-gray-300">Cat {c.category}:</span>
                <span className="font-mono text-gray-400">{c.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {categoryRisk.zExposurePercent >= 15 && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-lg p-2 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>Warning:</strong> {categoryRisk.zExposurePercent.toFixed(1)}% of your portfolio is in speculative Z-Category stocks.
              </span>
            </p>
          )}
        </div>

        {/* 4. 21 DSE Industry Sector Distribution */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Industry Sector Exposure
              </h4>
              <p className="text-[10px] text-gray-400">21 LankaBangla DSE sectors</p>
            </div>
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

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {sectorBreakdown.slice(0, 5).map((s, i) => (
              <div key={s.sector} className="flex items-center gap-1 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${s.sector === 'Other' ? 'bg-gray-400' : SECTOR_PALETTE[i % SECTOR_PALETTE.length]}`}
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[130px]" title={s.sector}>
                  {s.sector}
                </span>
                <span className="font-mono text-gray-400">{s.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Dry Powder & Cash Deployment Ratio */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Dry Powder & Cash Ratio
              </h4>
              <p className="text-[10px] text-gray-400">Liquid balance vs invested equity</p>
            </div>
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5">
            <span className="bg-blue-600" style={{ width: `${allocation.equityPercent}%` }} />
            <span className="bg-amber-500" style={{ width: `${allocation.cashPercent}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Invested Equity</span>
              </div>
              <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                {allocation.equityPercent.toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-400 font-mono">৳{fmt(allocation.equity)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Dry Powder (Cash)</span>
              </div>
              <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                {allocation.cashPercent.toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-400 font-mono">৳{fmt(allocation.cash)}</p>
            </div>
          </div>
        </div>

        {/* 6. Lifetime Brokerage Fee Drag */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Brokerage Fee Drag Audit
              </h4>
              <p className="text-[10px] text-gray-400">0.4% per trade cost erosion</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-[10px] font-bold text-gray-400">Total Commissions</div>
              <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                ৳{fmt(lifetimeCommission)}
              </div>
              <p className="text-[10px] text-gray-400">{tradingDiscipline.totalTrades} total trades</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400">Fee Drag On Gains</div>
              <div className="font-mono font-bold text-sm text-rose-500">
                {tradingDiscipline.feeDragPercent > 0 ? `${tradingDiscipline.feeDragPercent}%` : '0%'}
              </div>
              <p className="text-[10px] text-gray-400">Consumes trading alpha</p>
            </div>
          </div>
        </div>

        {/* 7. T+1 Immediate Liquidity & Overnight Clearing Radar */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                T+1 Liquidity Radar
              </h4>
              <p className="text-[10px] text-gray-400">Immediate saleable cash capacity</p>
            </div>
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5">
            <span className="bg-emerald-500" style={{ width: `${liquidityRadar.saleablePercent}%` }} />
            <span className="bg-amber-500" style={{ width: `${liquidityRadar.lockedPercent}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Ready to Sell Today</span>
              </div>
              <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                ৳{fmt(liquidityRadar.saleableValue)}
              </div>
              <p className="text-[10px] text-gray-400">{liquidityRadar.saleablePercent.toFixed(0)}% cleared</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Locked in T+1</span>
              </div>
              <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                ৳{fmt(liquidityRadar.lockedValue)}
              </div>
              <p className="text-[10px] text-gray-400">{liquidityRadar.lockedPercent.toFixed(0)}% locked</p>
            </div>
          </div>
        </div>

        {/* 8. Single-Stock & Top 3 Concentration Risk */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                Concentration Risk Radar
              </h4>
              <p className="text-[10px] text-gray-400">Top 3 holdings exposure</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mb-2">
            <div>
              <div className="text-[10px] font-bold text-gray-400">Top 3 Holdings</div>
              <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                {concentration.top3TotalPercent.toFixed(1)}% of Portfolio
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400">Biggest Holding</div>
              <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                {topHolding ? `${topHolding.symbol} (${topHolding.percent.toFixed(1)}%)` : 'None'}
              </div>
            </div>
          </div>

          {concentration.riskAlert ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{concentration.riskAlert}</span>
            </p>
          ) : (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Healthy diversification: Capital is well balanced across holdings.</span>
            </p>
          )}
        </div>

        {/* 9. Dividend & Passive Income Radar */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Dividend Yield & Passive Income Radar
                </h4>
                <p className="text-[10px] text-gray-400">Cashflow projection vs 11.04% Sanchayapatra</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              dividendRadar.estimatedYield >= 6.0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : dividendRadar.estimatedYield >= 3.5
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {dividendRadar.estimatedYield >= 6.0 ? 'High Yield' : dividendRadar.estimatedYield >= 3.5 ? 'Moderate Yield' : 'Growth Focus'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-[10px] font-bold text-gray-400">Weighted Div Yield</div>
              <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {dividendRadar.estimatedYield.toFixed(1)}% / yr
              </div>
              <p className="text-[10px] text-gray-400">{dividendRadar.highYieldCount} high-yield scrips (≥6%)</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400">Projected Annual Cash</div>
              <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                ৳{fmt(dividendRadar.projectedAnnualCash)}
              </div>
              <p className="text-[10px] text-gray-400">Est. cash dividend stream</p>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-[#121720] border border-gray-100 dark:border-gray-800/80 text-[11px] text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">vs 5Y Sanchayapatra (11.04%):</span>
              <span className="font-mono text-gray-500 dark:text-gray-400">
                {dividendRadar.estimatedYield >= 11.04 ? 'Surpasses Risk-Free' : `${(11.04 - dividendRadar.estimatedYield).toFixed(1)}% spread + capital upside`}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
              {dividendRadar.sanchayapatraComparison.verdict}
            </p>
          </div>
        </div>

        {/* 10. Crash Protection & Defensive Cyclical Balance */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Crash Protection & Defensive Balance
                </h4>
                <p className="text-[10px] text-gray-400">Defensive shields vs Cyclical high-beta scrips</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              defensiveAllocation.balanceLabel === 'Defensive Anchor'
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : defensiveAllocation.balanceLabel === 'Balanced Growth'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {defensiveAllocation.balanceLabel}
            </span>
          </div>

          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2.5">
            <span className="bg-sky-500" style={{ width: `${defensiveAllocation.defensivePercent}%` }} />
            <span className="bg-orange-500" style={{ width: `${defensiveAllocation.cyclicalPercent}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Defensive Shield</span>
              </div>
              <div className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
                {defensiveAllocation.defensivePercent.toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-400 font-mono">৳{fmt(defensiveAllocation.defensiveValue)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Cyclical / High-Beta</span>
              </div>
              <div className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400">
                {defensiveAllocation.cyclicalPercent.toFixed(1)}%
              </div>
              <p className="text-[10px] text-gray-400 font-mono">৳{fmt(defensiveAllocation.cyclicalValue)}</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-2.5 bg-gray-50 dark:bg-[#121720] border border-gray-100 dark:border-gray-800/80 rounded-lg p-2">
            Defensive: Pharma, Power, Bank, Telecom, Food. Cyclicals: Engineering, Textiles, Tannery, IT, Ceramics.
          </p>
        </div>
      </div>

      {/* Today's Movers Strip */}
      {(bestMoverToday || worstMoverToday) && (
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
            Today&apos;s Active Movers
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bestMoverToday && (
              <Link
                href={`/stocks/${bestMoverToday.symbol.toLowerCase()}`}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('ssbd_last_stock_source', '/portfolio');
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors border border-emerald-500/20"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {bestMoverToday.symbol}
                  </div>
                  <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    +৳{fmt(Math.abs(bestMoverToday.dayPnl))} Today
                  </div>
                </div>
              </Link>
            )}
            {worstMoverToday && (
              <Link
                href={`/stocks/${worstMoverToday.symbol.toLowerCase()}`}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('ssbd_last_stock_source', '/portfolio');
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 transition-colors border border-rose-500/20"
              >
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                    {worstMoverToday.symbol}
                  </div>
                  <div className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                    −৳{fmt(Math.abs(worstMoverToday.dayPnl))} Today
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
