// app/admin/seo/search/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { Search, TrendingUp, Filter, RefreshCw, ArrowUpRight, BarChart3, Globe, Smartphone, Monitor } from 'lucide-react';
import { GscQueryData } from '@/lib/seo/types';

export default function SearchConsolePage() {
  const [queries, setQueries] = useState<GscQueryData[]>([]);
  const [dimensions, setDimensions] = useState<{
    countries?: Array<{ country: string; clicks: number; impressions: number }>;
    devices?: Array<{ device: string; clicks: number; impressions: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'queries' | 'dimensions'>('queries');
  const [sortField, setSortField] = useState<'impressions' | 'clicks' | 'ctr' | 'position'>('impressions');

  const fetchGscData = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/gsc/sync');
      const json = await res.json();
      if (json.success) {
        setQueries(json.queries || []);
        setConnection(json.connection || null);
        setDimensions(json.dimensions || null);
      }
    } catch (err) {
      console.error('Error loading GSC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGscData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isConnected = params.get('gsc_connected') === 'true';
      const property = params.get('property');
      const err = params.get('gsc_error');

      if (isConnected) {
        setAlertMessage({
          type: 'success',
          text: `Google Search Console connected successfully! Verified property: ${property || 'Domain Property'}. Click "Sync Search Console" below to pull live queries.`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (err) {
        let friendlyErr = err;
        if (err === 'invalid_csrf_state') {
          friendlyErr = 'Security validation failed (CSRF state mismatch). Please click "Connect Search Console" to retry.';
        } else if (err === 'access_denied') {
          friendlyErr = 'Access permission was declined on Google sign-in screen.';
        }
        setAlertMessage({
          type: 'error',
          text: `Search Console connection failed: ${friendlyErr}`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnectGsc = async () => {
    setConnecting(true);
    setAlertMessage(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/gsc/connect');
      const json = await res.json();
      if (json.success && json.authUrl) {
        window.location.href = json.authUrl;
      } else {
        setAlertMessage({
          type: 'error',
          text: json.error || 'Failed to initiate Google OAuth. Check GOOGLE_GSC_CLIENT_ID and GOOGLE_GSC_CLIENT_SECRET.',
        });
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: `OAuth error: ${err.message}` });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setAlertMessage(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/gsc/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setAlertMessage({
          type: 'success',
          text: `Live Sync Successful: Imported ${json.syncedQueriesCount} real search queries from ${json.propertyUrl || 'Google Search Console'}.`,
        });
        await fetchGscData();
      } else {
        setAlertMessage({
          type: 'error',
          text: json.error || 'Failed to sync with Search Console.',
        });
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: `Search Console sync error: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm('Purge all Search Console query snapshots from Firestore? Real data will be pulled again on next sync.')) {
      return;
    }
    setPurging(true);
    try {
      const res = await fetchWithToken('/api/admin/seo/gsc/sync', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setAlertMessage({ type: 'info', text: json.message || 'Purged query snapshots from Firestore.' });
        await fetchGscData();
      }
    } catch (err: any) {
      setAlertMessage({ type: 'error', text: `Purge error: ${err.message}` });
    } finally {
      setPurging(false);
    }
  };

  const filteredQueries = queries
    .filter((q) => (q.query || '').toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortField === 'position') return a.position - b.position;
      return (b[sortField] || 0) - (a[sortField] || 0);
    });

  const totalClicks = queries.reduce((acc, q) => acc + (q.clicks || 0), 0);
  const totalImpressions = queries.reduce((acc, q) => acc + (q.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPos = queries.length > 0 ? queries.reduce((acc, q) => acc + (q.position || 0), 0) / queries.length : 0;

  return (
    <div className="space-y-6">
      {/* Dynamic Status / Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : alertMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {alertMessage.type === 'success' ? '✅' : alertMessage.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Google Search Console Intelligence
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Empirical queries, impressions, CTR, and search positioning for StockSimulatorBD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connection?.connected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected: <strong>{connection.propertyUrl}</strong></span>
              {connection.lastSyncAt && (
                <span className="text-gray-400 font-mono text-[10px] ml-1">
                  (Synced {new Date(connection.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={handleConnectGsc}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-all active:scale-95"
            >
              <Globe className="w-3.5 h-3.5" />
              {connecting ? 'Connecting...' : 'Connect Search Console'}
            </button>
          )}

          {queries.length > 0 && (
            <button
              onClick={handlePurge}
              disabled={purging}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-all active:scale-95"
              title="Purge cached queries from Firestore"
            >
              {purging ? 'Purging...' : 'Clear Cached Data'}
            </button>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Search Console
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Total Organic Clicks (28d)</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">{totalClicks.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Total Search Impressions (28d)</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">{totalImpressions.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Average Site CTR</div>
          <div className="text-2xl font-black text-emerald-500 font-mono">{avgCtr.toFixed(2)}%</div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Average Search Position</div>
          <div className="text-2xl font-black text-blue-500 font-mono">{avgPos.toFixed(1)}</div>
        </div>
      </div>

      {/* Multi-Engine Navigation Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <a
          href="/admin/seo/search/ai-google"
          className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex items-center justify-between group"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <span>Google AI Overviews &amp; AI Mode</span>
              <span className="text-[10px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-sm">2026</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Analyze dedicated Generative AI performance report and organic correlation
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>

        <a
          href="/admin/seo/search/bing"
          className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 hover:border-teal-500 dark:hover:border-teal-500 transition-all flex items-center justify-between group"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
              <span>Microsoft Bing Webmaster Tools</span>
              <span className="text-[10px] bg-teal-600 text-white font-black px-1.5 py-0.2 rounded-sm">REST API</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Multi-engine rank, Bing Chat traffic, crawl health, and external backlinks
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111622] p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queries')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'queries' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Queries ({queries.length})
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'dimensions' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Device & Country Dimensions
          </button>
        </div>

        {activeTab === 'queries' && (
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter queries..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {activeTab === 'queries' ? (
        queries.length === 0 ? (
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
            <Search className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Search Console Queries Recorded</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
              All fallback mock data has been completely removed. Click &quot;Sync Search Console&quot; above to pull live organic queries, impressions, and CTR directly from Google.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Search Query</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-500"
                      onClick={() => setSortField('clicks')}
                    >
                      Clicks {sortField === 'clicks' && '▼'}
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-500"
                      onClick={() => setSortField('impressions')}
                    >
                      Impressions {sortField === 'impressions' && '▼'}
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-500"
                      onClick={() => setSortField('ctr')}
                    >
                      CTR {sortField === 'ctr' && '▼'}
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-blue-500"
                      onClick={() => setSortField('position')}
                    >
                      Position {sortField === 'position' && '▲'}
                    </th>
                    <th className="py-3 px-4">Landing Page</th>
                    <th className="py-3 px-4">Opportunity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                  {filteredQueries.map((q, idx) => {
                    const isHighImpressionLowCtr = q.impressions > 1500 && q.ctr < 0.035;
                    const isStrikingDistance = q.position >= 4 && q.position <= 15;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                          {q.query}
                          {q.trend === 'rising' && (
                            <span className="ml-2 inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                              Rising ↑
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">{q.clicks}</td>
                        <td className="py-3 px-4 font-mono">{q.impressions.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                          {(q.ctr * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 font-mono">{q.position.toFixed(1)}</td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-[11px] truncate max-w-[150px]">
                          {q.targetPages?.[0] || '/trade'}
                        </td>
                        <td className="py-3 px-4">
                          {isHighImpressionLowCtr ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Low CTR
                            </span>
                          ) : isStrikingDistance ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Striking Pos {q.position.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Stable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" /> Top Countries (Geographic Distribution)
            </h3>
            {dimensions?.countries && dimensions.countries.length > 0 ? (
              <div className="space-y-2 text-xs">
                {(() => {
                  const totalImp = dimensions.countries.reduce((acc, c) => acc + (c.impressions || 0), 0);
                  return dimensions.countries.map((c, i) => {
                    const pct = totalImp > 0 ? ((c.impressions / totalImp) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{c.country}</span>
                        <strong className="font-mono text-gray-900 dark:text-white">
                          {pct}% ({c.impressions.toLocaleString()} imp, {c.clicks.toLocaleString()} clicks)
                        </strong>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">
                No country breakdown recorded yet. Click &quot;Sync Search Console&quot; to fetch empirical geographic distribution.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-500" /> Device Breakdown
            </h3>
            {dimensions?.devices && dimensions.devices.length > 0 ? (
              <div className="space-y-2 text-xs">
                {(() => {
                  const totalImp = dimensions.devices.reduce((acc, d) => acc + (d.impressions || 0), 0);
                  return dimensions.devices.map((d, i) => {
                    const pct = totalImp > 0 ? ((d.impressions / totalImp) * 100).toFixed(1) : '0.0';
                    const icon =
                      d.device.toLowerCase().includes('mobile')
                        ? '📱 Mobile'
                        : d.device.toLowerCase().includes('desktop')
                        ? '💻 Desktop'
                        : d.device.toLowerCase().includes('tablet')
                        ? '📟 Tablet'
                        : d.device;
                    return (
                      <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{icon}</span>
                        <strong className="font-mono text-purple-600 dark:text-purple-400">
                          {pct}% ({d.impressions.toLocaleString()} imp, {d.clicks.toLocaleString()} clicks)
                        </strong>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">
                No device breakdown recorded yet. Click &quot;Sync Search Console&quot; to fetch empirical device distribution.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
