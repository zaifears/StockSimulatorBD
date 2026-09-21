// app/admin/seo/recommendations/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { Lightbulb, Check, X, ArrowRight, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
import { SeoOpportunity } from '@/lib/seo/types';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<SeoOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await fetchWithToken(`/api/admin/seo/recommendations?status=${statusFilter}`);
      const json = await res.json();
      if (json.success) {
        setRecommendations(json.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [statusFilter]);

  const handleAction = async (id: string, action: 'approve' | 'dismiss') => {
    setActionLoading(id);
    try {
      const res = await fetchWithToken('/api/admin/seo/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (json.success) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'applied' : 'dismissed' } : r))
        );
      }
    } catch (err) {
      console.error('Failed recommendation action:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await fetchWithToken('/api/admin/seo/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      fetchRecommendations();
    } catch (err) {
      console.error('Error regenerating opportunities:', err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Actionable Opportunities & Recommendations Inbox
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Every recommendation is bound to empirical evidence. No vague or arbitrary SEO scores.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Zap className="w-3.5 h-3.5" />
          Regenerate Insights
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#111622] p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
        {['all', 'active', 'applied', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{rec.title}</h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    Risk: {rec.riskLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {rec.status === 'dismissed' ? (
                    <span className="text-xs text-gray-400 font-bold">Dismissed</span>
                  ) : rec.status === 'applied' ? (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Approved / Applied
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(rec.id, 'dismiss')}
                        disabled={actionLoading === rec.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(rec.id, 'approve')}
                        disabled={actionLoading === rec.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Action
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-[#161D2A] p-3 rounded-xl">
                <div><strong>Action:</strong> {rec.suggestedAction}</div>
                <div className="mt-1 text-emerald-600 dark:text-emerald-400"><strong>Expected Benefit:</strong> {rec.expectedBenefit}</div>
              </div>

              {/* Evidence Box */}
              {rec.evidence && (
                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 flex flex-wrap gap-4 pt-1">
                  {rec.evidence.impressions !== undefined && <span>Impressions: {rec.evidence.impressions.toLocaleString()}</span>}
                  {rec.evidence.position !== undefined && <span>Avg Pos: {rec.evidence.position}</span>}
                  {rec.evidence.ctr !== undefined && <span>CTR: {rec.evidence.ctr}%</span>}
                  {rec.evidence.competitorCitations && <span>Competitors: {rec.evidence.competitorCitations.join(', ')}</span>}
                  {rec.evidence.technicalIssue && <span>Issue: {rec.evidence.technicalIssue}</span>}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-[#111622] rounded-2xl border border-gray-200 dark:border-gray-800 text-xs text-gray-500">
            No recommendations in this view. Click &ldquo;Regenerate Insights&rdquo; to scan for new opportunities.
          </div>
        )}
      </div>
    </div>
  );
}
