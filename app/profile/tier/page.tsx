'use client';

// app/profile/tier/page.tsx
// Dedicated tier hub showing the current user's tier (Bro vs. Boss), expiry countdown,
// active privileges, and direct upgrade / renewal pathways.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/app/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Crown, Shield, Check, ArrowRight, Sparkles, Coins, PieChart,
  History, Download, ArrowLeft, Clock, Calendar, ExternalLink
} from 'lucide-react';
import BossBadge from '@/components/ui/BossBadge';
import { formatDhakaClock } from '@/lib/utils/dhakaTime';

export default function ProfileTierPage() {
  return (
    <AppShell redirectPath="/profile/tier" redirectMessage="Please sign in to view your tier status">
      <ProfileTierScreen />
    </AppShell>
  );
}

function ProfileTierScreen() {
  const { user, isBoss, accountTier } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setUserData(snap.data());
        }
        setLoadingDoc(false);
      },
      (err) => {
        console.error('Failed to listen to user tier data:', err);
        setLoadingDoc(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Calculate days remaining if bossUntil is set
  const now = Date.now();
  const bossUntil = userData?.bossUntil || 0;
  const isCurrentlyBoss = isBoss || (typeof bossUntil === 'number' && bossUntil > now);
  const daysRemaining = bossUntil > now ? Math.ceil((bossUntil - now) / (1000 * 60 * 60 * 24)) : 0;

  const formattedExpiry = bossUntil > 0
    ? new Date(bossUntil).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-12">
      {/* Breadcrumb / Back button */}
      <div className="mb-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
        </Link>
      </div>

      {/* Main Tier Header Card */}
      {isCurrentlyBoss ? (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-600/20 border-2 border-amber-500/50 shadow-xl shadow-amber-500/5 mb-6">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
                <Crown className="w-3.5 h-3.5 fill-current" /> Active Boss Subscription
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Boss Tier</span>
                <BossBadge size="sm" interactive={false} />
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md">
                You have full access to institutional-grade Risk Radar analytics, +10% coin bonus, and lifetime history.
              </p>
            </div>

            {/* Expiry Pill */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl p-4 border border-amber-500/30 text-left sm:text-right shrink-0">
              <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Subscription Status
              </div>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {daysRemaining > 0 ? `${daysRemaining} Days Left` : 'Active'}
              </div>
              {formattedExpiry && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                  Valid until: {formattedExpiry}
                </div>
              )}
            </div>
          </div>

          {/* Quick Boss CTA Bar */}
          <div className="mt-6 pt-6 border-t border-amber-500/20 flex flex-wrap items-center gap-3">
            <Link
              href="/portfolio"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <PieChart className="w-4 h-4" /> Open Risk Radar
            </Link>
            <Link
              href="/coins"
              className="px-4 py-2 rounded-xl bg-white/90 dark:bg-gray-800 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs hover:bg-amber-50 dark:hover:bg-gray-700 transition-all flex items-center gap-1.5"
            >
              <Coins className="w-4 h-4" /> Recharge with +10% Bonus
            </Link>
            <Link
              href="/boss"
              className="px-4 py-2 rounded-xl bg-transparent text-gray-600 dark:text-gray-300 font-semibold text-xs hover:text-gray-900 dark:hover:text-white transition-all ml-auto flex items-center gap-1"
            >
              Extend Plan <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Standard Plan
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Bro Tier (Free)
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                You are on the 100% free paper trading plan. Upgrade to Boss Tier for advanced Risk Radar analytics, +10% bonus coins, and full order ledger.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href="/boss"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-95 transition-all"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Upgrade to Boss (৳20)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Feature Privileges Breakdown */}
      <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
              Tier Privileges & Comparison
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Everything included in your current account vs. Boss Tier
            </p>
          </div>
          <Link
            href="/boss"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            All 14 Features <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4 divide-y divide-gray-100 dark:divide-gray-800/80">
          {/* Feature 1: Core DSE Trading */}
          <div className="pt-4 first:pt-0 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Core DSE Paper Trading</h3>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5 rounded-full">
                  Included Free
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Live DSE price quotes, TradingView candlestick charts, T+1 settlement cycle, 0.40% broker commission, and ৳10,000 starting demo cash.
              </p>
            </div>
          </div>

          {/* Feature 2: Portfolio Insights & Risk Radar */}
          <div className="pt-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <PieChart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Portfolio Insights & Risk Radar</h3>
                {isCurrentlyBoss ? (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                    Boss Only
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Banked Realized P&L vs Unrealized gains, 21 DSE industry sectors exposure radar, and automated 40%+ single-stock concentration risk alerts.
              </p>
            </div>
          </div>

          {/* Feature 3: Recharge Coin Bonus */}
          <div className="pt-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Coins className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">+10% Extra Free Coins</h3>
                {isCurrentlyBoss ? (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> +10% Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                    Standard (No Bonus)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Boss tier automatically gets 10% bonus coins for free on every approved bKash recharge (550 coins / ৳ instead of 500).
              </p>
            </div>
          </div>

          {/* Feature 4: Order History Depth */}
          <div className="pt-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Order History Depth</h3>
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                  {isCurrentlyBoss ? 'Unlimited Lifetime' : 'Last 10 Trades'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Bro Tier displays the last 10 executed orders. Boss Tier preserves an everlasting order ledger with full price and commission audits.
              </p>
            </div>
          </div>

          {/* Feature 5: Visual Gold Identity */}
          <div className="pt-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Gold Boss Badge & Identity</h3>
                {isCurrentlyBoss ? (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                    Boss Only
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Distinctive metallic gold Boss badge displayed in your navbar, profile, and order receipts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
