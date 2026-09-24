'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Percent, TrendingUp, PieChart, Calendar, Award, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export interface CompanyFundamentals {
  code: string;
  name?: string;
  sector?: string;
  category?: string;
  price?: number;
  pe?: number;
  eps?: number;
  nav?: number;
  marketCap?: number;
  paidUpCapital?: number;
  authorizedCapital?: number;
  dividendYield?: number;
  weekHigh52?: number;
  weekLow52?: number;
  listingYear?: number;
  sharePattern?: Array<{
    date: string;
    pattern: {
      sponsor?: number;
      government?: number;
      institution?: number;
      foreign?: number;
      public?: number;
    };
  }>;
  dividendHistory?: Array<{
    year: number;
    cash?: number;
    stock?: number;
    yieldPct?: number;
  }>;
}

interface Props {
  symbol: string;
  currentPrice?: number;
}

export default function CompanyFundamentalsCard({ symbol, currentPrice }: Props) {
  const [data, setData] = useState<CompanyFundamentals | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllDividends, setShowAllDividends] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadFundamentals() {
      try {
        const res = await fetch(`/api/fundamentals/${encodeURIComponent(symbol.toUpperCase())}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) {
            setData(json);
            setLoading(false);
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (e) {
        if (mounted) setLoading(false);
      }
    }

    loadFundamentals();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-5 sm:p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Active LTP: prefer live prop, fallback to scraped price
  const activeLtp = currentPrice || data.price;
  const high52 = data.weekHigh52;
  const low52 = data.weekLow52;

  // Calculate 52-week position percentage (0 to 100)
  let range52Pct = 50;
  if (activeLtp && high52 && low52 && high52 > low52) {
    const raw = ((activeLtp - low52) / (high52 - low52)) * 100;
    range52Pct = Math.max(0, Math.min(100, raw));
  }

  // Latest shareholding pattern
  const latestShare = data.sharePattern && data.sharePattern.length > 0 ? data.sharePattern[data.sharePattern.length - 1] : null;
  const p = latestShare?.pattern;

  // Dividend history
  const dividends = data.dividendHistory || [];
  const visibleDividends = showAllDividends ? dividends : dividends.slice(0, 4);

  return (
    <section
      aria-labelledby="fundamentals-heading"
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-5 sm:p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
        <div>
          <h2 id="fundamentals-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            Company Fundamentals & Valuation
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audited financial ratios and DSE exchange disclosures for {symbol}
          </p>
        </div>
        {data.listingYear && (
          <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
            Listed {data.listingYear}
          </span>
        )}
      </div>

      {/* ── 1. Valuation Ratios Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151921] border border-gray-100 dark:border-gray-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            P/E (Audited)
          </span>
          <span className="text-lg font-black font-mono tabular-nums text-gray-900 dark:text-white mt-1 block">
            {data.pe ? data.pe.toFixed(2) : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151921] border border-gray-100 dark:border-gray-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            Annual EPS
          </span>
          <span className="text-lg font-black font-mono tabular-nums text-gray-900 dark:text-white mt-1 block">
            {data.eps != null ? `৳${data.eps.toFixed(2)}` : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151921] border border-gray-100 dark:border-gray-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            NAVPS (Book Value)
          </span>
          <span className="text-lg font-black font-mono tabular-nums text-gray-900 dark:text-white mt-1 block">
            {data.nav != null ? `৳${data.nav.toFixed(2)}` : '—'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151921] border border-gray-100 dark:border-gray-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
            Dividend Yield
          </span>
          <span className="text-lg font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
            {data.dividendYield != null ? `${data.dividendYield.toFixed(2)}%` : '—'}
          </span>
        </div>
      </div>

      {/* ── 2. 52-Week Range Spectrum ──────────────────────────────────────── */}
      {high52 != null && low52 != null && (
        <div className="space-y-2 p-4 rounded-xl bg-gray-50/70 dark:bg-[#151921]/60 border border-gray-100 dark:border-gray-800/60">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
              52-Week Trading Range
            </span>
            {activeLtp && (
              <span className="font-mono text-gray-600 dark:text-gray-400 font-semibold">
                Current: <strong className="text-gray-900 dark:text-white font-bold">৳{activeLtp.toFixed(1)}</strong>
              </span>
            )}
          </div>

          <div className="relative h-5 flex items-center">
            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            {/* Range Pinpoint Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-gray-900 shadow-md transition-all duration-300"
              style={{ left: `${range52Pct}%` }}
              title={`LTP: ৳${activeLtp?.toFixed(1)} (${range52Pct.toFixed(0)}% of 52W range)`}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400">
            <span>52W Low: ৳{low52.toFixed(1)}</span>
            <span>52W High: ৳{high52.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* ── 3. Shareholding Pattern Breakdown ─────────────────────────────── */}
      {p && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-blue-500" />
              Shareholding Pattern
            </span>
            {latestShare?.date && (
              <span className="text-[11px] text-gray-400 font-mono">
                {latestShare.date}
              </span>
            )}
          </div>

          {/* Segmented Shareholding Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            {p.sponsor != null && p.sponsor > 0 && (
              <div style={{ width: `${p.sponsor}%` }} className="bg-blue-600" title={`Sponsor/Director: ${p.sponsor}%`} />
            )}
            {p.institution != null && p.institution > 0 && (
              <div style={{ width: `${p.institution}%` }} className="bg-indigo-500" title={`Institute: ${p.institution}%`} />
            )}
            {p.government != null && p.government > 0 && (
              <div style={{ width: `${p.government}%` }} className="bg-emerald-500" title={`Govt: ${p.government}%`} />
            )}
            {p.foreign != null && p.foreign > 0 && (
              <div style={{ width: `${p.foreign}%` }} className="bg-amber-400" title={`Foreign: ${p.foreign}%`} />
            )}
            {p.public != null && p.public > 0 && (
              <div style={{ width: `${p.public}%` }} className="bg-purple-500" title={`Public: ${p.public}%`} />
            )}
          </div>

          {/* Shareholding Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {p.sponsor != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Sponsor:</span>
                <strong className="font-mono text-gray-900 dark:text-gray-100">{p.sponsor}%</strong>
              </div>
            )}
            {p.institution != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Institute:</span>
                <strong className="font-mono text-gray-900 dark:text-gray-100">{p.institution}%</strong>
              </div>
            )}
            {p.government != null && p.government > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Govt:</span>
                <strong className="font-mono text-gray-900 dark:text-gray-100">{p.government}%</strong>
              </div>
            )}
            {p.foreign != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Foreign:</span>
                <strong className="font-mono text-gray-900 dark:text-gray-100">{p.foreign}%</strong>
              </div>
            )}
            {p.public != null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Public:</span>
                <strong className="font-mono text-gray-900 dark:text-gray-100">{p.public}%</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Dividend Payout History ────────────────────────────────────── */}
      {dividends.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              Historical Dividend Declarations
            </span>
            {dividends.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllDividends(!showAllDividends)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1 px-2 -mr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 font-semibold"
              >
                {showAllDividends ? (
                  <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>View all ({dividends.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {visibleDividends.map((d) => (
              <div
                key={d.year}
                className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#151921] border border-gray-100 dark:border-gray-800 text-xs"
              >
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span className="font-bold">{d.year}</span>
                  {d.yieldPct != null && d.yieldPct > 0 && (
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {d.yieldPct.toFixed(1)}% yield
                    </span>
                  )}
                </div>
                <div className="mt-1 font-mono font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm leading-snug">
                  {d.cash != null && d.cash > 0 ? `${d.cash}% Cash` : ''}
                  {d.stock != null && d.stock > 0 ? ` + ${d.stock}% Stock` : ''}
                  {(!d.cash && !d.stock) ? 'No Dividend' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
