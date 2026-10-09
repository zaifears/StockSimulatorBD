'use client';

// components/admin/AnnouncementsAndPollsManager.tsx
// Comprehensive Admin Control Center for:
// 1. Live Announcements & Notices: CTR metrics, impression counters, and user interaction ledger.
// 2. Previous Community Polls & Surveys: Concluded domain poll #1 vote distribution and trader audit.

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  MousePointerClick,
  Eye,
  XCircle,
  Vote,
  Search,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  Star,
  Users,
  Copy,
  Check,
  Globe,
  Smartphone,
  Monitor,
  ExternalLink,
} from 'lucide-react';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import { VALID_DOMAIN_CHOICES } from '@/lib/surveyConstants';

interface NoticeInteraction {
  id: string;
  campaignId: string;
  action: 'click' | 'dismiss' | 'impression' | 'submit';
  uid: string | null;
  userEmail: string;
  displayName: string | null;
  clientIP: string | null;
  userAgent: string | null;
  metadata?: any;
  createdAtIso: string | null;
}

interface NoticeStats {
  totalImpressions: number;
  totalClicks: number;
  totalDismissals: number;
  totalSubmissions: number;
  ctr: number;
}

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

interface PollStats {
  totalResponses: number;
  averageExperience: number;
  choiceStats: ChoiceStat[];
}

export default function AnnouncementsAndPollsManager() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: 'announcements' or 'previous_poll'
  const [activeTab, setActiveTab] = useState<'announcements' | 'previous_poll'>('announcements');

  // Announcement interaction state
  const [noticeStats, setNoticeStats] = useState<NoticeStats>({
    totalImpressions: 0,
    totalClicks: 0,
    totalDismissals: 0,
    totalSubmissions: 0,
    ctr: 0,
  });
  const [interactions, setInteractions] = useState<NoticeInteraction[]>([]);
  const [interactionSearch, setInteractionSearch] = useState<string>('');
  const [interactionActionFilter, setInteractionActionFilter] = useState<string>('all');

  // Previous poll state
  const [pollStats, setPollStats] = useState<PollStats | null>(null);
  const [pollResponses, setPollResponses] = useState<SurveyResponse[]>([]);
  const [pollSearch, setPollSearch] = useState<string>('');
  const [pollChoiceFilter, setPollChoiceFilter] = useState<string>('all');

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchWithFreshToken('/api/admin/survey', {
        method: 'GET',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch admin notices and survey data');
      }

      if (data.announcement) {
        setNoticeStats(data.announcement.stats || {
          totalImpressions: 0,
          totalClicks: 0,
          totalDismissals: 0,
          totalSubmissions: 0,
          ctr: 0,
        });
        setInteractions(data.announcement.interactions || []);
      }

      if (data.previousPoll || data.stats) {
        setPollStats(data.previousPoll?.stats || data.stats || null);
        setPollResponses(data.previousPoll?.responses || data.responses || []);
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setError(err.message || 'Failed to load announcements & polls data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filtered interactions
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      if (interactionActionFilter !== 'all') {
        if (interactionActionFilter === 'cross') {
          if (item.action !== 'dismiss' || item.metadata?.reason !== 'cross_clicked_to_continue') return false;
        } else if (interactionActionFilter === 'dismiss') {
          if (item.action !== 'dismiss' || item.metadata?.reason === 'cross_clicked_to_continue') return false;
        } else if (item.action !== interactionActionFilter) {
          return false;
        }
      }
      if (interactionSearch.trim()) {
        const query = interactionSearch.toLowerCase().trim();
        const emailMatch = item.userEmail?.toLowerCase().includes(query);
        const nameMatch = item.displayName?.toLowerCase().includes(query);
        const uidMatch = item.uid?.toLowerCase().includes(query);
        const campaignMatch = item.campaignId?.toLowerCase().includes(query);
        const ipMatch = item.clientIP?.toLowerCase().includes(query);
        const labelMatch = item.metadata?.label?.toLowerCase().includes(query);
        const choiceMatch = item.metadata?.choiceLabel?.toLowerCase().includes(query);
        return emailMatch || nameMatch || uidMatch || campaignMatch || ipMatch || labelMatch || choiceMatch;
      }
      return true;
    });
  }, [interactions, interactionActionFilter, interactionSearch]);

  // Filtered poll responses
  const filteredPollResponses = useMemo(() => {
    return pollResponses.filter((r) => {
      if (pollChoiceFilter !== 'all' && r.domainChoice !== pollChoiceFilter) {
        return false;
      }
      if (pollSearch.trim()) {
        const query = pollSearch.toLowerCase().trim();
        const emailMatch = r.userEmail?.toLowerCase().includes(query);
        const nameMatch = r.displayName?.toLowerCase().includes(query);
        const uidMatch = r.uid?.toLowerCase().includes(query);
        const choiceMatch = r.domainChoiceLabelEn?.toLowerCase().includes(query);
        return emailMatch || nameMatch || uidMatch || choiceMatch;
      }
      return true;
    });
  }, [pollResponses, pollChoiceFilter, pollSearch]);

  // Export Interactions CSV
  const handleExportInteractionsCSV = () => {
    if (filteredInteractions.length === 0) return;
    const headers = ['Date (Dhaka Time)', 'User Email', 'Display Name', 'User UID', 'Action', 'Campaign ID', 'Client IP'];
    const rows = filteredInteractions.map((item) => {
      const dateStr = item.createdAtIso
        ? new Date(item.createdAtIso).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
        : 'N/A';
      return [
        `"${dateStr}"`,
        `"${item.userEmail}"`,
        `"${item.displayName || ''}"`,
        `"${item.uid || ''}"`,
        `"${item.action}"`,
        `"${item.campaignId}"`,
        `"${item.clientIP || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `notice-interactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Poll CSV
  const handleExportPollCSV = () => {
    if (filteredPollResponses.length === 0) return;
    const headers = ['Date (Dhaka Time)', 'User Email', 'User UID', 'Trading Experience', 'Domain Choice ID', 'Domain Choice'];
    const rows = filteredPollResponses.map((r) => {
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
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `poll-domain-renewal-results-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string, metadata?: any) => {
    switch (action) {
      case 'click':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <MousePointerClick className="w-3 h-3" />
              {metadata?.label ? `Clicked: "${metadata.label}"` : 'Clicked "Okay" / Link'}
            </span>
            {metadata?.href && (
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={metadata.href}>
                🔗 {metadata.href}
              </span>
            )}
          </div>
        );
      case 'dismiss':
        if (metadata?.reason === 'cross_clicked_to_continue') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <XCircle className="w-3 h-3" />
              Cross (X) / Continue
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
            <XCircle className="w-3 h-3" />
            Dismissed
          </span>
        );
      case 'submit':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
              <CheckCircle2 className="w-3 h-3" />
              Submitted Poll {metadata?.rating ? `(★ ${metadata.rating}/10)` : ''}
            </span>
            {metadata?.choiceLabel && (
              <span className="text-[10px] text-purple-600 dark:text-purple-300 truncate max-w-[200px]" title={metadata.choiceLabel}>
                Vote: {metadata.choiceLabel}
              </span>
            )}
          </div>
        );
      case 'impression':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Eye className="w-3 h-3" />
            Impression
          </span>
        );
    }
  };

  const getChoiceBadge = (choiceId: string) => {
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
    <div className="min-h-screen pt-20 sm:pt-28 pb-24 sm:pb-16 bg-gray-50/60 dark:bg-[#090E17] text-gray-900 dark:text-gray-100">
      
      {/* Top Breadcrumb & Page Header */}
      <div className="max-w-6xl mx-auto px-3.5 sm:px-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-gray-200 font-bold">Announcements & Polls</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 sm:gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </span>
              <span>Announcements & <span className="text-blue-600 dark:text-blue-400">Polls Hub</span></span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time user engagement telemetry for live announcements alongside historic community poll results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 active:scale-95 shadow-xs cursor-pointer"
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
        {/* KPI SUMMARY METRIC CARDS                                 */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Impressions */}
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Notice Impressions</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {noticeStats.totalImpressions.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Unique notice presentations</p>
          </div>

          {/* Card 2: CTA Clicks & CTR */}
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Clicks & CTR</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {noticeStats.totalClicks.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                ({noticeStats.ctr}%)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Direct CTA conversions</p>
          </div>

          {/* Card 3: Dismissals */}
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Dismissed</span>
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-700 dark:text-gray-300">
              {noticeStats.totalDismissals.toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Closed without conversion</p>
          </div>

          {/* Card 4: Historical Poll Responses */}
          <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Historic Poll Votes</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Vote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {pollStats?.totalResponses || 0}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Concluded Domain Poll #1</p>
          </div>

        </div>

        {/* ======================================================== */}
        {/* NAVIGATION TABS                                          */}
        {/* ======================================================== */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-white dark:bg-[#111622] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Active Announcement Interactions</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {interactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('previous_poll')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'previous_poll'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-white dark:bg-[#111622] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Previous Results: Domain Poll #1</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'previous_poll' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {pollStats?.totalResponses || 0}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ACTIVE ANNOUNCEMENT INTERACTIONS                  */}
        {/* ======================================================== */}
        {activeTab === 'announcements' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search and Action Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 shadow-xs">
              
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={interactionSearch}
                  onChange={(e) => setInteractionSearch(e.target.value)}
                  placeholder="Search by email, name, UID, or IP…"
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#161B24] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={interactionActionFilter}
                  onChange={(e) => setInteractionActionFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#161B24] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Actions</option>
                  <option value="click">Clicked "Okay" / Links</option>
                  <option value="cross">Cross (X) / Continue</option>
                  <option value="submit">Poll Submissions</option>
                  <option value="dismiss">Dismissed</option>
                  <option value="impression">Impressions Only</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportInteractionsCSV}
                  disabled={filteredInteractions.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 active:scale-95 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Interactions Table */}
            <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="px-4 sm:px-6 py-3.5">Trader Identity</th>
                      <th className="px-4 sm:px-6 py-3.5">Action Taken</th>
                      <th className="px-4 sm:px-6 py-3.5">Campaign ID</th>
                      <th className="px-4 sm:px-6 py-3.5">Device & Network</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">Timestamp (BST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs sm:text-sm">
                    {filteredInteractions.length > 0 ? (
                      filteredInteractions.map((item) => {
                        const dateFormatted = item.createdAtIso
                          ? new Date(item.createdAtIso).toLocaleString('en-US', {
                              timeZone: 'Asia/Dhaka',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A';

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                          >
                            <td className="px-4 sm:px-6 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {item.userEmail}
                                </span>
                                {item.displayName && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.displayName}
                                  </span>
                                )}
                                {item.uid && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-[10px] text-gray-400">
                                      UID: {item.uid.slice(0, 10)}…
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(item.uid!, item.id)}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                      title="Copy UID"
                                    >
                                      {copiedId === item.id ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                              {getActionBadge(item.action, item.metadata)}
                            </td>

                            <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {item.campaignId}
                              </span>
                            </td>

                            <td className="px-4 sm:px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex flex-col">
                                {item.clientIP && (
                                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                                    IP: {item.clientIP}
                                  </span>
                                )}
                                <span className="truncate max-w-[200px]" title={item.userAgent || ''}>
                                  {item.userAgent || '—'}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                              {dateFormatted}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Loading notice interactions…</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Sparkles className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                              <p className="text-sm font-semibold">No notice interactions recorded yet</p>
                              <p className="text-xs text-gray-400 max-w-sm">
                                As users see notices and click call-to-action buttons, their identities and actions will appear here in real-time.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PREVIOUS RESULT: DOMAIN POLL #1 (CONCLUDED)       */}
        {/* ======================================================== */}
        {activeTab === 'previous_poll' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Poll Status Banner */}
            <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                        Poll #1: Domain Renewal Dilemma & Trading Experience
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Concluded (Closed)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Historical results capturing community preference on the stocksimulator.tech domain transition.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-400">Average Experience:</span>
                    <div className="text-base font-extrabold text-amber-500 flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{pollStats?.averageExperience || 0} / 10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vote Distribution Progress Bars */}
              <div className="pt-5 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Vote Distribution Breakdown
                </h3>
                {pollStats?.choiceStats?.map((stat) => (
                  <div key={stat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {stat.labelEn}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {stat.count} votes ({stat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Poll Responses Search & Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 shadow-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={pollSearch}
                    onChange={(e) => setPollSearch(e.target.value)}
                    placeholder="Search poll submissions by email, name, or choice…"
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#161B24] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pollChoiceFilter}
                    onChange={(e) => setPollChoiceFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#161B24] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Options</option>
                    {VALID_DOMAIN_CHOICES.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.labelEn.slice(0, 30)}…
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleExportPollCSV}
                    disabled={filteredPollResponses.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-white dark:bg-[#111622] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-4 sm:px-6 py-3.5">Trader Identity</th>
                        <th className="px-4 sm:px-6 py-3.5 text-center">Experience</th>
                        <th className="px-4 sm:px-6 py-3.5">Domain Choice Preference</th>
                        <th className="px-4 sm:px-6 py-3.5 text-right">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs sm:text-sm">
                      {filteredPollResponses.length > 0 ? (
                        filteredPollResponses.map((r) => {
                          const dateFormatted = r.submittedAtIso
                            ? new Date(r.submittedAtIso).toLocaleString('en-US', {
                                timeZone: 'Asia/Dhaka',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A';

                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                            >
                              <td className="px-4 sm:px-6 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {r.userEmail}
                                  </span>
                                  {r.displayName && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {r.displayName}
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-gray-400">
                                    UID: {r.uid.slice(0, 10)}…
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 sm:px-6 py-3.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-500 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {r.tradingExperience} / 10
                                </span>
                              </td>

                              <td className="px-4 sm:px-6 py-3.5">
                                <span
                                  className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-xl border ${getChoiceBadge(
                                    r.domainChoice
                                  )}`}
                                >
                                  {r.domainChoiceLabelEn}
                                </span>
                              </td>

                              <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">
                                {dateFormatted}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400">
                            No poll responses matched your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
