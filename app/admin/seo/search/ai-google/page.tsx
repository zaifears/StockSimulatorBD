// app/admin/seo/search/ai-google/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { GscAiSnapshot } from '@/lib/seo/types';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  MousePointerClick,
  Eye,
  Percent,
  Globe2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

export default function GoogleAiSearchPage() {
  const [snapshot, setSnapshot] = useState<GscAiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/ai-google');
      const json = await res.json();
      if (json.success && json.latest) {
        setSnapshot(json.latest);
      }
    } catch (err) {
      console.error('Failed to load Google AI search data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    try {
      const text = await file.text();
      const res = await fetchWithToken('/api/admin/seo/ai-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: text, fileName: file.name }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse GenAI CSV');
      }

      setSnapshot(json.snapshot);
      setUploadSuccess(`Successfully imported ${json.snapshot.rowCount} rows from ${file.name}`);
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayData = snapshot;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Google AI Overviews & AI Mode Analytics
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Official Search Console Generative AI performance intelligence. Tracks actual user impressions and clicks generated from Google AI Overviews and conversational AI Mode queries.
          </p>
        </div>

        {/* Upload Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Import Google GenAI CSV</span>
          </button>
        </div>
      </div>

      {/* Upload Feedback */}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Compliance / Methodology Notice */}
      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          <span>Search Console 2026 GenAI Methodology &amp; Compliance</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          As of August 31, 2026, Google provides a dedicated Generative AI performance report in the Search Console web interface, but the Search Analytics API does not yet expose a direct endpoint. To maintain zero-scraping compliance with Google ToS, download your CSV directly from Search Console &rarr; <em>Performance &rarr; Generative AI</em> and upload it here.
        </p>
      </div>

      {!displayData ? (
        <div className="bg-white dark:bg-[#111622] p-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              No Google AI Overviews Data Imported Yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Export your Generative AI report from Google Search Console (under <strong>Performance &rarr; Generative AI</strong>) as CSV and upload it here to visualize real AI citations, clicks, impressions, and top pages.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Select CSV File</span>
          </button>
        </div>
      ) : (
        <>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111622] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>GenAI Impressions</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
            {displayData.totalAiImpressions.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {displayData.organicCorrelation.aiShareOfImpressions}%
            </span>
            <span>of total organic search</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111622] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>GenAI Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
            {displayData.totalAiClicks.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Direct visits from AI features
          </div>
        </div>

        <div className="bg-white dark:bg-[#111622] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Average AI CTR</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-gray-900 dark:text-white">
            {displayData.averageAiCtr}%
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Organic standard: {displayData.organicCorrelation.organicCtr}%
          </div>
        </div>

        <div className="bg-white dark:bg-[#111622] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Active Period</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
            {displayData.periodLabel}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {snapshot ? `Imported from ${snapshot.fileName}` : 'Demo reference mode'}
          </div>
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Organic vs. AI Overviews Correlation
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          Strict empirical comparison between standard Google web rankings and Generative AI mode visibility.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-100 dark:border-gray-800">
            <div className="text-[11px] text-gray-500 font-medium">AI Impressions</div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
              {displayData.totalAiImpressions.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Observed in AI Overviews</div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-100 dark:border-gray-800">
            <div className="text-[11px] text-gray-500 font-medium">Organic Impressions</div>
            <div className="text-lg font-bold font-mono tabular-nums text-gray-900 dark:text-white mt-1">
              {displayData.organicCorrelation.organicImpressions.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Standard Search Clicks</div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-100 dark:border-gray-800">
            <div className="text-[11px] text-gray-500 font-medium">AI vs Organic Clicks</div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {displayData.totalAiClicks} / {displayData.organicCorrelation.organicClicks}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {Math.round((displayData.totalAiClicks / (displayData.organicCorrelation.organicClicks || 1)) * 1000) / 10}% ratio
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-100 dark:border-gray-800">
            <div className="text-[11px] text-gray-500 font-medium">CTR Difference</div>
            <div className="text-lg font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400 mt-1">
              {displayData.averageAiCtr > displayData.organicCorrelation.organicCtr ? '+' : ''}
              {(displayData.averageAiCtr - displayData.organicCorrelation.organicCtr).toFixed(2)}%
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">AI Mode vs Organic Web</div>
          </div>
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Top Pages with AI Overview Visibility ({displayData.topPages.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Landing Page Path</th>
                <th className="py-3 px-4 text-right">AI Impressions</th>
                <th className="py-3 px-4 text-right">AI Clicks</th>
                <th className="py-3 px-4 text-right">AI CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {displayData.topPages.map((p) => (
                <tr key={p.path} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">
                    {p.path}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-700 dark:text-gray-300">
                    {p.impressions.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {p.clicks.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-900 dark:text-white font-bold">
                    {p.ctr.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Country & Device Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Country Breakdown */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-blue-500" />
              AI Impressions by Country
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {displayData.countryBreakdown.map((c) => {
              const pct = displayData.totalAiImpressions > 0 ? Math.round((c.impressions / displayData.totalAiImpressions) * 100) : 0;
              return (
                <div key={c.country} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                    <span>{c.country}</span>
                    <span className="font-mono tabular-nums text-gray-500">
                      {c.impressions.toLocaleString()} imp ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              AI Impressions by Device
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {displayData.deviceBreakdown.map((d) => {
              const pct = displayData.totalAiImpressions > 0 ? Math.round((d.impressions / displayData.totalAiImpressions) * 100) : 0;
              return (
                <div key={d.device} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                    <span>{d.device}</span>
                    <span className="font-mono tabular-nums text-gray-500">
                      {d.impressions.toLocaleString()} imp ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
