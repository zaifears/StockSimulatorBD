// app/admin/seo/search/bing/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  Globe,
  Search,
  MessageSquare,
  Key,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Link2,
  RefreshCw,
} from 'lucide-react';

export default function BingWebmasterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/bing');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load Bing Webmaster data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setSyncing(true);
    setConfigSuccess(null);
    setConfigError(null);

    try {
      const res = await fetchWithToken('/api/admin/seo/bing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save API key');

      setConfigSuccess('Bing Webmaster API connected successfully!');
      setShowConfigModal(false);
      loadData();
    } catch (err: any) {
      setConfigError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Loading Bing Webmaster Intelligence...</span>
      </div>
    );
  }

  const isConnected = data?.config?.connected;
  const summary = data?.summary || { totalClicks: 0, totalImpressions: 0, avgCtr: 0, chatClicks: 0, chatImpressions: 0, pagesInIndex: 0, inboundLinks: 0 };
  const gscData = data?.gsc || { connected: false, clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const queries = data?.queries || [];
  const crawl = data?.crawl || [];
  const backlinks = data?.backlinks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Globe className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Microsoft Bing Webmaster Intelligence
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Direct integration with Microsoft Bing Webmaster REST API. Monitors multi-vertical rankings, crawl health, backlink graphs, and Bing Chat conversational search traffic.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all inline-flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>{isConnected ? 'API Key Configured' : 'Connect API Key'}</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 transition-colors"
            title="Refresh Bing Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google vs Bing Side-by-Side Comparison */}
      <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          Search Engines Head-to-Head Comparison
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Search Console Box */}
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-600" /> Google Search Console
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                gscData.connected
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40'
                  : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
              }`}>
                {gscData.connected ? 'Connected via OAuth' : 'Not Connected'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <div className="text-[11px] text-gray-500">Google Clicks</div>
                <div className="text-xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
                  {gscData.clicks.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Google Impressions</div>
                <div className="text-xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
                  {gscData.impressions.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Avg. CTR</div>
                <div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {gscData.ctr}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Avg. Position</div>
                <div className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                  {gscData.position}
                </div>
              </div>
            </div>
          </div>

          {/* Bing Webmaster Box */}
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" /> Bing Webmaster Tools
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                isConnected
                  ? 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40'
                  : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
              }`}>
                {isConnected ? 'Connected via REST API' : 'Not Connected'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <div className="text-[11px] text-gray-500">Bing Clicks</div>
                <div className="text-xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
                  {summary.totalClicks.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Bing Impressions</div>
                <div className="text-xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
                  {summary.totalImpressions.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Avg. CTR</div>
                <div className="text-xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400">
                  {summary.avgCtr}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-500">Indexed Pages</div>
                <div className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                  {summary.pagesInIndex ? summary.pagesInIndex.toLocaleString() : (summary.chatClicks || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Bing Queries & Crawl Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queries Table */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-teal-500" />
              Bing Search Queries ({queries.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Search Query</th>
                  <th className="py-3 px-4 text-right">Clicks</th>
                  <th className="py-3 px-4 text-right">Imp.</th>
                  <th className="py-3 px-4 text-right">CTR</th>
                  <th className="py-3 px-4 text-right">Pos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {queries.map((q: any) => (
                  <tr key={q.query} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white max-w-[200px] truncate">
                      {q.query}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-teal-600 dark:text-teal-400 font-bold">
                      {q.clicks}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-600 dark:text-gray-300">
                      {q.impressions}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-900 dark:text-white">
                      {q.ctr.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-500">
                      {q.position.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crawl Stats Table */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Bingbot Crawl Health ({crawl.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Crawl Date</th>
                  <th className="py-3 px-4 text-right">Crawled</th>
                  <th className="py-3 px-4 text-right">Errors</th>
                  <th className="py-3 px-4 text-right">Robots Blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {crawl.map((c: any) => (
                  <tr key={c.crawlDate} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-900 dark:text-white">
                      {c.crawlDate}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-900 dark:text-white font-bold">
                      {c.pagesCrawled}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className={c.crawlErrors > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                        {c.crawlErrors}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-500">
                      {c.blockedByRobots}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bing External Backlinks */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-blue-500" />
            External Backlinks Discovered by Bing ({backlinks.length})
          </h3>
          <span className="text-[10px] text-gray-400">External Evidence vs. Internal Page Authority</span>
        </div>

        {backlinks.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            {summary.inboundLinks
              ? `Bingbot detects ${summary.inboundLinks} external inbound link references to verified pages in its index.`
              : 'No external backlink URLs currently reported by Bing Webmaster API.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Referring Source URL</th>
                  <th className="py-3 px-4">Target Landing Page</th>
                  <th className="py-3 px-4">Anchor Text</th>
                  <th className="py-3 px-4 text-right">Discovered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {backlinks.map((b: any) => (
                  <tr key={b.url} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400 max-w-[280px] truncate">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <span>{b.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">{b.targetPage}</td>
                    <td className="py-3 px-4 text-gray-500 italic">&ldquo;{b.anchorText || 'N/A'}&rdquo;</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-400 text-[11px]">{b.discoveredDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                Configure Bing Webmaster API
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Generate your 32-character API key in Bing Webmaster Tools under <strong>Settings &rarr; API Access &rarr; Webmaster API</strong>. It provides continuous background sync with $0 spend.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Bing Webmaster API Key
                </label>
                <input
                  type="password"
                  placeholder="Paste your 32-character API key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {configError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{configError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing || !apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {syncing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save &amp; Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
