'use client';

// components/boss/BossPortfolioBar.tsx
// Permanent compact Boss promotion bar for the /portfolio page.
// Sits between PortfolioSummary and the Holdings/Insights/Orders tab strip.
// Only rendered for Bro-tier users — Boss users see nothing here.

import React from 'react';
import Link from 'next/link';
import { Crown, PieChart, Shield } from 'lucide-react';

interface Props {
  isBoss: boolean;
}

export default function BossPortfolioBar({ isBoss }: Props) {
  if (isBoss) return null;

  return (
    <Link
      href="/boss"
      aria-label="Boss Tier আপগ্রেড করুন — পোর্টফোলিও রিস্ক রেডার পান"
      className="group mx-3.5 sm:mx-0 mb-3.5 flex items-center gap-3 px-4 py-3
        rounded-2xl relative overflow-hidden
        bg-gradient-to-r from-amber-500/[0.07] via-yellow-500/[0.05] to-amber-500/[0.07]
        dark:from-amber-500/10 dark:via-yellow-500/[0.07] dark:to-amber-500/10
        border border-amber-400/25 dark:border-amber-500/20
        shadow-xs hover:shadow-md hover:border-amber-400/40 dark:hover:border-amber-500/35
        transition-all duration-200 active:scale-[0.97]"
    >
      {/* Shimmer strip */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-amber-400/0 via-amber-400/50 to-amber-400/0" />

      {/* Left: Icon cluster */}
      <div className="shrink-0 flex -space-x-1.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-400/20">
          <PieChart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center ring-1 ring-amber-400/20">
          <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <span className="block text-[12px] font-extrabold text-gray-900 dark:text-white leading-none whitespace-nowrap">
          Boss · পোর্টফোলিও রিস্ক রেডার
        </span>
        {/* Subtitle clamps to one line on narrow phones instead of pushing layout */}
        <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug truncate">
          ২১-সেক্টর এক্সপোজার · কনসেন্ট্রেশন অ্যালার্ট · লাইফটাইম ট্রেড লেজার
        </p>
      </div>

      {/* Right: Price pill */}
      <div className="shrink-0">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl
          bg-gradient-to-r from-amber-400 to-yellow-400
          text-gray-950 font-extrabold text-[10.5px] uppercase tracking-wide
          shadow-sm shadow-amber-400/25 group-hover:brightness-105 transition-all
          whitespace-nowrap">
          <Crown className="w-2.5 h-2.5 fill-current" />
          ৳20 থেকে
        </span>
      </div>
    </Link>
  );
}
