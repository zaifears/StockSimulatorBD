'use client';

// components/boss/BossTradeBanner.tsx
// Compact, dismissible Boss promotion banner for the /trade page.
// Shown only to Bro-tier users. Context-aware: personalized copy when
// the user already has ≥3 holdings. Dismisses for 7 days via localStorage.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, X, TrendingUp } from 'lucide-react';

interface Props {
  isBoss: boolean;
  uid: string | undefined;
  portfolioLength: number;
}

const DISMISS_KEY = (uid: string) => `ssbd_boss_trade_banner_dismissed_${uid}`;
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function BossTradeBanner({ isBoss, uid, portfolioLength }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBoss || !uid || typeof window === 'undefined') return;

    const raw = localStorage.getItem(DISMISS_KEY(uid));
    if (raw) {
      const dismissedAt = parseInt(raw, 10);
      if (!isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
        return; // still within cooldown
      }
    }

    setVisible(true);
  }, [isBoss, uid]);

  const dismiss = () => {
    if (uid && typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY(uid), String(Date.now()));
    }
    setVisible(false);
  };

  if (isBoss || !visible) return null;

  const hasPortfolio = portfolioLength >= 3;

  return (
    <div
      role="region"
      aria-label="Boss Tier promotion"
      className="mx-3.5 sm:mx-0 mb-3 relative overflow-hidden rounded-2xl
        bg-gradient-to-r from-amber-500/[0.08] via-yellow-500/[0.06] to-amber-500/[0.08]
        dark:from-amber-500/10 dark:via-yellow-500/[0.07] dark:to-amber-500/10
        border border-amber-400/30 dark:border-amber-500/25
        shadow-xs"
    >
      {/* Subtle shimmer strip */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400/60 to-amber-400/0" />

      {/* Main row — right-padded to clear the absolute dismiss button */}
      <div className="flex items-center gap-3 px-4 py-3 pr-14">
        {/* Icon */}
        <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center">
          {hasPortfolio ? (
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-current" />
          )}
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          {hasPortfolio ? (
            <>
              <p className="text-[12px] font-extrabold text-gray-900 dark:text-white leading-snug">
                পোর্টফোলিওতে আসলে কতটুকু রিস্ক আছে জানেন?
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                Boss-এ পান ২১-সেক্টর এক্সপোজার, রিস্ক অ্যালার্ট ও লাইফটাইম ট্রেড লেজার।{' '}
                <span className="text-amber-600 dark:text-amber-400 font-bold">২ কাপ চায়ের দামে সারা মাস বস টাইপ অ্যানালিটিক্স 😎</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-extrabold text-gray-900 dark:text-white leading-snug">
                👑 সিরিয়াসলি ট্রেড করছেন? Boss আনলক করুন
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                রিস্ক রেডার, ২১-সেক্টর এক্সপোজার, +১০% কয়েন বোনাস।{' '}
                <span className="text-amber-600 dark:text-amber-400 font-bold">২ কাপ চায়ের দামে সারা মাস 😎</span>
              </p>
            </>
          )}
        </div>

        {/* Desktop CTA — hidden on mobile, aria-hidden to avoid duplicate announcement */}
        <Link
          href="/boss"
          aria-hidden="true"
          tabIndex={-1}
          className="shrink-0 hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl
            bg-gradient-to-r from-amber-400 to-yellow-400
            text-gray-950 font-extrabold text-[11px] uppercase tracking-wide
            shadow-sm shadow-amber-400/30 hover:brightness-105 active:scale-95 transition-all
            whitespace-nowrap"
        >
          ৳20 থেকে →
        </Link>
      </div>

      {/* Mobile CTA row — full-width button, primary tap target on phones */}
      <div className="sm:hidden px-4 pb-3 -mt-1 flex items-center gap-2">
        <Link
          href="/boss"
          className="flex-1 text-center py-2.5 rounded-xl
            bg-gradient-to-r from-amber-400 to-yellow-400
            text-gray-950 font-extrabold text-[11.5px] uppercase tracking-wide
            shadow-sm shadow-amber-400/25 hover:brightness-105 active:scale-[0.97] transition-all"
        >
          Boss দেখুন — ৳20 থেকে →
        </Link>
      </div>

      {/* Dismiss button — 40×40 tap area, visually small icon */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Boss promotion বন্ধ করুন"
        className="absolute top-2 right-2 w-10 h-10 rounded-full
          hover:bg-gray-200/60 dark:hover:bg-gray-700/60
          text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
          flex items-center justify-center transition-colors active:scale-90"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
