'use client';

// components/app/AppTabBar.tsx
// The app shell's primary navigation, replacing the 3-item marketing bottom
// bar on authenticated surfaces. Broker terminals put five destinations here
// with order entry raised in the centre, because placing an order is the one
// action that must be reachable from anywhere in one thumb movement.
//
// Note on what is NOT a tab: /stocks. That directory and its ~400 symbol
// pages are force-static, fully-indexed SEO surfaces — putting them behind
// this shell's auth gate would de-index the lot. They stay ordinary web
// pages, reached from the Chart link on any market row.
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LineChart, Briefcase, Wallet, User, ArrowLeftRight } from 'lucide-react';

export interface Tab {
  name: string;
  href: string;
  icon: typeof LineChart;
  match: (pathname: string) => boolean;
}

// Order entry lives at /trade/order, a sub-route of /trade — so the Market
// tab has to explicitly exclude it, or both light up at once.
export const APP_TABS: Tab[] = [
  {
    name: 'Market',
    href: '/trade',
    icon: LineChart,
    match: (p) => p === '/trade' || (p.startsWith('/trade/') && !p.startsWith('/trade/order')),
  },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, match: (p) => p.startsWith('/portfolio') },
  { name: 'Funds', href: '/coins', icon: Wallet, match: (p) => p.startsWith('/coins') },
  { name: 'Profile', href: '/profile', icon: User, match: (p) => p.startsWith('/profile') },
];

export default function AppTabBar() {
  const pathname = usePathname() || '';
  const orderActive = pathname.startsWith('/trade/order');

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D131D]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800 pb-safe"
    >
      <div className="flex items-stretch h-[60px]">
        {APP_TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}

        {/* Centre slot — the raised order-entry button */}
        <div className="w-[68px] shrink-0 flex items-start justify-center">
          <Link
            href="/trade/order"
            aria-label="Place an order"
            aria-current={orderActive ? 'page' : undefined}
            className={`-mt-5 w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all ${
              orderActive
                ? 'bg-blue-700 text-white shadow-blue-600/40'
                : 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[10px] font-bold tracking-wide">ORDER</span>
          </Link>
        </div>

        {APP_TABS.slice(2).map((tab) => (
          <TabLink key={tab.href} tab={tab} active={tab.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
        active
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-semibold'}`}>
        {tab.name}
      </span>
    </Link>
  );
}
