'use client';

// components/portfolio/PortfolioNewsRadar.tsx
// Boss Tier Exclusive: Live Portfolio News Radar
// Automatically cross-references the user's active holdings with official DSE disclosures:
// 1. Dividend declarations & record dates
// 2. Price Sensitive Information (PSI)
// 3. Quarterly financial disclosures (EPS / NAVPS)
// 4. AGM / EGM notices and corporate actions
//
// Security & DOM Isolation (AGENTS.md):
// When !isBoss, real portfolio news is NEVER fetched, filtered, or mounted in the React tree.
// Bro tier users receive a static, promotional mock preview and an upgrade invitation.

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Radio,
  Newspaper,
  Crown,
  Lock,
  Sparkles,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Briefcase,
  AlertTriangle,
  Receipt,
  Search,
} from 'lucide-react';
import BossBadge from '@/components/ui/BossBadge';
import type { PortfolioItem, Stock } from '@/hooks/useSimulator';
import { DSE_COMPANY_NAMES } from '@/lib/dseCompanyNames';

export interface NewsItem {
  id: string;
  code: string;
  name?: string;
  sector?: string;
  type?: string;
  date?: string;
  time?: string;
  summary: string;
  body?: string;
  filedAt?: string;
}

interface PortfolioNewsRadarProps {
  portfolio: PortfolioItem[];
  stockBySymbol: Map<string, Stock>;
  isBoss: boolean;
  onTrade?: (symbol: string, type: 'buy' | 'sell') => void;
}

type NewsCategoryFilter = 'all' | 'dividend' | 'psi' | 'earnings' | 'agm';

export default function PortfolioNewsRadar({
  portfolio,
  stockBySymbol,
  isBoss,
  onTrade,
}: PortfolioNewsRadarProps) {
  // ─────────────────────────────────────────────────────────────────────────────
  // 🔒 BRO TIER: STRICT MEMORY & DOM ISOLATION (AGENTS.md)
  // When !isBoss, news is NEVER fetched and user holdings are NEVER cross-referenced.
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isBoss) {
    return <BroNewsRadarTeaser portfolioCount={portfolio.length} />;
  }

  return (
    <BossActiveNewsRadar
      portfolio={portfolio}
      stockBySymbol={stockBySymbol}
      onTrade={onTrade}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 BRO TIER TEASER COMPONENT (100% Static Mockups, Zero User News Leak)
// ─────────────────────────────────────────────────────────────────────────────
function BroNewsRadarTeaser({ portfolioCount }: { portfolioCount: number }) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hero Pitch Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-amber-500/15 dark:via-[#151B26] dark:to-[#111620] border-2 border-amber-400/60 dark:border-amber-500/40 p-5 sm:p-6 shadow-md">
        <BossBadge corner size="xs" />

        <div className="flex items-center gap-2.5 mb-3">
          <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
          </span>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2">
              Portfolio News Radar
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400/90 font-medium">
              Institutional-grade corporate disclosure tracking for your actual holdings
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-xl">
          Never miss an ex-dividend cut, sudden board meeting, or quarterly profit surge. The{' '}
          <strong className="text-gray-900 dark:text-white font-semibold">Portfolio News Radar</strong> automatically cross-references your{' '}
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{portfolioCount} active holding{portfolioCount === 1 ? '' : 's'}</span> against official Dhaka Stock Exchange filings in real time.
        </p>

        {/* 4 Feature Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">💰</span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Dividend & Record Date Radar</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Know the exact dividend % and entitlement record date before the market opens.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">⚡</span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Price Sensitive Information (PSI)</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Instant alerts on rights issues, expansions, contracts, and regulatory filings.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">📊</span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">Quarterly Earnings & EPS Surges</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Track audited financials and un-audited quarterly profit trajectory before you trade.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-2.5">
            <span className="text-base leading-none mt-0.5">🏛️</span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">AGM & Corporate Actions</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Annual general meetings, digital links, book closures, and sponsor share lockups.
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade Call to Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400">
              Exclusive Boss Feature
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              ৳20 for 1 Month (31 Days) · ৳99 for 6 Months (Save 18%)
            </p>
          </div>
          <Link
            href="/boss"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-950 font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <Crown className="w-4 h-4 fill-current" />
            Upgrade to Boss to Activate Radar
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Simulated Preview Card (Visual Demonstration with Dummy Data) */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/60 dark:bg-[#161B22]/60 p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              Simulated Radar Preview
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              Sample holdings disclosure view
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Lock className="w-3 h-3" /> Locked
          </span>
        </div>

        <div className="space-y-2.5 opacity-60 pointer-events-none select-none filter blur-[0.5px]">
          {/* Mock GP Dividend */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#12161E] border border-gray-100 dark:border-gray-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white">GP</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Dividend & Record Date
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">Today at 10:15 AM</span>
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
              GP: Recommended 125% Final Cash Dividend for the year 2026. Record Date set for Oct 22, 2026.
            </p>
          </div>

          {/* Mock SQURPHARMA EPS */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#12161E] border border-gray-100 dark:border-gray-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-gray-900 dark:text-white">SQURPHARMA</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Financials & EPS
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">Yesterday at 02:40 PM</span>
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
              SQURPHARMA: Q3 Un-audited Financials — Consolidated EPS rose to ৳6.18 against ৳5.22 YoY.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 👑 BOSS ACTIVE RADAR COMPONENT (Live Client Filtering, $0 DB Cost)
// ─────────────────────────────────────────────────────────────────────────────
function BossActiveNewsRadar({
  portfolio,
  stockBySymbol,
  onTrade,
}: {
  portfolio: PortfolioItem[];
  stockBySymbol: Map<string, Stock>;
  onTrade?: (symbol: string, type: 'buy' | 'sell') => void;
}) {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<NewsCategoryFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  // Extract owned symbols
  const ownedSymbols = useMemo(
    () => Array.from(new Set(portfolio.map((p) => p.symbol.trim().toUpperCase()))),
    [portfolio]
  );

  // Fetch full market news feed (cached at Edge for 120s)
  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market-news');
      if (res.ok) {
        const json = await res.json();
        setAllNews(json.news || []);
        setLastRefreshed(Date.now());
      } else {
        setError('Exchange disclosure feed temporarily unavailable. Please try again in a moment.');
      }
    } catch (err) {
      setError('Failed to connect to the news feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Filter news matching user's owned portfolio holdings
  const portfolioNews = useMemo(() => {
    if (ownedSymbols.length === 0) return [];
    const ownedSet = new Set(ownedSymbols);

    return allNews.filter((item) => {
      const itemCode = (item.code || '').trim().toUpperCase();
      // Match exact code or mention in summary
      if (ownedSet.has(itemCode)) return true;

      // Secondary check: does summary start with an owned ticker?
      const summaryUpper = (item.summary || '').toUpperCase();
      for (const sym of ownedSymbols) {
        if (summaryUpper.startsWith(`${sym}:`) || summaryUpper.startsWith(`${sym} `)) {
          return true;
        }
      }
      return false;
    });
  }, [allNews, ownedSymbols]);

  // Categorize helper
  const getCategory = (item: NewsItem): 'dividend' | 'psi' | 'earnings' | 'agm' | 'general' => {
    const text = `${item.type || ''} ${item.summary || ''} ${item.body || ''}`.toLowerCase();
    if (text.includes('dividend') || text.includes('record date') || text.includes('cash div') || text.includes('stock div')) {
      return 'dividend';
    }
    if (text.includes('price sensitive') || (item.summary || '').toUpperCase().includes('PSI')) {
      return 'psi';
    }
    if (text.includes('financial') || text.includes('eps') || text.includes('quarter') || text.includes('half yearly') || text.includes('audited') || text.includes('navps')) {
      return 'earnings';
    }
    if (text.includes('agm') || text.includes('egm') || text.includes('board meeting') || text.includes('corporate declaration')) {
      return 'agm';
    }
    return 'general';
  };

  // Filtered view by active filters
  const filteredNews = useMemo(() => {
    return portfolioNews.filter((item) => {
      const itemCode = (item.code || '').trim().toUpperCase();

      // Holding filter
      if (selectedHolding !== 'all' && itemCode !== selectedHolding && !item.summary.toUpperCase().startsWith(selectedHolding)) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const cat = getCategory(item);
        if (cat !== categoryFilter) return false;
      }

      return true;
    });
  }, [portfolioNews, selectedHolding, categoryFilter]);

  // Category counts for quick badges
  const categoryCounts = useMemo(() => {
    const counts = { dividend: 0, psi: 0, earnings: 0, agm: 0 };
    for (const item of portfolioNews) {
      const cat = getCategory(item);
      if (cat in counts) {
        counts[cat as keyof typeof counts]++;
      }
    }
    return counts;
  }, [portfolioNews]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // If user portfolio is empty
  if (ownedSymbols.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#161B22] p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <Radio className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            Portfolio News Radar is Ready
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            You currently have 0 stock holdings. Place your first buy order on the trading terminal to start receiving real-time dividend, PSI, and earnings radar alerts.
          </p>
        </div>
        <Link
          href="/trade/order"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all"
        >
          <Briefcase className="w-4 h-4" /> Place an Order
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Radar Status & Metrics Card */}
      <div className="rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-white to-amber-500/[0.04] dark:from-amber-500/[0.12] dark:via-[#161D27] dark:to-[#111620] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-200/50 dark:border-amber-800/40">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                  Portfolio News Radar
                </h2>
                <BossBadge size="xs" interactive={false} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Monitoring <strong className="text-gray-900 dark:text-white font-mono">{ownedSymbols.length}</strong> active stock{ownedSymbols.length === 1 ? '' : 's'} across DSE official disclosures
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchNews}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A2230] border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            <span>{loading ? 'Scanning...' : 'Refresh Radar'}</span>
          </button>
        </div>

        {/* Metric Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-gray-200/60 dark:border-gray-800 text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 block">
              Holdings Matches
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-gray-900 dark:text-white tabular-nums">
              {portfolioNews.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-emerald-500/20 text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 block">
              Dividends & Records
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {categoryCounts.dividend}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-rose-500/20 text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 block">
              PSI Alerts
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {categoryCounts.psi}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#1A2230]/80 border border-blue-500/20 text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 block">
              Quarterly Earnings
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400 tabular-nums">
              {categoryCounts.earnings}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar: Stock Selector & Category Pills */}
      <div className="space-y-2">
        {/* Stock Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setSelectedHolding('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedHolding === 'all'
                ? 'bg-amber-500 text-gray-950 shadow-xs'
                : 'bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            All Holdings ({portfolioNews.length})
          </button>
          {ownedSymbols.map((sym) => {
            const countForSym = portfolioNews.filter(
              (n) => (n.code || '').toUpperCase() === sym || n.summary.toUpperCase().startsWith(sym)
            ).length;

            return (
              <button
                key={sym}
                type="button"
                onClick={() => setSelectedHolding(sym)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all ${
                  selectedHolding === sym
                    ? 'bg-amber-500 text-gray-950 shadow-xs'
                    : 'bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {sym} {countForSym > 0 ? `(${countForSym})` : ''}
              </button>
            );
          })}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {(
            [
              { key: 'all', label: 'All Disclosures' },
              { key: 'dividend', label: `Dividends (${categoryCounts.dividend})` },
              { key: 'psi', label: `PSI Alerts (${categoryCounts.psi})` },
              { key: 'earnings', label: `Earnings (${categoryCounts.earnings})` },
              { key: 'agm', label: `AGM (${categoryCounts.agm})` },
            ] as const
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategoryFilter(c.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                categoryFilter === c.key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xs'
                  : 'bg-gray-100 dark:bg-[#1A2230] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disclosures Feed List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 animate-pulse space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800/60 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800/40 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#161B22] border border-rose-200 dark:border-rose-900/40 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{error}</p>
          <button
            type="button"
            onClick={fetchNews}
            className="px-4 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100"
          >
            Retry Radar
          </button>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#161B22] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Radar Clear: No active disclosures for selected filter
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              None of your monitored holdings have unread disclosures under the current filter in the official exchange feed.
            </p>
          </div>
          {selectedHolding !== 'all' || categoryFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedHolding('all');
                setCategoryFilter('all');
              }}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNews.map((item) => {
            const cat = getCategory(item);
            const isExpanded = expandedIds.has(item.id);
            const code = item.code || '';
            const stock = stockBySymbol.get(code);
            const companyName = item.name || DSE_COMPANY_NAMES[code] || stock?.sector;

            return (
              <article
                key={item.id}
                className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-3"
              >
                {/* Header: Code, Badges, Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stocks/${code.toLowerCase()}`}
                      className="inline-flex items-center gap-1 font-mono font-black text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {code}
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </Link>

                    {companyName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] hidden sm:inline">
                        {companyName}
                      </span>
                    )}

                    {/* Category Tag */}
                    {cat === 'dividend' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Dividend & Record Date
                      </span>
                    )}
                    {cat === 'psi' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        PSI Alert
                      </span>
                    )}
                    {cat === 'earnings' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        Financials & EPS
                      </span>
                    )}
                    {cat === 'agm' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        AGM / Corporate
                      </span>
                    )}
                    {cat === 'general' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Disclosure
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 shrink-0">
                    {item.date || item.filedAt} {item.time ? `• ${item.time}` : ''}
                  </span>
                </div>

                {/* Headline Summary */}
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug break-words">
                  {item.summary}
                </h3>

                {/* Disclosure Body */}
                {item.body && (
                  <div className="space-y-1.5">
                    <p
                      className={`text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans ${
                        isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'
                      }`}
                    >
                      {item.body}
                    </p>
                    {item.body.length > 120 && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                      >
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Read Full Filing <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Footer Quick Actions */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {stock?.ltp ? (
                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        LTP ৳{stock.ltp.toFixed(1)}
                      </span>
                    ) : null}
                    {stock?.changePercent !== undefined ? (
                      <span
                        className={`text-xs font-mono font-bold ${
                          stock.changePercent > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : stock.changePercent < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {stock.changePercent > 0 ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/stocks/${code.toLowerCase()}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1E2633] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      View Chart
                    </Link>
                    {onTrade && (
                      <button
                        type="button"
                        onClick={() => onTrade(code, 'buy')}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-95 transition-all"
                      >
                        Trade {code}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
