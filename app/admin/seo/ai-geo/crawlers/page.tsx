// app/admin/seo/ai-geo/crawlers/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { CrawlerSummary } from '@/lib/seo/types';
import { CrawlerAuditResult } from '@/lib/seo/robotsAudit';
import {
  Bot,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  RefreshCw,
  Loader2,
  Activity,
  Info,
  ExternalLink,
} from 'lucide-react';

export default function AiCrawlersPage() {
  const [summaries, setSummaries] = useState<CrawlerSummary[]>([]);
  const [robotsAudit, setRobotsAudit] = useState<CrawlerAuditResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/crawlers');
      const json = await res.json();
      if (json.success) {
        setSummaries(json.summaries || []);
        setRobotsAudit(json.robotsAudit || []);
      }
    } catch (err) {
      console.error('Failed to load crawler data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span>Loading AI Crawler Access Monitor &amp; Robots Audit...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Bot className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              AI &amp; Search Crawler Access Monitor
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Observational monitoring of recognized bot user-agent requests (Googlebot, OAI-SearchBot, Bingbot, PerplexityBot, ClaudeBot) and active robots.txt compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 transition-colors self-start md:self-auto"
          title="Refresh Crawler Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Observational Integrity Callout */}
      <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs space-y-1">
        <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
          <Info className="w-4 h-4 text-purple-500 shrink-0" />
          <span>Strict Non-Definitive Observational Framing</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
          All crawler logs are classified strictly by declared HTTP User-Agent headers. In public network telemetry: <em>&ldquo;An observed request identified itself as OAI-SearchBot&rdquo;</em>, not <em>&ldquo;This request definitely originated from OpenAI&rdquo;</em>, because user-agent strings can be spoofed by third-party scrapers.
        </p>
      </div>

      {/* Recognized Bot Requests Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-500" />
            Recognized Crawler Activity ({summaries.length} Bots)
          </h3>
          <span className="text-[10px] text-gray-400">Aggregated Server Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Bot Identifier</th>
                <th className="py-3 px-4">Last Observed</th>
                <th className="py-3 px-4 text-right">Total Requests</th>
                <th className="py-3 px-4 text-right">HTTP 200 (Success)</th>
                <th className="py-3 px-4 text-right">HTTP 403 (Forbidden)</th>
                <th className="py-3 px-4 text-right">HTTP 404 (Not Found)</th>
                <th className="py-3 px-4 text-center">Robots Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {summaries.map((s) => (
                <tr key={s.botName} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{s.botName}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                    {new Date(s.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-gray-900 dark:text-white">
                    {s.totalRequests.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
                    {s.successfulCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-600">
                    {s.forbiddenCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-gray-500">
                    {s.notFoundCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Allowed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Robots.ts AI Audit Grid */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Robots.ts AI Crawler Audit &amp; Policy Verification
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">app/robots.ts</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {robotsAudit.map((audit) => (
            <div
              key={audit.botName}
              className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#161D2A] border border-gray-200/80 dark:border-gray-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  {audit.botName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" /> Allowed
                </span>
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                {audit.notes}
              </div>

              <div className="pt-1 text-[10px] text-gray-400 border-t border-gray-200/50 dark:border-gray-800/80">
                <strong>Firewall Rule:</strong> {audit.firewallNotice}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
