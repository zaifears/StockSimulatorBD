// app/admin/seo/settings/page.tsx
'use client';

import React, { useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HardDrive,
  Trash2,
  RefreshCw,
  Activity,
} from 'lucide-react';

export default function SeoSettingsPage() {
  const [cleaning, setCleaning] = useState(false);
  const [healthTesting, setHealthTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const handleTestHealth = async () => {
    setHealthTesting(true);
    setHealthStatus(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/health');
      const json = await res.json();
      setHealthStatus(json);
    } catch (err: any) {
      setHealthStatus({ adminAuth: 'ok', seoFirebase: 'error', error: err.message });
    } finally {
      setHealthTesting(false);
    }
  };

  const handleRunCleanup = async () => {
    setCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/retention', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setCleanupMessage(`✅ ${json.message}`);
      } else {
        setCleanupMessage(`⚠️ Cleanup error: ${json.error}`);
      }
    } catch (err: any) {
      setCleanupMessage(`❌ Cleanup error: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          SEO System Architecture & Free-Tier Guardrails
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Guaranteed zero-dollar infrastructure settings. The system operates on free tiers and never calls paid external APIs.
        </p>
      </div>

      {/* Real-time Health Test Card */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> System Integration & Health Verification
          </h3>
          <button
            onClick={handleTestHealth}
            disabled={healthTesting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthTesting ? 'animate-spin' : ''}`} />
            Run Live Health Test
          </button>
        </div>

        {healthStatus && (
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 text-xs font-mono space-y-1">
            <div>Admin Auth Custom Claim: <strong className="text-emerald-500">{healthStatus.adminAuth}</strong></div>
            <div>SEO Firebase Project: <strong className="text-emerald-500">{healthStatus.seoFirebase} ({healthStatus.projectId})</strong></div>
            <div>Database Isolation from Prod: <strong className="text-blue-500">{healthStatus.isIsolatedFromProduction ? 'CONFIRMED ISOLATED' : 'SHARED'}</strong></div>
            <div>Test Doc Write/Read: <strong className="text-emerald-500">{healthStatus.testDocVerified ? 'VERIFIED' : 'PENDING'}</strong></div>
          </div>
        )}
      </div>

      {/* Free Tier Status Matrix Box */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Active System Mode: FREE</span>
          </div>
          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full">
            Estimated Cost: $0.00 / month
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Dedicated SEO Firebase Project</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Active</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Google Search Console API</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Free OAuth</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Internal Batch Crawler</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Zero-Dep</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Google PageSpeed Insights</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Free Public API</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">W3C Nu HTML Validator</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Free Public API</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">IndexNow Protocol</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Free (Bing/Yandex)</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Google Autocomplete</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Free</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">AI / GEO Visibility Lab</span>
            <span className="text-blue-500 font-bold flex items-center gap-1">Manual ($0)</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Paid Scrapers / Apify</span>
            <span className="text-gray-400 font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> Disabled</span>
          </div>
        </div>
      </div>

      {/* Retention Policy & Cleanup Action Box */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-500" /> Firestore Storage & Free Tier Retention Limits
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Automated cleanup stops Firestore storage from filling up and stays inside free quotas.
            </p>
          </div>

          <button
            onClick={handleRunCleanup}
            disabled={cleaning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 transition-colors border border-amber-200/80 dark:border-amber-500/30 shrink-0 self-start sm:self-auto"
          >
            <Trash2 className={`w-3.5 h-3.5 ${cleaning ? 'animate-spin' : ''}`} />
            Run Retention Cleanup Now
          </button>
        </div>

        {cleanupMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
            {cleanupMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800">
            <div className="font-bold text-gray-900 dark:text-white mb-1">Permanent Data</div>
            <p className="text-gray-500 dark:text-gray-400 text-[11px]">
              Active page inventory, applied changes, rollbacks, domain migration logs, and monthly aggregates.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800">
            <div className="font-bold text-gray-900 dark:text-white mb-1">~90 Days Retention</div>
            <p className="text-gray-500 dark:text-gray-400 text-[11px]">
              Detailed GSC query snapshots, PageSpeed audits, W3C logs, and crawled link edges.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800">
            <div className="font-bold text-gray-900 dark:text-white mb-1">~30 Days Retention</div>
            <p className="text-gray-500 dark:text-gray-400 text-[11px]">
              Raw AI query lab responses and temporary batch crawl job states.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
