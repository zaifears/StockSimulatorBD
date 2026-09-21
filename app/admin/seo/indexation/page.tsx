// app/admin/seo/indexation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { UrlInspectionItem, SitemapIntelligence } from '@/lib/seo/types';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Check,
  ShieldCheck,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function IndexationMonitorPage() {
  const [queue, setQueue] = useState<UrlInspectionItem[]>([]);
  const [sitemap, setSitemap] = useState<SitemapIntelligence | null>(null);
  const [quota, setQuota] = useState({ dailyLimit: 2000, usedToday: 11 });
  const [loading, setLoading] = useState(true);
  const [inspectingPath, setInspectingPath] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<number | 'all'>('all');

  const loadData = async () => {
    try {
      const [queueRes, sitemapRes] = await Promise.all([
        fetchWithToken('/api/admin/seo/inspection'),
        fetchWithToken('/api/admin/seo/sitemaps'),
      ]);

      const qJson = await queueRes.json();
      const sJson = await sitemapRes.json();

      if (qJson.success) {
        setQueue(qJson.queue || []);
        if (qJson.quota) setQuota(qJson.quota);
      }
      if (sJson.success) {
        setSitemap(sJson.report);
      }
    } catch (err) {
      console.error('Failed to load indexation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspect = async (path: string) => {
    setInspectingPath(path);
    try {
      const res = await fetchWithToken('/api/admin/seo/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const json = await res.json();
      if (json.success && json.result) {
        setQueue((prev) =>
          prev.map((item) => (item.path === path ? json.result : item))
        );
        setQuota((prev) => ({ ...prev, usedToday: prev.usedToday + 1 }));
      }
    } catch (err) {
      console.error('Failed to inspect URL:', err);
    } finally {
      setInspectingPath(null);
    }
  };

  const filteredQueue = filterTier === 'all' ? queue : queue.filter((q) => q.priority === filterTier);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Loading Indexation Monitor &amp; Sitemap Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Search className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Google Indexation &amp; Sitemap Intelligence
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            3-Tier prioritized indexation queue backed by Google URL Inspection API. Manages the 2,000 inspections/day quota and audits sitemap discrepancies.
          </p>
        </div>

        {/* Quota Gauge */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Daily Inspection Quota
          </div>
          <div className="text-sm font-black font-mono tabular-nums text-gray-900 dark:text-white mt-0.5">
            <span className="text-blue-600 dark:text-blue-400">{quota.usedToday}</span> / {quota.dailyLimit}
          </div>
          <div className="text-[10px] text-gray-500">Resets every 24h</div>
        </div>
      </div>

      {/* Sitemap Intelligence Section */}
      {sitemap && (
        <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                Sitemap Intelligence ({sitemap.sitemapUrl})
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                sitemap.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {sitemap.status}
              </span>
              <span className="text-gray-400 text-[11px]">
                Last Downloaded: {new Date(sitemap.lastDownloadedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A]">
              <div className="text-[10px] font-bold text-gray-400 uppercase">URLs in Sitemap</div>
              <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                {sitemap.totalUrlsInSitemap}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A]">
              <div className="text-[10px] font-bold text-gray-400 uppercase">URLs Crawled</div>
              <div className="text-base font-bold font-mono text-gray-900 dark:text-white mt-1">
                {sitemap.totalUrlsCrawled}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A]">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Errors</div>
              <div className={`text-base font-bold font-mono mt-1 ${sitemap.errorsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {sitemap.errorsCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A]">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Warnings</div>
              <div className={`text-base font-bold font-mono mt-1 ${sitemap.warningsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {sitemap.warningsCount}
              </div>
            </div>
          </div>

          {/* Discrepancies Alerts */}
          {sitemap.discrepancies.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Detected Indexing Discrepancies ({sitemap.discrepancies.length})</span>
              </div>
              <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                {sitemap.discrepancies.map((disc) => (
                  <div key={disc.id} className="flex items-start gap-2">
                    <span className="font-mono text-gray-400">•</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">{disc.url}:</span>
                    <span>{disc.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero sitemap discrepancies detected. All sitemap URLs are healthy and linked internally.</span>
            </div>
          )}
        </div>
      )}

      {/* Priority Queue Filters & Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">
              3-Tier Priority Queue ({filteredQueue.length} URLs)
            </h3>
          </div>

          {/* Tier Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTier === 'all' ? 'bg-white dark:bg-[#111622] text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTier(1)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTier === 1 ? 'bg-white dark:bg-[#111622] text-blue-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              P1 High
            </button>
            <button
              onClick={() => setFilterTier(2)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTier === 2 ? 'bg-white dark:bg-[#111622] text-indigo-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              P2 Evergreen
            </button>
            <button
              onClick={() => setFilterTier(3)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterTier === 3 ? 'bg-white dark:bg-[#111622] text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              P3 Inventory
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">URL Path</th>
                <th className="py-3 px-4 text-center">Google Indexed?</th>
                <th className="py-3 px-4">Last Crawl</th>
                <th className="py-3 px-4">Google Canonical</th>
                <th className="py-3 px-4 text-center">Mobile</th>
                <th className="py-3 px-4">Rich Results</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      item.priority === 1
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : item.priority === 2
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      P{item.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white max-w-[180px] truncate">
                    {item.path}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.googleIndexed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> Not Indexed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                    {item.lastCrawlTime ? new Date(item.lastCrawlTime).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-[11px] max-w-[160px] truncate">
                    {item.googleCanonical ? item.googleCanonical.replace(/^https?:\/\/[^/]+/, '') || '/' : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.mobileUsable ? (
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-rose-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-[11px]">
                    {item.richResultsStatus || 'Valid'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleInspect(item.path)}
                      disabled={inspectingPath === item.path}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      {inspectingPath === item.path ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
