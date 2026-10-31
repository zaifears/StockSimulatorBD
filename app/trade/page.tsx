'use client';

// app/trade/page.tsx
// The Market screen: the live DSE board. Holdings now live on their own
// Portfolio tab (app/portfolio/page.tsx), so this screen is the board and
// only the board — search, dense broker-style rows, buy/sell straight from
// the list, and a chart link into each symbol's static page.
import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { useTradeModal } from '@/hooks/useTradeModal';
import { searchByNameOrSymbol } from '@/lib/dseCompanyNames';
import { getUpcomingHolidays } from '@/lib/bangladeshHolidays';
import { Search, X, ExternalLink } from 'lucide-react';
import ScrollableHorizontal from '@/components/ui/ScrollableHorizontal';
import AppShell, { useRegisterSearchFocus } from '@/components/app/AppShell';
import MarketRow from '@/components/market/MarketRow';
import MarketOverviewBanner from '@/components/market/MarketOverviewBanner';
import StockRow from '@/components/simulator/trade/StockRow';
import StockSkeleton from '@/components/simulator/trade/StockSkeleton';
import TradeModal from '@/components/simulator/trade/TradeModal';
import UserNoticeModal from '@/components/shared/UserNoticeModal';
import { useAuth } from '@/contexts/AuthContext';
import BossTradeBanner from '@/components/boss/BossTradeBanner';
import MarketClosedModal from '@/components/market/MarketClosedModal';
import MarketClosedBanner from '@/components/market/MarketClosedBanner';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const MarketCalendar = dynamic(() => import('@/components/simulator/MarketCalendar'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />,
});

export default function TradePage() {
  return (
    <AppShell redirectPath="/trade" redirectMessage="Please sign in to access the trading simulator">
      <MarketScreen />
    </AppShell>
  );
}

// Concluded / Previous Campaigns (Archived)
const ARCHIVED_CAMPAIGNS = [
  {
    campaignId: 'facebook_page_launch_v1',
    status: 'concluded',
    title: 'StockSimulatorBD Official Facebook Page Launch',
    concludedAt: '2026-10-31',
  },
  {
    campaignId: 'domain_survey',
    status: 'concluded',
    title: 'Domain Renewal Community Poll #1',
    concludedAt: '2026-10-25',
  },
] as const;

// Active Notice / Announcement Configuration for /trade
// Controls what modal is shown once per user until completed. Trade is NEVER blocked.
const ACTIVE_NOTICE_CONFIG = {
  isActive: true,
  campaignId: 'dse_settlement_reality_v1',
  variant: 'announcement' as const,
  iconType: 'settlement' as const,
  badge: {
    en: 'REALISTIC DSE ENGINE',
    bn: 'বাস্তব DSE ট্রেডিং নিয়ম',
  },
  showLanguageToggle: true,
  defaultLang: 'bn' as const,
  title: {
    en: 'StockSimulatorBD is Now One Step Ahead in Market Realism!',
    bn: 'StockSimulatorBD এখন থেকে আরও রিয়ালিস্টিক!',
  },
  description: {
    bn: (
      <div className="space-y-3 text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          একদম আসল DSE-এর মতো, এখন থেকে শেয়ার কেনার পর অফিশিয়াল সেটেলমেন্ট সাইকেল শেষ না হওয়া পর্যন্ত তা আর সেল করা যাবে না। আর হ্যাঁ, শুধু ট্রেডিং ডে-গুলোই (রবি-বৃহস্পতি) কাউন্ট হবে।
        </p>

        {/* Category Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2 not-prose">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D27] border border-gray-200/80 dark:border-gray-800 text-left">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                ক্যাটাগরি A, B, G, N
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                T+2
              </span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              ২ কার্যদিবস পর বিক্রয়যোগ্য
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              যেমন: রবিবার ক্রয় করলে মঙ্গলবার বিক্রি করা যাবে।
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D27] border border-gray-200/80 dark:border-gray-800 text-left">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                ক্যাটাগরি Z
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                T+3
              </span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              ৩ কার্যদিবস পর বিক্রয়যোগ্য
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              যেমন: রবিবার ক্রয় করলে বুধবার বিক্রি করা যাবে।
            </p>
          </div>
        </div>

        {/* Small Facebook Follow Strip */}
        <div className="p-3 rounded-xl bg-[#1877F2]/5 dark:bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-between gap-3 not-prose">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">
              নতুন আপডেট আর ট্রেডিং গাইডলাইনের জন্য আমাদের ফেসবুক পেজটা ফলো করেছেন তো?
            </p>
          </div>
          <a
            href="https://facebook.com/stocksimulatorbd/"
            target="_blank"
            rel="noopener noreferrer"
            data-no-dismiss="true"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all shrink-0 active:scale-95 shadow-xs"
          >
            <span>ফলো করুন</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    ),
    en: (
      <div className="space-y-3 text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          To mirror the authentic Dhaka Stock Exchange (DSE), shares you buy can now only be sold once their official settlement cycle completes. StockSimulatorBD enforces settlement per purchase lot, counting strictly trading days (Sundays to Thursdays, excluding holidays).
        </p>

        {/* Category Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2 not-prose">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D27] border border-gray-200/80 dark:border-gray-800 text-left">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Category A, B, G, N
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                T+2
              </span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              2 Trading Days Settlement
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              e.g. Bought on Sunday ➔ Sellable on Tuesday.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D27] border border-gray-200/80 dark:border-gray-800 text-left">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Category Z (Junk)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                T+3
              </span>
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
              3 Trading Days Settlement
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
              e.g. Bought on Sunday ➔ Sellable on Wednesday.
            </p>
          </div>
        </div>

        {/* Small Facebook Follow Strip */}
        <div className="p-3 rounded-xl bg-[#1877F2]/5 dark:bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-between gap-3 not-prose">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">
              Did you follow our Facebook page for updates and educational guidelines?
            </p>
          </div>
          <a
            href="https://facebook.com/stocksimulatorbd/"
            target="_blank"
            rel="noopener noreferrer"
            data-no-dismiss="true"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all shrink-0 active:scale-95 shadow-xs"
          >
            <span>Follow</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    ),
  },
  ctaText: {
    en: 'Confirm',
    bn: 'বুঝেছি',
  },
  ctaVariant: 'emerald' as const,
  hideSecondaryDismiss: true,
  dismissible: true,
};

function MarketScreen() {
  const { user, isBoss } = useAuth();
  const {
    marketInfo, simulatorState, loading: simulatorLoading, isMarketOpen,
    executeTrade, transactionStatus, transactionMessage, resetTransaction,
  } = useSharedSimulator();

  const modal = useTradeModal(executeTrade);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [visibleCount, setVisibleCount] = useState(50);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [marketClosedModalOpen, setMarketClosedModalOpen] = useState(false);
  const [marketClosedModalSource, setMarketClosedModalSource] = useState('trade_banner');

  useRegisterSearchFocus(() => searchInputRef.current?.focus());

  useEffect(() => {
    getUpcomingHolidays().then(setHolidays).catch(() => setHolidays([]));
  }, []);

  const marketOpen = isMarketOpen();

  const handleOpenMarketClosed = useCallback((source: string = 'trade_banner') => {
    setMarketClosedModalSource(source);
    setMarketClosedModalOpen(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    startTransition(() => {
      setSearchQuery(value);
      setVisibleCount(50);
    });
  }, []);

  // Restore trade page state and scroll position when returning from a stock chart page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStr = sessionStorage.getItem('ssbd_trade_scroll_state');
    if (!savedStr) return;

    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    try {
      const saved = JSON.parse(savedStr);
      if (Date.now() - (saved.timestamp || 0) < 4 * 60 * 60 * 1000) {
        if (saved.sector) setSelectedSector(saved.sector);
        if (saved.search) {
          setSearchInput(saved.search);
          setSearchQuery(saved.search);
        }
        if (saved.visibleCount && saved.visibleCount > 50) {
          setVisibleCount(saved.visibleCount);
        }

        const performScroll = () => {
          if (saved.symbol) {
            const el = document.getElementById(`market-row-${saved.symbol}`) || document.getElementById(`market-card-${saved.symbol}`);
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' });
              return true;
            }
          }
          if (saved.scrollY > 0) {
            window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
          }
          return false;
        };

        performScroll();
        requestAnimationFrame(() => performScroll());
        t1 = setTimeout(performScroll, 80);
        t2 = setTimeout(performScroll, 200);
        t3 = setTimeout(performScroll, 450);
      }
    } catch (e) {
      console.warn('Failed to restore trade scroll state:', e);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, []);

  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map((item) => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  const normalizedQuery = searchQuery.trim();
  const rankedSearchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    const matches = searchByNameOrSymbol(normalizedQuery);
    return new Map(matches.map((sym, idx) => [sym, idx]));
  }, [normalizedQuery]);

  // Sector counts always reflect the full board, not the search-narrowed
  // subset — the tab strip is a top-level facet, so it shouldn't shuffle or
  // shrink while someone is typing a search query.
  const sectorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const stock of marketInfo?.stocks || []) {
      if (stock.sector) counts.set(stock.sector, (counts.get(stock.sector) || 0) + 1);
    }
    return counts;
  }, [marketInfo?.stocks]);

  const sortedSectors = useMemo(
    () => Array.from(sectorCounts.keys()).sort((a, b) => a.localeCompare(b)),
    [sectorCounts]
  );

  const handleSectorChange = useCallback((sector: string) => {
    setSelectedSector(sector);
    setVisibleCount(50);
  }, []);


  const filteredStocks = useMemo(() => {
    let all = marketInfo?.stocks || [];
    if (selectedSector !== 'All') all = all.filter((s) => s.sector === selectedSector);
    if (!normalizedQuery || !rankedSearchResults) return all;
    const upper = normalizedQuery.toUpperCase();
    const matched = all.filter((s) => s.symbol.includes(upper) || rankedSearchResults.has(s.symbol));
    return matched.sort((a, b) => {
      const rankA = rankedSearchResults.has(a.symbol) ? rankedSearchResults.get(a.symbol)! : 1000;
      const rankB = rankedSearchResults.has(b.symbol) ? rankedSearchResults.get(b.symbol)! : 1000;
      if (rankA !== rankB) return rankA - rankB;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [marketInfo?.stocks, selectedSector, normalizedQuery, rankedSearchResults]);

  const visibleStocks = useMemo(() => filteredStocks.slice(0, visibleCount), [filteredStocks, visibleCount]);
  const hasMore = filteredStocks.length > visibleCount;

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) setVisibleCount((prev) => prev + 50);
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [hasMore]
  );

  const onTrade = useCallback(
    (symbol: string, type: 'buy' | 'sell') => modal.openTradeModal(symbol, type, resetTransaction),
    [modal, resetTransaction]
  );

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
      {/* ── Official Real-time DSE Indices, Breadth & Liquidity Strip ── */}
      <MarketOverviewBanner onSelectStock={(sym) => handleSearchChange(sym)} />

      <div className="px-3.5 sm:px-0 pt-2 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search symbol or company…"
            aria-label="Search DSE stocks"
            className="w-full h-11 pl-9 pr-9 bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 rounded-2xl text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isPending && <p className="text-[11px] text-blue-500 font-semibold mt-1">Searching…</p>}
      </div>

      {sortedSectors.length > 0 && (
        <div className="pb-3 -mt-1 px-3.5 sm:px-0">
          <ScrollableHorizontal
            scrollAmount={200}
            scrollClassName="gap-2 min-w-0"
            gradientFrom="from-[#F8F9FA] dark:from-[#0B0F17]"
            arrowSize="sm"
            role="tablist"
            ariaLabel="Filter by industry sector"
            clearancePadding="pr-8 sm:pr-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedSector === 'All'}
              onClick={() => handleSectorChange('All')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedSector === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-2xs'
              }`}
            >
              All
            </button>
            {sortedSectors.map((sector) => (
              <button
                key={sector}
                type="button"
                role="tab"
                aria-selected={selectedSector === sector}
                onClick={() => handleSectorChange(sector)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedSector === sector
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-2xs'
                }`}
              >
                {sector} <span className="opacity-60">{sectorCounts.get(sector)}</span>
              </button>
            ))}
          </ScrollableHorizontal>
        </div>
      )}


      {/* Off-hours Market Schedule banner */}
      {!marketOpen && (
        <MarketClosedBanner
          onOpenModal={() => handleOpenMarketClosed('trade_banner')}
          holidays={holidays}
        />
      )}

      {/* Boss Tier promotion banner — only visible to Bro users */}
      <BossTradeBanner
        isBoss={isBoss}
        uid={user?.uid}
        portfolioLength={simulatorState.portfolio.length}
      />

      {simulatorLoading ? (
        <StockSkeleton count={10} />
      ) : visibleStocks.length === 0 ? (
        <div className="mx-3.5 sm:mx-0 py-16 px-6 rounded-2xl bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-col items-center text-center gap-2">
          <Search className="w-8 h-8 text-gray-400 opacity-40 mb-1" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {searchQuery
              ? <>No stocks found matching &ldquo;{searchQuery}&rdquo;{selectedSector !== 'All' && ` in ${selectedSector}`}</>
              : `No stocks found in ${selectedSector}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
            Try searching by official ticker (e.g. GP, SQURPHARMA) or company name.
          </p>
          <div className="flex items-center flex-wrap justify-center gap-2 mt-2">
            {selectedSector !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedSector('All')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
              >
                Search all sectors
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-5 lg:px-6 py-3.5 font-semibold">Symbol</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right">Price (LTP)</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right">Change</th>
                    <th className="hidden lg:table-cell px-5 lg:px-6 py-3.5 font-semibold text-right">Day Range (H/L)</th>
                    <th className="hidden xl:table-cell px-5 lg:px-6 py-3.5 font-semibold text-right">Volume</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-center">Category</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleStocks.map((stock) => (
                    <StockRow
                      key={stock.symbol}
                      stock={stock}
                      marketOpen={marketOpen}
                      variant="market"
                      onTrade={onTrade}
                      onMarketClosedClick={(sym, type) => handleOpenMarketClosed(`trade_row_${type}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div ref={observerRef} className="h-10 w-full flex items-center justify-center p-4 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800">
                Loading more…
              </div>
            )}
          </div>

          {/* Mobile Standalone Cards with Grey Resting Zones */}
          <div className="md:hidden space-y-3 px-3.5 sm:px-0">
            {visibleStocks.map((stock) => (
              <MarketRow
                key={stock.symbol}
                stock={stock}
                portfolioItem={portfolioBySymbol.get(stock.symbol)}
                marketOpen={marketOpen}
                onTrade={onTrade}
                onMarketClosedClick={(sym, type) => handleOpenMarketClosed(`market_row_${type}`)}
              />
            ))}

            {hasMore && (
              <div ref={observerRef} className="py-3 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-[#161B22]/80 border border-gray-200/60 dark:border-gray-800/60 rounded-xl shadow-xs">
                Loading more…
              </div>
            )}
          </div>
        </>
      )}

      <div className="px-4 sm:px-0 mt-6 mb-4">
        <MarketCalendar holidays={holidays} />
      </div>

      {modal.showTradeModal && modal.selectedStock && (
        <TradeModal
          selectedStock={modal.selectedStock}
          tradeType={modal.tradeType}
          setTradeType={modal.setTradeType}
          tradeQuantity={modal.tradeQuantity}
          setTradeQuantity={modal.setTradeQuantity}
          tradeQuantityInput={modal.tradeQuantityInput}
          setTradeQuantityInput={modal.setTradeQuantityInput}
          onClose={modal.closeTradeModal}
          onExecute={modal.handleExecuteModalTrade}
          marketInfo={marketInfo}
          simulatorState={simulatorState}
          marketOpen={marketOpen}
          transactionStatus={transactionStatus}
          transactionMessage={transactionMessage}
          resetTransaction={resetTransaction}
        />
      )}

      <MarketClosedModal
        isOpen={marketClosedModalOpen}
        onClose={() => setMarketClosedModalOpen(false)}
        holidays={holidays}
        source={marketClosedModalSource}
      />

      <UserNoticeModal {...ACTIVE_NOTICE_CONFIG} />
    </div>
  );
}
