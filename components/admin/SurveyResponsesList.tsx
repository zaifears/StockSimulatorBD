'use client';

// components/admin/SurveyResponsesList.tsx
// Admin dashboard view for /trade community polls and surveys.
// Each poll is organized under its own named dropdown/accordion section with
// dedicated summary metrics, vote breakdown bars, search/filter table, and CSV export.

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Home,
  Star,
  Users,
  Vote,
  Download,
  Search,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  CheckCircle2,
  Layers,
  PlusCircle,
} from 'lucide-react';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import { VALID_DOMAIN_CHOICES } from '@/lib/surveyConstants';

interface SurveyResponse {
  id: string;
  uid: string;
  userEmail: string;
  displayName: string | null;
  tradingExperience: number;
  domainChoice: string;
  domainChoiceLabelEn: string;
  domainChoiceLabelBn: string;
  submittedAtIso: string | null;
}

interface ChoiceStat {
  id: string;
  labelEn: string;
  labelBn: string;
  count: number;
  percentage: number;
}

interface SurveyStats {
  totalResponses: number;
  averageExperience: number;
  choiceStats: ChoiceStat[];
}

export default function SurveyResponsesList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');

  // Dropdown open state for Poll #1 (expanded by default)
  const [isPoll1Open, setIsPoll1Open] = useState(true);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchWithFreshToken('/api/survey/trade-questionnaire');
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch survey responses');
      }

      setStats(data.stats);
      setResponses(data.responses || []);
    } catch (err: any) {
      console.error('Error fetching survey data:', err);
      setError(err.message || 'Failed to load survey data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered responses for Poll #1
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      const matchesFilter = selectedFilter === 'all' || r.domainChoice === selectedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.userEmail.toLowerCase().includes(q) ||
        r.domainChoiceLabelEn.toLowerCase().includes(q) ||
        r.domainChoiceLabelBn.toLowerCase().includes(q) ||
        r.uid.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [responses, selectedFilter, searchQuery]);

  // CSV Export for Poll #1
  const handleExportCSV = () => {
    if (responses.length === 0) return;

    const headers = [
      'Date (Dhaka Time)',
      'User Email',
      'User UID',
      'Trading Experience (1-10)',
      'Domain Choice (ID)',
      'Domain Choice (EN)',
      'Domain Choice (BN)',
    ];
    const rows = responses.map((r) => {
      const dateStr = r.submittedAtIso
        ? new Date(r.submittedAtIso).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
        : 'N/A';
      return [
        `"${dateStr}"`,
        `"${r.userEmail}"`,
        `"${r.uid}"`,
        r.tradingExperience,
        `"${r.domainChoice}"`,
        `"${(r.domainChoiceLabelEn || '').replace(/"/g, '""')}"`,
        `"${(r.domainChoiceLabelBn || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `poll-1-domain-renewal-responses-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getOptionBadgeColor = (choiceId: string) => {
    switch (choiceId) {
      case 'shahoriar_bd':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'beg_crowdfund':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'vercel_app':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    // pt-24 sm:pt-28 ensures full clearance below the fixed ModernNavbar (fixed top-0)
    <div className="min-h-screen pt-24 sm:pt-28 pb-16 bg-gray-50/60 dark:bg-[#090E17] text-gray-900 dark:text-gray-100">
      
      {/* Top Breadcrumb & Page Title Container */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
          <Link
            href="/admin"
            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Command Center
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-gray-200 font-bold">Community Polls & Surveys</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Vote className="w-5 h-5" />
              </span>
              Community Polls <span className="text-blue-600 dark:text-blue-400">Archive</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Organized archive of /trade community polls. Each poll is categorized under its own dropdown section.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ======================================================== */}
        {/* POLL #1 DROPDOWN ACCORDION SECTION                        */}
        {/* ======================================================== */}
        <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden transition-all duration-300">
          
          {/* Collapsible Dropdown Header */}
          <div
            onClick={() => setIsPoll1Open((prev) => !prev)}
            className="p-5 sm:p-6 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 mt-0.5 sm:mt-0">
                <Layers className="w-5 h-5" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                    Poll #1: Domain Renewal Dilemma & Trading Experience
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Concluded (Banner Removed)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    September 2026
                  </span>
                  <span>•</span>
                  <span>Surface: <strong className="text-gray-700 dark:text-gray-300">/trade</strong></span>
                  <span>•</span>
                  <span>
                    Total Votes: <strong className="text-blue-600 dark:text-blue-400">{loading ? '...' : (stats?.totalResponses || 0)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Avg Rating: <strong className="text-amber-500">{loading ? '...' : (stats?.averageExperience || 0)}★</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Dropdown Indicator Button */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 hidden sm:inline">
                {isPoll1Open ? 'Collapse Data' : 'View Poll Data'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-transform duration-200">
                {isPoll1Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {/* Collapsible Dropdown Content Body */}
          {isPoll1Open && (
            <div className="border-t border-gray-100 dark:border-gray-800/80 p-5 sm:p-7 space-y-6 bg-gray-50/40 dark:bg-[#0E131C]/60 animate-in fade-in duration-200">
              
              {/* Poll Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200/70 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Prompt: <span className="italic text-gray-700 dark:text-gray-300">&ldquo;stocksimulator.tech is going to expire... which domain to choose?&rdquo;</span> + 1–10 star trading experience.
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={responses.length === 0 || loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Poll #1 CSV
                </button>
              </div>

              {/* Overview Metric Cards for Poll #1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Total Responses */}
                <div className="bg-white dark:bg-[#1A1F2B] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Submissions</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold mt-3">
                    {loading ? '...' : (stats?.totalResponses || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Unique authenticated accounts</p>
                </div>

                {/* Average Trading Experience */}
                <div className="bg-white dark:bg-[#1A1F2B] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Experience</span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {loading ? '...' : (stats?.averageExperience || 0)}
                    </div>
                    <span className="text-sm font-semibold text-gray-400">/ 10 stars</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-amber-400">
                    {Array.from({ length: 5 }, (_, i) => {
                      const filled = (stats?.averageExperience || 0) >= (i + 1) * 2;
                      return (
                        <Star key={i} className={`w-3.5 h-3.5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                      );
                    })}
                  </div>
                </div>

                {/* Leading Option */}
                <div className="bg-white dark:bg-[#1A1F2B] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Choice</span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Vote className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    {loading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : stats && stats.choiceStats.length > 0 ? (
                      (() => {
                        const top = [...stats.choiceStats].sort((a, b) => b.count - a.count)[0];
                        if (!top || top.count === 0) return <div className="text-sm text-gray-400">No votes yet</div>;
                        return (
                          <div>
                            <div className="text-base font-bold truncate text-indigo-600 dark:text-indigo-400">
                              {top.id === 'shahoriar_bd'
                                ? 'stocksimulator.shahoriar.bd'
                                : top.id === 'beg_crowdfund'
                                ? 'Crowdfund / Ask internet'
                                : 'stocksimulatorbd.vercel.app'}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {top.count} votes ({top.percentage}%)
                            </p>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-sm text-gray-400">No votes yet</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Domain Voting Breakdown Bars */}
              <div className="bg-white dark:bg-[#1A1F2B] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm sm:text-base font-bold">Domain Renewal Dilemma Vote Distribution</h3>
                </div>

                <div className="space-y-4">
                  {stats?.choiceStats?.map((opt, idx) => {
                    const barColor =
                      opt.id === 'shahoriar_bd'
                        ? 'bg-blue-600'
                        : opt.id === 'beg_crowdfund'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                    return (
                      <div key={opt.id} className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm font-semibold gap-1">
                          <span className="text-gray-800 dark:text-gray-200">
                            <span className="font-bold text-gray-500 mr-1.5">{idx + 1}.</span>
                            {opt.labelEn}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white shrink-0">
                            {opt.count} votes ({opt.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                            style={{ width: `${Math.max(opt.percentage, 0)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          {opt.labelBn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filter and Submissions Table */}
              <div className="bg-white dark:bg-[#1A1F2B] border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                  {/* Filter Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        selectedFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      All ({responses.length})
                    </button>
                    {VALID_DOMAIN_CHOICES.map((choice, i) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => setSelectedFilter(choice.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          selectedFilter === choice.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        Option {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search email, choice..."
                      className="w-full h-9 pl-8 pr-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="text-xs">Loading responses...</span>
                  </div>
                ) : filteredResponses.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 text-sm">
                    No survey responses match the filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] uppercase tracking-wider text-gray-400">
                          <th className="py-3 px-3 font-bold">Time (Dhaka)</th>
                          <th className="py-3 px-3 font-bold">User</th>
                          <th className="py-3 px-3 font-bold text-center">Experience</th>
                          <th className="py-3 px-3 font-bold">Voted Option</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                        {filteredResponses.map((res) => {
                          const dateFormatted = res.submittedAtIso
                            ? new Date(res.submittedAtIso).toLocaleString('en-US', {
                                timeZone: 'Asia/Dhaka',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : 'N/A';

                          return (
                            <tr key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                              <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">
                                {dateFormatted}
                              </td>
                              <td className="py-3.5 px-3 font-medium">
                                <div className="text-gray-900 dark:text-gray-100">{res.userEmail}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{res.uid}</div>
                              </td>
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  {res.tradingExperience} / 10
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-semibold ${getOptionBadgeColor(res.domainChoice)}`}>
                                  {res.domainChoiceLabelEn}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* FUTURE POLLS EXTENSION PLACEHOLDER                       */}
        {/* ======================================================== */}
        <div className="bg-white/60 dark:bg-[#111622]/40 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-7 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800/80 text-gray-400 flex items-center justify-center mx-auto">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Future Community Polls
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            Whenever you run a new questionnaire on /trade or elsewhere, another dropdown section will be created right here, keeping historical data and analytics organized.
          </p>
        </div>

      </div>
    </div>
  );
}
