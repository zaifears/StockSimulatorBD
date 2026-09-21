// app/admin/seo/pages/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  FileCode2,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Edit3,
  Gauge,
  Code2,
  RefreshCw,
  Zap,
  Activity,
} from 'lucide-react';
import { SeoPageProfile } from '@/lib/seo/types';

export default function PagesAuditPage() {
  const [pages, setPages] = useState<SeoPageProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<SeoPageProfile | null>(null);

  // Inspector states
  const [psiLoading, setPsiLoading] = useState(false);
  const [psiResult, setPsiResult] = useState<any>(null);
  const [w3cLoading, setW3cLoading] = useState(false);
  const [w3cResult, setW3cResult] = useState<any>(null);
  const [cruxResult, setCruxResult] = useState<any>(null);

  // Override editing
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);

  // Crawl runner state
  const [crawling, setCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{
    percent: number;
    processed: number;
    total: number;
    completed: boolean;
  } | null>(null);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  const fetchPages = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/crawl');
      const json = await res.json();
      if (json.success) {
        setPages(json.pages || []);
      }
    } catch (err) {
      console.error('Failed to load crawled pages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fires sequential batch POST requests until the crawl is complete.
  // Each batch crawls 20 URLs; the API tracks cursor position in Firestore.
  const runCrawl = async (fresh = false) => {
    setCrawling(true);
    setCrawlError(null);
    setCrawlProgress(null);

    try {
      let completed = false;
      // First request: start fresh or resume
      let res = await fetchWithToken('/api/admin/seo/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: fresh ? 'start_fresh' : 'next_batch', batchSize: 20 }),
      });
      let json = await res.json();

      if (!json.success) throw new Error(json.error || 'Crawl failed');

      setCrawlProgress({
        percent: json.percent ?? 0,
        processed: json.processedCount ?? 0,
        total: json.totalUrls ?? 0,
        completed: !!json.completed,
      });
      completed = !!json.completed;

      // Continue firing batches until done
      while (!completed) {
        res = await fetchWithToken('/api/admin/seo/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'next_batch', batchSize: 20 }),
        });
        json = await res.json();
        if (!json.success) throw new Error(json.error || 'Batch failed');

        setCrawlProgress({
          percent: json.percent ?? 100,
          processed: json.processedCount ?? 0,
          total: json.totalUrls ?? 0,
          completed: !!json.completed,
        });
        completed = !!json.completed;
      }

      // Reload page data after crawl finishes
      await fetchPages();
    } catch (err: any) {
      setCrawlError(err.message || 'Unknown crawl error');
    } finally {
      setCrawling(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const openInspector = (page: SeoPageProfile) => {
    setSelectedPage(page);
    setEditTitle(page.title || '');
    setEditDesc(page.description || '');
    setPsiResult(null);
    setW3cResult(null);
    setOverrideNotice(null);
  };

  const runPageSpeedAudit = async (url: string) => {
    setPsiLoading(true);
    try {
      const res = await fetchWithToken(`/api/admin/seo/pagespeed?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.success) {
        setPsiResult(json);
      }
    } catch (err) {
      console.error('PSI Error:', err);
    } finally {
      setPsiLoading(false);
    }
  };

  const runW3cValidation = async (url: string) => {
    setW3cLoading(true);
    try {
      const res = await fetchWithToken(`/api/admin/seo/w3c?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.success) {
        setW3cResult(json);
      }
    } catch (err) {
      console.error('W3C Error:', err);
    } finally {
      setW3cLoading(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedPage) return;
    setSavingOverride(true);
    setOverrideNotice(null);

    try {
      const res = await fetchWithToken('/api/admin/seo/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_override',
          path: selectedPage.path,
          title: editTitle,
          description: editDesc,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOverrideNotice('✅ Safe metadata override applied and IndexNow notified!');
        setSelectedPage((prev) => (prev ? { ...prev, title: editTitle, description: editDesc } : null));
        fetchPages();
      } else {
        setOverrideNotice(`⚠️ Error: ${json.error}`);
      }
    } catch (err: any) {
      setOverrideNotice(`❌ Override failed: ${err.message}`);
    } finally {
      setSavingOverride(false);
    }
  };

  const filteredPages = pages.filter((p) => {
    const titleText = (p.title || '').toLowerCase();
    const matchesSearch = p.path.toLowerCase().includes(filter.toLowerCase()) || titleText.includes(filter.toLowerCase());
    const matchesType = typeFilter === 'all' || p.pageType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-blue-500" />
              Page Inventory &amp; Technical Audit
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Full site inventory, schema validation, metadata lengths, and technical health inspection.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {pages.length} pages
            </span>
            {pages.length > 0 && !crawling && (
              <button
                onClick={() => runCrawl(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                  bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Crawl
              </button>
            )}
            <button
              onClick={() => runCrawl(true)}
              disabled={crawling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                bg-blue-600 hover:bg-blue-700 text-white shadow-xs
                disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Zap className={`w-3.5 h-3.5 ${crawling ? 'animate-pulse' : ''}`} />
              {crawling ? 'Crawling…' : pages.length === 0 ? 'Run Crawl' : 'Re-crawl All'}
            </button>
          </div>
        </div>

        {/* Live progress bar */}
        {crawling && crawlProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>{crawlProgress.processed} / {crawlProgress.total} pages</span>
              <span>{crawlProgress.percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${crawlProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Crawl complete notice */}
        {!crawling && crawlProgress?.completed && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Crawl complete — {crawlProgress.processed} pages indexed
          </div>
        )}

        {/* Error banner */}
        {crawlError && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            {crawlError}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111622] p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'home', 'stock', 'blog', 'guide', 'boss'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                typeFilter === t ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search path or title..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Page Path</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Schema</th>
                <th className="py-3 px-4">Words</th>
                <th className="py-3 px-4">Authority</th>
                <th className="py-3 px-4">Issues</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {filteredPages.map((page) => {
                const criticalCount = page.issues?.filter((i) => i.type === 'critical').length || 0;
                const warningCount = page.issues?.filter((i) => i.type === 'warning').length || 0;

                return (
                  <tr key={page.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                      {page.path}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {page.pageType}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="truncate font-semibold text-gray-900 dark:text-white" title={page.title}>
                        {page.title || <span className="text-red-500">Missing Title</span>}
                      </div>
                      <div className="truncate text-[11px] text-gray-400" title={page.description}>
                        {page.description || <span className="text-red-500">Missing Description</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {page.schemaTypes && page.schemaTypes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {page.schemaTypes.map((st, i) => (
                            <span key={i} className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-sm">
                              {st}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{page.wordCount || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        page.authorityTier === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500' :
                        page.authorityTier === 'ORPHAN' ? 'bg-red-500/10 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {page.internalAuthorityScore || 50} ({page.authorityTier || 'MED'})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {criticalCount > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-500">
                          {criticalCount} Critical
                        </span>
                      ) : warningCount > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-500">
                          {warningCount} Warnings
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-bold">Passed</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openInspector(page)}
                        className="text-xs font-bold text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Page Inspector Modal */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-blue-500" />
                  Page Inspector: {selectedPage.path}
                </h3>
                <span className="text-xs text-gray-400 font-mono">{selectedPage.url}</span>
              </div>
              <button
                onClick={() => setSelectedPage(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick Test Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => runPageSpeedAudit(selectedPage.url)}
                disabled={psiLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Gauge className={`w-3.5 h-3.5 ${psiLoading ? 'animate-spin' : 'text-blue-500'}`} />
                Run PageSpeed Audit ($0)
              </button>
              <button
                onClick={() => runW3cValidation(selectedPage.url)}
                disabled={w3cLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Code2 className={`w-3.5 h-3.5 ${w3cLoading ? 'animate-spin' : 'text-purple-500'}`} />
                W3C HTML Validate ($0)
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetchWithToken(`/api/admin/seo/crux?path=${encodeURIComponent(selectedPage.path)}`);
                    const json = await res.json();
                    if (json.success) setCruxResult(json.data);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800 hover:bg-teal-100 transition-colors inline-flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-teal-500" />
                CrUX Field Data (Real Users)
              </button>
            </div>

            {/* CrUX Real-User Field Data */}
            {cruxResult && (
              <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-600" /> Chrome UX Report (CrUX) Field Data
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                    {cruxResult.overallStatus}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">{cruxResult.collectionPeriod}</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 font-mono text-center pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm font-bold text-emerald-600">{(cruxResult.lcp.p75 / 1000).toFixed(2)}s</div>
                    <div className="text-[10px] text-gray-400">LCP (p75)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm font-bold text-blue-600">{cruxResult.inp.p75}ms</div>
                    <div className="text-[10px] text-gray-400">INP (p75)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm font-bold text-purple-600">{cruxResult.cls.p75}</div>
                    <div className="text-[10px] text-gray-400">CLS (p75)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{(cruxResult.fcp.p75 / 1000).toFixed(2)}s</div>
                    <div className="text-[10px] text-gray-400">FCP</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#161D2A] border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{cruxResult.ttfb.p75}ms</div>
                    <div className="text-[10px] text-gray-400">TTFB</div>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnostics Results */}
            {psiResult && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs">
                <div className="font-bold text-blue-800 dark:text-blue-300 mb-2">Google PageSpeed Insights Scores (Lab):</div>
                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                    <div className="text-lg font-black text-emerald-500">{psiResult.scores?.performance}</div>
                    <div className="text-[10px] text-gray-500">Performance</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                    <div className="text-lg font-black text-blue-500">{psiResult.scores?.accessibility}</div>
                    <div className="text-[10px] text-gray-500">Accessibility</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                    <div className="text-lg font-black text-purple-500">{psiResult.scores?.bestPractices}</div>
                    <div className="text-[10px] text-gray-500">Best Practices</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                    <div className="text-lg font-black text-emerald-500">{psiResult.scores?.seo}</div>
                    <div className="text-[10px] text-gray-500">SEO</div>
                  </div>
                </div>
              </div>
            )}

            {w3cResult && (
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-xs">
                <div className="font-bold text-gray-900 dark:text-white mb-1">
                  W3C Validation Status: {w3cResult.valid ? '✅ Valid HTML5' : `⚠️ ${w3cResult.errorsCount} Errors, ${w3cResult.warningsCount} Warnings`}
                </div>
              </div>
            )}

            {/* Metadata Override Form */}
            <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                  Safe Metadata Override
                </h4>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                  Safe Level 1 Change
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500">Page Title ({editTitle.length} chars)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500">Meta Description ({editDesc.length} chars)</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full mt-1 p-2 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium"
                />
              </div>

              {overrideNotice && (
                <div className="p-2.5 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {overrideNotice}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPage(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  disabled={savingOverride}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  {savingOverride ? 'Saving...' : 'Apply Safe Override'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
