// app/admin/seo/changes/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { GitBranch, RotateCcw, CheckCircle2, ShieldCheck, History, Edit3, Zap, PlusCircle } from 'lucide-react';

export default function ChangesManagementPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [impacts, setImpacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackLoading, setRollbackLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form state for applying a safe override directly
  const [newPath, setNewPath] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [applyingOverride, setApplyingOverride] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryPath = params.get('path');
      if (queryPath) setNewPath(queryPath);
    }
  }, []);

  const fetchChanges = async () => {
    try {
      const [res, impactRes] = await Promise.all([
        fetchWithToken('/api/admin/seo/changes'),
        fetchWithToken('/api/admin/seo/changes/impact').catch(() => ({ json: () => ({ success: false }) })),
      ]);
      const json = await res.json();
      if (json.success) {
        setChanges(json.changes || []);
        setOverrides(json.overrides || []);
      }
      const impJson = await impactRes.json();
      if (impJson.success) {
        setImpacts(impJson.impacts || []);
      }
    } catch (err) {
      console.error('Failed to load changes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, []);

  const handleRollback = async (changeId: string) => {
    setRollbackLoading(changeId);
    setNotice(null);
    try {
      const res = await fetchWithToken('/api/admin/seo/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', changeId }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice('✅ Rollback successfully applied!');
        fetchChanges();
      } else {
        setNotice(`⚠️ Rollback failed: ${json.error}`);
      }
    } catch (err: any) {
      setNotice(`❌ Rollback error: ${err.message}`);
    } finally {
      setRollbackLoading(null);
    }
  };

  const handleApplyNewOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    setApplyingOverride(true);
    setNotice(null);

    try {
      const res = await fetchWithToken('/api/admin/seo/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_override',
          path: newPath.trim(),
          title: newTitle.trim(),
          description: newDescription.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice(`✅ Successfully applied override to ${newPath} and initialized Change Impact monitoring!`);
        setNewPath('');
        setNewTitle('');
        setNewDescription('');
        fetchChanges();
      } else {
        setNotice(`⚠️ Override failed: ${json.error}`);
      }
    } catch (err: any) {
      setNotice(`❌ Failed to apply override: ${err.message}`);
    } finally {
      setApplyingOverride(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-500" />
          Change Management &amp; Rollback Center
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Strict change lifecycle: Observe &rarr; Analyze &rarr; Recommend &rarr; Preview &rarr; Approve &rarr; Apply &rarr; Verify &rarr; Monitor. Every change preserves full before/after rollback state.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          {notice}
        </div>
      )}

      {/* Direct Deploy & Track Card */}
      <div className="bg-white dark:bg-[#111622] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-500" /> Deploy Safe Metadata Override &amp; Track Impact
          </h3>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            Safe Level 1 Change
          </span>
        </div>

        <form onSubmit={handleApplyNewOverride} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400">Target Path</label>
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="e.g. /trade or /stocks/gp"
              required
              className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400">New Meta Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Primary intent & value prop"
              className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-bold text-gray-600 dark:text-gray-400">New Meta Description</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Concise 120-155 char summary"
              className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3 flex justify-end pt-1">
            <button
              type="submit"
              disabled={applyingOverride || !newPath.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <Zap className={`w-3.5 h-3.5 ${applyingOverride ? 'animate-spin' : ''}`} />
              {applyingOverride ? 'Applying...' : 'Apply Safe Override & Track Impact'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Safe Overrides Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-blue-500" /> Active Metadata Overrides ({overrides.length})
          </h3>
          <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-sm">
            Level 1 Safe Overrides
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Page Path</th>
                <th className="py-3 px-4">Overridden Title</th>
                <th className="py-3 px-4">Overridden Description</th>
                <th className="py-3 px-4">Applied At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {overrides.length > 0 ? (
                overrides.map((ov) => (
                  <tr key={ov.id} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-white">{ov.path}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{ov.title || '—'}</td>
                    <td className="py-3 px-4 max-w-[250px] truncate text-gray-500">{ov.description || '—'}</td>
                    <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">{new Date(ov.appliedAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-xs text-gray-400">
                    No metadata overrides active. Apply one from the Page Inspector in /admin/seo/pages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Audit Log & 1-Click Rollback */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <History className="w-4 h-4 text-purple-500" /> Historical Changes & Rollback Ledger ({changes.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {changes.length > 0 ? (
            changes.map((ch) => (
              <div key={ch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">{ch.target}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {ch.type}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      ch.status === 'rolled_back' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {ch.status}
                    </span>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Before: &ldquo;{ch.before?.title?.slice(0, 40) || 'None'}&rdquo; → After: &ldquo;{ch.after?.title?.slice(0, 40) || 'None'}&rdquo;
                  </div>
                </div>

                {ch.status !== 'rolled_back' && (
                  <button
                    onClick={() => handleRollback(ch.id)}
                    disabled={rollbackLoading === ch.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1 self-end sm:self-auto shrink-0"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${rollbackLoading === ch.id ? 'animate-spin' : ''}`} />
                    Rollback Change
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-gray-400">
              No historical changes recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* True SEO Change-Impact Correlation Engine */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              SEO Change-Impact Correlation Engine ({impacts.length})
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Before (28d) vs. After (7d / 14d / 28d) empirical correlation. Strictly adheres to observational standards: &ldquo;observed after change&rdquo;, never claiming sole causation.
            </p>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Strict Empirical Rigor</span>
        </div>

        <div className="p-4 space-y-4">
          {impacts.length > 0 ? (
            impacts.map((imp) => (
              <div
                key={imp.id}
                className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/50 dark:border-gray-800 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-gray-900 dark:text-white">{imp.path}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
                        {imp.id}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        imp.status === 'concluded' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {imp.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{imp.changeDescription}</div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    Applied: {imp.changeDate}
                  </div>
                </div>

                {/* Before vs After Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#111622] border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Search Impressions</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-gray-400 font-mono line-through">{imp.before28d?.impressions ?? 0}</span>
                      <span className="font-bold font-mono text-gray-900 dark:text-white">
                        {imp.after28d?.impressions || imp.after7d?.impressions || 'Monitoring'}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">
                      {imp.after28d ? `+${imp.after28d.impressions - (imp.before28d?.impressions ?? 0)}` : 'Active'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#111622] border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Organic Clicks</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-gray-400 font-mono line-through">{imp.before28d?.clicks ?? 0}</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {imp.after28d?.clicks || imp.after7d?.clicks || '—'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">28-day window</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#111622] border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Click-Through Rate</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-gray-400 font-mono line-through">{(imp.before28d?.ctr ?? 0).toFixed(1)}%</span>
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                        {((imp.after28d?.ctr || imp.after7d?.ctr || imp.before28d?.ctr) ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-blue-500 font-semibold mt-0.5">
                      {imp.after28d ? `+${((imp.after28d.ctr) - (imp.before28d?.ctr ?? 0)).toFixed(2)}%` : 'Measuring'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#111622] border border-gray-100 dark:border-gray-800">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Search Position</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-gray-400 font-mono line-through">{(imp.before28d?.position ?? 0).toFixed(1)}</span>
                      <span className="font-bold font-mono text-gray-900 dark:text-white">
                        {((imp.after28d?.position || imp.after7d?.position || imp.before28d?.position) ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">Rank tracker</div>
                  </div>
                </div>

                {/* Observational Summary Text */}
                <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-200">
                  <strong>Empirical Observation:</strong> {imp.observationalSummary}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-gray-400">
              No changes actively being monitored yet. Applying a metadata override from the Page Inspector will automatically begin tracking Search Console impact.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
