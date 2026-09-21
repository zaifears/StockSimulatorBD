// app/admin/seo/keywords/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { KeyRound, Search, Sparkles, Tag, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';

const SEED_PRESETS = [
  'dse',
  'dse stock',
  'dse simulator',
  'dse paper trading',
  'bo account bd',
  'bangladesh stock market',
  'dse dividend',
  'how to trade dse',
];

export default function KeywordsPage() {
  const [seed, setSeed] = useState('dse');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (targetSeed: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithToken(`/api/admin/seo/keywords/autocomplete?seed=${encodeURIComponent(targetSeed)}`);
      const json = await res.json();
      if (json.success) {
        setSuggestions(json.suggestions || []);
      } else {
        setError(json.error || 'Failed to fetch suggestions');
      }
    } catch (err: any) {
      setError(err.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(seed);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (seed.trim()) {
      fetchSuggestions(seed.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#111622] p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-500" />
          Keyword Discovery & Search Intent Explorer
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Real-time Google Autocomplete discovery ($0 API). Used to uncover user questions and intent clusters.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative grow">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Enter seed term (e.g. dse trading, bo account, stock simulator)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-gray-50 dark:bg-[#161D2A] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0"
          >
            {loading ? 'Searching...' : 'Explore Keywords'}
          </button>
        </form>

        {/* Preset Seeds */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 font-medium mr-1">Popular Seeds:</span>
          {SEED_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSeed(preset);
                fetchSuggestions(preset);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                seed === preset
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 font-bold'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Suggestion Results Table */}
      <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
            Autocomplete Suggestions for &ldquo;{seed}&rdquo; ({suggestions.length})
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm">
            Live Google Autocomplete API
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#151C28] text-gray-500 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Suggested Query</th>
                <th className="py-3 px-4">Search Intent</th>
                <th className="py-3 px-4">Content Coverage</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {suggestions.map((item, idx) => {
                const isTransactional = item.intent === 'Transactional';
                const isCommercial = item.intent === 'Commercial';

                return (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#161D2A]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {item.keyword}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTransactional
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isCommercial
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      }`}>
                        {item.intent}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.hasDedicatedPage ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Covered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-semibold">
                          <Sparkles className="w-3.5 h-3.5" /> Content Gap Opportunity
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          setSeed(item.keyword);
                          fetchSuggestions(item.keyword);
                        }}
                        className="text-[11px] text-blue-500 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Deep Dive</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
