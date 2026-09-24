'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, BellRing, Crown, ExternalLink, ShieldAlert, Sparkles, Clock } from 'lucide-react';

interface NewsItem {
  id: string;
  code: string;
  name?: string;
  type?: string;
  date?: string;
  time?: string;
  summary: string;
  body?: string;
  filedAt?: string;
}

interface Props {
  symbol: string;
  isBoss?: boolean;
}

export default function StockNewsSection({ symbol, isBoss }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadNews() {
      try {
        const res = await fetch(`/api/market-news?symbol=${encodeURIComponent(symbol.toUpperCase())}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) {
            setNews(json.news || []);
            setLoading(false);
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }

    loadNews();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  return (
    <section
      aria-labelledby="news-heading"
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-4">
        <div>
          <h2 id="news-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-500" />
            Corporate Disclosures & DSE News
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Official Price Sensitive Information (PSI) and filings for {symbol}
          </p>
        </div>

        {isBoss ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5 fill-current text-amber-500" />
            Boss Radar Active
          </span>
        ) : (
          <Link
            href="/boss"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Boss News Perks
          </Link>
        )}
      </div>

      {/* ── Boss Tier Portfolio News Callout ──────────────────────────────── */}
      {!isBoss && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/[0.07] via-yellow-500/[0.05] to-amber-500/[0.07] border border-amber-500/25 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <Crown className="w-4 h-4 fill-current" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-bold text-gray-900 dark:text-gray-100">
              Hold {symbol} in your portfolio?
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Boss Tier subscribers get access to the <strong>Portfolio News Radar</strong>, automatically scanning all active holdings and highlighting critical dividend declarations and PSI updates.
            </p>
            <Link
              href="/boss"
              className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline pt-0.5"
            >
              Upgrade to Boss (৳20/mo) <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── News Feed ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-[#151921] animate-pulse space-y-2">
              <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl bg-gray-50/50 dark:bg-[#151921]/50 border border-dashed border-gray-200 dark:border-gray-800">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            No recent disclosures filed for {symbol}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Official exchange announcements, board meetings, and quarterly reports will appear here as soon as they are disclosed by DSE.
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-3.5">
          {news.map((item) => {
            const isPsi = item.type?.toLowerCase().includes('price sensitive') || item.summary.includes('PSI');
            const isDiv = item.type?.toLowerCase().includes('dividend') || item.summary.toLowerCase().includes('dividend');

            return (
              <article
                key={item.id}
                className="p-3.5 sm:p-4 rounded-xl bg-gray-50/70 dark:bg-[#151921]/70 border border-gray-100 dark:border-gray-800/80 hover:border-gray-200 dark:hover:border-gray-700 transition-colors space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {isPsi && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        PSI
                      </span>
                    )}
                    {isDiv && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Dividend
                      </span>
                    )}
                    {!isPsi && !isDiv && item.type && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {item.type}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-gray-400">
                      {item.date || item.filedAt} {item.time ? `at ${item.time}` : ''}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug break-words">
                  {item.summary}
                </h3>

                {item.body && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-1.5 border-t border-gray-100 dark:border-gray-800/50 break-words">
                    {item.body}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
