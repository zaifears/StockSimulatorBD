// app/admin/seo/authority/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { Network, AlertOctagon, CheckCircle2, RefreshCw, ArrowRight, Link2, ShieldAlert } from 'lucide-react';
import { SeoPageProfile } from '@/lib/seo/types';

export default function AuthorityPage() {
  const [pages, setPages] = useState<SeoPageProfile[]>([]);
  const [bingBacklinks, setBingBacklinks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'internal' | 'bing'>('internal');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const fetchAuthorityData = async () => {
    try {
      const [crawlRes, bingRes] = await Promise.all([
        fetchWithToken('/api/admin/seo/crawl'),
        fetchWithToken('/api/admin/seo/bing').catch(() => ({ json: () => ({ success: false }) })),
      ]);
      const json = await crawlRes.json();
      if (json.success) {
        setPages(json.pages || []);
      }
      const bJson = await bingRes.json();
      if (bJson.success && bJson.backlinks) {
        setBingBacklinks(bJson.backlinks);
      }
    } catch (err) {
      console.error('Failed to load authority data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorityData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetchWithToken('/api/admin/seo/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAuthorityData();
      }
    } catch (err) {
      console.error('Error recalculating:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const orphanPages = pages.filter((p) => p.isOrphan && p.path !== '/');
  const sortedPages = [...pages].sort((a, b) => (b.internalAuthorityScore || 0) - (a.internalAuthorityScore || 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-500" />
            Internal Link Authority & Orphan Radar
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real internal link authority calculated from inbound graph edges, unique referring pages, click depth, and orphan penalties.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          Recalculate Authority Graph
        </button>
      </div>

      {/* Orphan Alert Card */}
      {orphanPages.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
            <AlertOctagon className="w-4 h-4" />
            {orphanPages.length} Orphan Pages Detected (Zero Inbound Internal Links)
          </div>
          <p className="text-xs text-red-700 dark:text-red-300">
            These pages have no internal links pointing to them from anywhere else on the site. Search crawlers and AI bots will struggle to index them.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {orphanPages.map((p) => (
              <span key={p.id} className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold">
                {p.path}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Authority Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('internal')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'internal' ? 'bg-white dark:bg-[#111622] text-blue-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              Internal Link Authority ({pages.length})
            </button>
            <button
              onClick={() => setActiveTab('bing')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'bing' ? 'bg-white dark:bg-[#111622] text-teal-600 shadow-xs' : 'text-gray-500'
              }`}
            >
              Bing External Backlinks ({bingBacklinks.length})
            </button>
          </div>
          <span className="text-[10px] text-gray-400">
            {activeTab === 'internal' ? 'Calculated Internal PageRank Graph' : 'Discovered by Microsoft Bingbot'}
          </span>
        </div>

        {activeTab === 'bing' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4">Referring External URL</th>
                  <th className="py-3 px-4">Target Landing Page</th>
                  <th className="py-3 px-4">Anchor Text</th>
                  <th className="py-3 px-4 text-right">Discovered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {bingBacklinks.map((b: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400 max-w-[280px] truncate">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <span>{b.url}</span>
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
        ) : (

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Page Path</th>
                <th className="py-3 px-4">Internal Authority Score</th>
                <th className="py-3 px-4">Authority Tier</th>
                <th className="py-3 px-4">Inbound Links</th>
                <th className="py-3 px-4">Referring Pages</th>
                <th className="py-3 px-4">Depth</th>
                <th className="py-3 px-4">Orphan?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {sortedPages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                    {page.path}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            page.internalAuthorityScore >= 70 ? 'bg-emerald-500' :
                            page.internalAuthorityScore >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${page.internalAuthorityScore || 50}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-gray-900 dark:text-white">
                        {page.internalAuthorityScore || 50}/100
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      page.authorityTier === 'HIGH' ? 'bg-emerald-500/10 text-emerald-500' :
                      page.authorityTier === 'ORPHAN' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {page.authorityTier || 'MEDIUM'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{page.inboundLinksCount || 0}</td>
                  <td className="py-3 px-4 font-mono">{page.referringPagesCount || 0}</td>
                  <td className="py-3 px-4 font-mono">{page.depth || 1}</td>
                  <td className="py-3 px-4">
                    {page.isOrphan && page.path !== '/' ? (
                      <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        YES (Orphan)
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-medium">NO</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
