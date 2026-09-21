// app/admin/seo/migration/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  HelpCircle,
} from 'lucide-react';

export default function MigrationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchMigrationData = async () => {
    try {
      const res = await fetchWithToken('/api/admin/seo/migration/check');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load migration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMigrationData();
  }, []);

  const handleRunPreflight = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/migration/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setNotice('✅ Preflight audit completed across old and new domain!');
        fetchMigrationData();
      }
    } catch (err: any) {
      setNotice(`❌ Preflight failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const { summary, checklist, urlsSample } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            Domain Migration Command Center
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Full runbook monitoring for moving from <code className="font-mono text-gray-800 dark:text-gray-200">stocksimulator.tech</code> to <code className="font-mono text-gray-800 dark:text-gray-200">stocksimulator.shahoriar.bd</code>.
          </p>
        </div>

        <button
          onClick={handleRunPreflight}
          disabled={testing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          Run Live Preflight Test
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          {notice}
        </div>
      )}

      {/* Migration Status Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Old Origin (.tech Expiry June 2027)</div>
          <div className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">
            https://www.stocksimulator.tech
          </div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Target Origin (.bd Country TLD)</div>
          <div className="text-xs font-mono font-bold text-emerald-500 truncate">
            https://stocksimulator.shahoriar.bd
          </div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Current Architecture Mode</div>
          <div className="text-sm font-bold text-blue-500 font-mono">
            SHADOW MODE (Pre-Cutover)
          </div>
        </div>
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl">
          <div className="text-xs text-gray-500 mb-1">Path Preservation Rule</div>
          <div className="text-sm font-bold text-emerald-500">
            Strict 301 /path → /path
          </div>
        </div>
      </div>

      {/* Pre-Migration Shadow Mode Warning Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          Pre-Migration Shadow Mode Rule
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          Before flipping the canonical domain, the old domain canonicals point to OLD, and the new domain can be tested without prematurely confusing Google. During cutover, never redirect deep pages to the homepage — each <code className="font-mono font-bold">/stocks/gp</code> must 301 redirect strictly to <code className="font-mono font-bold">https://stocksimulator.shahoriar.bd/stocks/gp</code>.
        </p>
      </div>

      {/* 5-Phase Interactive Migration Checklist */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-gray-900 dark:text-white">
          Domain Migration Runbook Checklist (REDIRECT.md)
        </h3>

        <div className="space-y-2">
          {checklist?.map((step: any) => (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                step.completed
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-gray-50 dark:bg-[#161D2A] border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    step.completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    Phase {step.phase}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{step.title}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px]">{step.description}</p>
              </div>

              <div className="text-right shrink-0">
                {step.completed ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {step.actionRequired}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
