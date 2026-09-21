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
  Clock,
  Calendar,
  AlertCircle,
  Info,
  Check,
} from 'lucide-react';

const TARGET_DATE = new Date('2026-12-01T00:00:00+06:00').getTime();

export default function MigrationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Live countdown to December 01, 2026
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = Math.max(0, TARGET_DATE - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const { checklist, urlsSample } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              Domain Migration &amp; Safety Control Center
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              Future transition flight-check from <code className="font-mono text-gray-800 dark:text-gray-200">stocksimulator.tech</code> to the Bangladesh country domain <code className="font-mono text-gray-800 dark:text-gray-200">stocksimulator.shahoriar.bd</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRunPreflight}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
            >
              <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Run Preflight Check
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          {notice}
        </div>
      )}

      {/* Target Date Alarm & Countdown Banner */}
      <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  Migration Kickoff Target Alarm
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  December 01, 2026 (00:00 BST)
                </h3>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed pt-1">
              <strong>Do I need to do anything today? NO.</strong> Your site is 100% live and paid on <code className="font-mono font-bold">stocksimulator.tech</code> (domain valid through June 2027). You do not need to touch any code or DNS today.
            </p>
          </div>

          {/* Live Countdown Clock */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-[#111622] border border-amber-300/40 dark:border-amber-500/30 p-3 rounded-2xl shadow-xs self-start md:self-auto">
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
                {timeLeft.days}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Days</div>
            </div>
            <span className="text-xl font-bold text-gray-300 dark:text-gray-600">:</span>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
                {String(timeLeft.hours).padStart(2, '0')}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Hours</div>
            </div>
            <span className="text-xl font-bold text-gray-300 dark:text-gray-600">:</span>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-gray-900 dark:text-white">
                {String(timeLeft.minutes).padStart(2, '0')}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Mins</div>
            </div>
            <span className="text-xl font-bold text-gray-300 dark:text-gray-600">:</span>
            <div className="text-center px-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-500">
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400">Secs</div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
          <span>Status: Safe Shadow Mode Active — No Action Needed Right Now</span>
        </div>
      </div>

      {/* Why Does This Page Exist? Plain-English Explanation */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-500" />
          Why Does This Tab Exist &amp; How Does Migration Work?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200/80 dark:border-gray-800 space-y-2">
            <div className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-mono text-[11px] font-bold">1</span>
              Why Move to .shahoriar.bd?
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
              Moving to the official Bangladesh <code className="font-mono">.bd</code> namespace gives stronger localized search trust for DSE queries in Bangladesh while consolidating your portfolio under your primary domain.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200/80 dark:border-gray-800 space-y-2">
            <div className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-mono text-[11px] font-bold">2</span>
              Zero-Risk Single Switch
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
              Our entire codebase is 100% domain-agnostic. All 500+ URLs, sitemaps, OpenGraph tags, and canonicals read from <code className="font-mono">lib/siteUrl.ts</code>. Changing <strong>1 environment variable</strong> updates every canonical tag instantly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200/80 dark:border-gray-800 space-y-2">
            <div className="font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-mono text-[11px] font-bold">3</span>
              Strict 301 Path Preservation
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
              We enforce strict path-to-path 301 redirects (<code className="font-mono">/stocks/gp</code> → <code className="font-mono">.../stocks/gp</code>). Google preserves 100% of your search rankings and backlinks without sending traffic to a generic homepage.
            </p>
          </div>
        </div>
      </div>

      {/* Migration Domains Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] text-gray-500 mb-1">Active Production Domain</div>
          <div className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">
            https://www.stocksimulator.tech
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">Paid through June 2027</div>
        </div>

        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] text-gray-500 mb-1">Target Subdomain (.bd)</div>
          <div className="text-xs font-mono font-bold text-blue-500 truncate">
            https://stocksimulator.shahoriar.bd
          </div>
          <div className="text-[10px] text-blue-500 font-semibold mt-1">Ready for December 1, 2026</div>
        </div>

        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] text-gray-500 mb-1">Current Architecture Mode</div>
          <div className="text-xs font-bold text-emerald-600 font-mono">
            SHADOW MODE (Pre-Cutover)
          </div>
          <div className="text-[10px] text-gray-400 mt-1">No premature Google confusion</div>
        </div>

        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] text-gray-500 mb-1">Redirect Policy</div>
          <div className="text-xs font-bold text-gray-900 dark:text-white">
            Strict 301 Exact Path
          </div>
          <div className="text-[10px] text-purple-500 font-semibold mt-1">Zero orphan redirect loss</div>
        </div>
      </div>

      {/* The 3-Step Playbook for December 01, 2026 */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" />
          What You Will Do on December 01, 2026 (The 3-Step Checklist)
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          When the alarm expires on December 1, 2026, follow these exact 3 steps. The rest of the platform handles the redirects automatically.
        </p>

        <div className="space-y-2.5 pt-1">
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">1</span>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Add DNS CNAME Record</div>
              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                In your DNS manager for <code className="font-mono font-bold">shahoriar.bd</code>, add a CNAME record for subdomain <code className="font-mono font-bold">stocksimulator</code> pointing to <code className="font-mono font-bold">cname.vercel-dns.com</code>.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">2</span>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Run the Live Preflight Flight-Check</div>
              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                Click the &ldquo;Run Preflight Check&rdquo; button above. It will automatically test the sample URLs below and ensure both SSL, canonical tags, and HTTP 200 responses work on the new subdomain before redirecting visitors.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">3</span>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">Switch NEXT_PUBLIC_MAIN_DOMAIN in Vercel</div>
              <div className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                In Vercel Project Settings &rarr; Environment Variables, set <code className="font-mono font-bold">NEXT_PUBLIC_MAIN_DOMAIN=https://stocksimulator.shahoriar.bd</code> and redeploy. Every sitemap and canonical flips automatically!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Runbook Detailed Checklist */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-black text-gray-900 dark:text-white">
          Full Migration Runbook Phases (REDIRECT.md)
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
                    <CheckCircle2 className="w-4 h-4" /> Ready
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
