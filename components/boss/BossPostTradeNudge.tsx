'use client';

// components/boss/BossPostTradeNudge.tsx
// Milestone-gated Boss nudge shown inside TradeModal's success receipt.
// Tracks cumulative trade count in localStorage per UID.
// Shows at trade #3, #5, #10 — not before, not every trade.
// Dismissible for the rest of the session (sessionStorage).
// Never rendered for Boss users.
//
// Design note: `incrementTradeCount` is called by TradeModal BEFORE this
// component reads the count, so the check correctly fires on the new value.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, X, BarChart3 } from 'lucide-react';

interface Props {
  isBoss: boolean;
  uid: string | undefined;
  // tradeJustCompleted: toggled true each time a successful trade fires,
  // so the useEffect re-runs even if uid hasn't changed.
  tradeJustCompleted: boolean;
}

const TRADE_COUNT_KEY = (uid: string) => `ssbd_trade_count_${uid}`;
const SESSION_DISMISSED_KEY = 'ssbd_boss_nudge_dismissed_session';
const MILESTONE_TRADES = new Set([3, 5, 10]);

/**
 * Increments the persistent trade counter for this user.
 * Called by TradeModal when transactionStatus becomes 'success'.
 * Must be called BEFORE BossPostTradeNudge reads the count.
 */
export function incrementTradeCount(uid: string) {
  if (typeof window === 'undefined' || !uid) return;
  const raw = localStorage.getItem(TRADE_COUNT_KEY(uid));
  const current = raw ? parseInt(raw, 10) : 0;
  localStorage.setItem(TRADE_COUNT_KEY(uid), String((isNaN(current) ? 0 : current) + 1));
}

export default function BossPostTradeNudge({ isBoss, uid, tradeJustCompleted }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBoss || !uid || typeof window === 'undefined') return;
    if (!tradeJustCompleted) return;

    // Don't show again this session if already dismissed
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true') return;

    // Read AFTER TradeModal has already called incrementTradeCount
    const raw = localStorage.getItem(TRADE_COUNT_KEY(uid));
    const count = raw ? parseInt(raw, 10) : 0;

    if (MILESTONE_TRADES.has(count)) {
      setVisible(true);
    }
  }, [isBoss, uid, tradeJustCompleted]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    }
    setVisible(false);
  };

  if (isBoss || !visible) return null;

  return (
    <div
      role="region"
      aria-label="Boss Tier প্রমোশন"
      className="relative mx-0 rounded-2xl overflow-hidden
        bg-gradient-to-br from-amber-500/10 via-yellow-500/[0.08] to-amber-600/10
        dark:from-amber-500/12 dark:via-yellow-500/[0.08] dark:to-amber-600/12
        border border-amber-400/35 dark:border-amber-500/30"
    >
      {/* Gold top strip */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400/70 to-amber-400/0" />

      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Copy block */}
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-extrabold text-gray-900 dark:text-white leading-snug">
              👑 এই ট্রেডটা পোর্টফোলিওতে কতটুকু রিস্ক যোগ করল?
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Boss-এ আপগ্রেড করুন — সেক্টর এক্সপোজার, কনসেন্ট্রেশন রিস্ক অ্যালার্ট ও লাইফটাইম ট্রেড লেজার পান।{' '}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                ২ কাপ চায়ের দামে সারা মাস বস টাইপ অ্যানালিটিক্স 😎
              </span>
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/boss"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                  bg-gradient-to-r from-amber-400 to-yellow-400
                  text-gray-950 font-extrabold text-[11.5px]
                  shadow-md shadow-amber-400/30 hover:brightness-110 active:scale-[0.97]
                  transition-all whitespace-nowrap"
              >
                <Crown className="w-3 h-3 fill-current" />
                Boss দেখুন · ৳20 →
              </Link>
              <button
                type="button"
                onClick={dismiss}
                aria-label="এখন Boss Tier দেখব না"
                className="text-[11px] font-medium text-gray-400 dark:text-gray-500
                  hover:text-gray-600 dark:hover:text-gray-400 transition-colors py-2.5 px-2
                  min-h-[44px] flex items-center"
              >
                এখন না
              </button>
            </div>
          </div>

          {/* Dismiss X — 40×40 tap area */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Boss promotion বন্ধ করুন"
            className="shrink-0 -mt-0.5 -mr-1 w-10 h-10 rounded-full
              hover:bg-gray-200/80 dark:hover:bg-gray-700/80
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
