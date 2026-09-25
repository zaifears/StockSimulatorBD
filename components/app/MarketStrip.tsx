'use client';

// components/app/MarketStrip.tsx
// The always-on status bar of the app shell, modelled on the top strip every
// BD broker terminal carries: account figures on the left, market state on
// the right, live at all times regardless of which screen you're on.
//
// Deliberately absent: a DSEX/DS30 index value. Those are NOT in the data we
// scrape (api/market_sync.py pulls the per-symbol board only), and printing a
// number we derived ourselves next to real prices would read as the official
// index. Market breadth (advancing vs declining) is shown instead — it comes
// straight from the same board data and is honestly ours to compute.
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Coins, Crown, Shield, Bell } from 'lucide-react';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPortfolioTotals, getMarketBreadth } from '@/lib/utils/portfolio';
import { formatDhakaClock } from '@/lib/utils/dhakaTime';
import MarketClosedModal from '@/components/market/MarketClosedModal';
import ScrollableHorizontal from '@/components/ui/ScrollableHorizontal';

const fmtMoney = (n: number, dp = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const fmtCompact = (n: number) => {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(2)} cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(2)} lac`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
};

/** Ticks its own state once a second so the rest of MarketStrip doesn't
 * re-render on every tick — isolated on purpose. */
function LiveClock() {
  const [time, setTime] = useState(() => formatDhakaClock());

  useEffect(() => {
    const id = setInterval(() => setTime(formatDhakaClock()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono tabular-nums font-semibold" title="Current time, Asia/Dhaka">
      {time}
    </span>
  );
}

interface Props {
  /** Focuses the market board's search field when the shell is on a screen
   * that has one; otherwise the icon routes to the board. */
  onSearchClick?: () => void;
}

export default function MarketStrip({ onSearchClick }: Props) {
  const { marketInfo, simulatorState, isMarketOpen } = useSharedSimulator();
  const { user, isBoss } = useAuth();
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const marketOpen = isMarketOpen();

  const totals = useMemo(
    () => getPortfolioTotals(simulatorState.portfolio, marketInfo?.stocks || []),
    [simulatorState.portfolio, marketInfo?.stocks]
  );

  const breadth = useMemo(() => getMarketBreadth(marketInfo?.stocks || []), [marketInfo?.stocks]);

  const unrealised = totals.unrealisedPnl;
  const dayPnl = totals.dayPnl;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 pt-safe bg-white/95 dark:bg-[#0D131D]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800">
      {/* Row 1 — identity, market state, utilities */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 h-12">
          <Link href="/" className="flex items-center shrink-0" aria-label="StockSimulatorBD home">
            <Image src="/favicon.svg" alt="StockSimulatorBD" width={24} height={24} className="h-6 w-6 object-contain shrink-0" priority />
          </Link>

          {/* Market state — the single most important thing on this bar */}
          {marketOpen ? (
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold tabular-nums shrink-0 transition-colors bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              title="Market open — 10:00 to 14:15 Dhaka time"
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                aria-hidden="true"
              />
              <span>OPEN</span>
              <LiveClock />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCalendarModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold tabular-nums shrink-0 transition-all bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/15 active:scale-95 cursor-pointer"
              title="Market closed — Click to set calendar reminder for next session"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
              <span>CLOSED</span>
              <Bell className="w-3 h-3 ml-0.5 opacity-80" />
              <LiveClock />
            </button>
          )}

          <div className="flex-1 min-w-[6px]" />

          {/* Board breadth — real, derived from the symbols we actually have */}
          <div
            className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold shrink-0"
            title={`${breadth.advancing} advancing, ${breadth.declining} declining, ${breadth.unchanged} unchanged, ${breadth.notTraded} not traded`}
          >
            <span className="text-emerald-600 dark:text-emerald-400">▲{breadth.advancing}</span>
            <span className="text-rose-600 dark:text-rose-400">▼{breadth.declining}</span>
          </div>

          {/* Tier Status Indicator */}
          {user && (
            isBoss ? (
              <Link
                href="/profile/tier"
                aria-label="Boss Tier Active"
                title="Boss Tier active — click to view tier status"
                className="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-400/50 text-amber-700 dark:text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shrink-0"
              >
                <Crown className="w-3.5 h-3.5 fill-current text-amber-500 shrink-0" />
                <span className="hidden sm:inline">Boss</span>
              </Link>
            ) : (
              <Link
                href="/boss"
                aria-label="Upgrade to Boss Tier"
                title="Bro Tier (Free) — click to upgrade to Boss"
                className="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-all shrink-0"
              >
                <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="hidden sm:inline">Bro</span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded bg-amber-500 text-gray-950">Upgrade</span>
              </Link>
            )
          )}

          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search stocks"
            className="p-1.5 sm:p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all shrink-0"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          <Link
            href="/coins"
            aria-label="Add trading credit"
            className="p-1.5 sm:p-2 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 active:scale-95 transition-all shrink-0"
          >
            <Coins className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>

      {/* Row 2 — live account figures. Scrolls horizontally on narrow phones
          rather than truncating any number, since a half-shown balance is
          worse than one the user has to nudge into view. */}
      <div className="border-t border-gray-200/60 dark:border-gray-800/60 bg-gray-50/90 dark:bg-black/25">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <ScrollableHorizontal
            as="dl"
            scrollAmount={140}
            scrollClassName="gap-4 sm:gap-6 h-9"
            gradientFrom="from-gray-50 dark:from-[#0B0F17]"
            arrowSize="xs"
            clearancePadding="pr-6 sm:pr-0"
            showOn="mobile-only"
            ariaLabel="Live account summary figures"
          >
            <Figure label="Cash" value={`৳${fmtMoney(simulatorState.balance, 0)}`} />
            <Figure
              label="UnRe Gain"
              value={`${unrealised >= 0 ? '+' : '−'}৳${fmtMoney(Math.abs(unrealised))}`}
              tone={unrealised > 0 ? 'up' : unrealised < 0 ? 'down' : 'flat'}
            />
            <Figure
              label="Day P&L"
              value={`${dayPnl >= 0 ? '+' : '−'}৳${fmtMoney(Math.abs(dayPnl))}`}
              tone={dayPnl > 0 ? 'up' : dayPnl < 0 ? 'down' : 'flat'}
            />
            <Figure label="Holdings" value={String(simulatorState.portfolio.length)} />
            <Figure
              label="Turnover"
              value={`৳${fmtCompact((marketInfo?.stocks || []).reduce((s, x) => s + (x.value || 0), 0))}`}
            />
          </ScrollableHorizontal>
        </div>
      </div>
    </header>

    <MarketClosedModal
      isOpen={calendarModalOpen}
      onClose={() => setCalendarModalOpen(false)}
      source="market_strip"
    />
  </>
  );
}

function Figure({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'flat' | 'neutral';
}) {
  const toneClass =
    tone === 'up'
      ? 'text-[#0AA892] dark:text-[#2DD4BF]'
      : tone === 'down'
        ? 'text-[#E54D4C] dark:text-[#F87171]'
        : 'text-gray-900 dark:text-gray-100';

  return (
    <div className="flex items-baseline gap-1.5 shrink-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className={`text-xs font-mono font-bold tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}
