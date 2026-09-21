// app/admin/seo/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Bot,
  ArrowRightLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function SeoOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchOverview = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetchWithToken('/api/admin/seo/overview');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch SEO overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleTriggerCrawl = async () => {
    setCrawlLoading(true);
    setNotice(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 15 }),
      });
      const json = await res.json();
      if (json.success) {
        const count = json.batchCrawled ?? json.processedCount ?? 0;
        setNotice(`✅ Successfully crawled ${count} pages. Authority & opportunities updated!`);
        fetchOverview();
      } else {
        setNotice(`⚠️ Crawl issue: ${json.error}`);
      }
    } catch (err: any) {
      setNotice(`❌ Error triggering crawl: ${err.message}`);
    } finally {
      setCrawlLoading(false);
    }
  };

  const handleSyncGsc = async () => {
    setRefreshing(true);
    try {
      const res = await fetchWithToken('/api/admin/seo/gsc/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setNotice(`✅ Synced ${json.syncedQueriesCount} Search Console query snapshots from ${json.propertyUrl || 'Google'}!`);
        fetchOverview();
      } else {
        setNotice(`❌ GSC sync failed: ${json.error}`);
      }
    } catch (err: any) {
      setNotice(`❌ GSC sync error: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading Search Intelligence...</p>
      </div>
    );
  }

  const { search, technical, content, aiGeo, migration, topActions } = data || {};

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            How is StockSimulatorBD doing in search & AI discovery?
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Empirical metrics from Google Search Console, internal crawler, and AI query labs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleTriggerCrawl}
            disabled={crawlLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/25 transition-all active:scale-95"
          >
            <Zap className={`w-3.5 h-3.5 ${crawlLoading ? 'animate-spin' : ''}`} />
            Run Batch Crawl
          </button>
          <button
            onClick={handleSyncGsc}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all active:scale-95"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Sync GSC
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-xs font-bold ml-2">✕</button>
        </div>
      )}

      {/* SEO HEALTH 5-CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. Google Search */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Google Search</span>
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Clicks:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{search?.clicks?.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Impressions:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{search?.impressions?.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg CTR:</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400">{search?.ctr}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg Position:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{search?.avgPosition}</strong>
            </div>
          </div>
          <Link href="/admin/seo/search" className="mt-3 block text-[11px] font-bold text-blue-500 hover:underline">
            View Search Console →
          </Link>
        </div>

        {/* 2. Technical */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Technical</span>
            <FileCheck2 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Indexed Pages:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{technical?.indexedPages}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Crawlable:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{technical?.crawlablePages}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Technical Issues:</span>
              <strong className="font-mono text-amber-500">{technical?.technicalIssues}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Critical Defects:</span>
              <strong className="font-mono text-red-500">{technical?.criticalIssues}</strong>
            </div>
          </div>
          <Link href="/admin/seo/pages" className="mt-3 block text-[11px] font-bold text-blue-500 hover:underline">
            Inspect Pages & Schema →
          </Link>
        </div>

        {/* 3. Content */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Content</span>
            <Sparkles className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Opportunity Queries:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{content?.opportunityQueries}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pages Needing Work:</span>
              <strong className="font-mono text-amber-500">{content?.pagesNeedingWork}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Orphan Pages:</span>
              <strong className="font-mono text-red-500">{content?.orphanPages}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Median Word Count:</span>
              <strong className="font-mono text-gray-900 dark:text-white">~680</strong>
            </div>
          </div>
          <Link href="/admin/seo/authority" className="mt-3 block text-[11px] font-bold text-blue-500 hover:underline">
            Review Internal Links →
          </Link>
        </div>

        {/* 4. AI / GEO */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">AI / GEO Discovery</span>
            <Bot className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Queries Tested:</span>
              <strong className="font-mono text-gray-900 dark:text-white">{aiGeo?.queriesTested}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Brand Mentioned:</span>
              <strong className="font-mono text-emerald-500">{aiGeo?.mentioned}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">URL Cited:</span>
              <strong className="font-mono text-blue-500">{aiGeo?.cited}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Citation Gaps:</span>
              <strong className="font-mono text-amber-500">{aiGeo?.citationGaps}</strong>
            </div>
          </div>
          <Link href="/admin/seo/ai-geo" className="mt-3 block text-[11px] font-bold text-blue-500 hover:underline">
            Open AI Query Lab →
          </Link>
        </div>

        {/* 5. Migration */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Domain Migration</span>
            <ArrowRightLeft className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Target Origin:</span>
              <span className="truncate max-w-[120px] font-mono font-medium text-gray-800 dark:text-gray-200">shahoriar.bd</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Target Readiness:</span>
              <strong className="font-mono text-emerald-500">READY</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shadow Mode:</span>
              <strong className="font-mono text-blue-400">ACTIVE</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">301 Redirects:</span>
              <strong className="font-mono text-gray-500">Pre-Cutover</strong>
            </div>
          </div>
          <Link href="/admin/seo/migration" className="mt-3 block text-[11px] font-bold text-blue-500 hover:underline">
            Manage Migration →
          </Link>
        </div>
      </div>

      {/* TOP ACTIONS LIST (High-Leverage Next Steps) */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Prioritized Actions (High Impact, Evidence-Backed)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clear actions generated from actual GSC impressions, internal link authority, and AI observations.
            </p>
          </div>
          <Link
            href="/admin/seo/recommendations"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span>All Recommendations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {topActions && topActions.length > 0 ? (
            topActions.map((action: any, idx: number) => (
              <div
                key={action.id || idx}
                className="p-4 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {action.title}
                    </h4>
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                      action.priority === 'high' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {action.priority} priority
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {action.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 pl-7">
                    {action.suggestedAction}
                  </p>
                  {action.evidence?.impressions && (
                    <p className="text-[11px] text-gray-400 pl-7 font-mono">
                      Evidence: {action.evidence.impressions.toLocaleString()} impressions • Position {action.evidence.position} • CTR {action.evidence.ctr}%
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Link
                    href={`/admin/seo/recommendations?id=${action.id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-gray-500">
              No pending actions. Trigger a batch crawl or sync GSC to scan for new opportunities.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
