'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { checkAdminMode } from '@/lib/admin';
import { fetchWithToken, fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import SiteAnalyticsSection, { SiteAnalyticsData } from '@/components/admin/SiteAnalyticsSection';
import AnalyticsExportModal from '@/components/admin/AnalyticsExportModal';
import {
  generateAdminAnalyticsMarkdown,
  generateAdminAnalyticsJson,
  downloadAnalyticsFile,
} from '@/lib/utils/adminAnalyticsExporter';
import {
  Users, Receipt, Banknote, Clock, CheckCircle2, XCircle, Zap,
  Home, Database, Link2, ShieldAlert, ArrowRight, Gift, Vote, Crown,
  Check, X, Loader2, Copy, Search, LineChart, RefreshCw, Compass,
  FileText, Code2, Sparkles, Download,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalRequests: 0,
    surveyResponses: 0,
    pendingBossRequests: 0,
    activeBossUsers: 0,
  });
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteAnalytics, setSiteAnalytics] = useState<SiteAnalyticsData | null>(null);
  const [siteAnalyticsLoading, setSiteAnalyticsLoading] = useState(false);
  const [siteAnalyticsError, setSiteAnalyticsError] = useState<string | null>(null);
  const [analyticsActive, setAnalyticsActive] = useState(false);
  const [lastAnalyticsFetchedAt, setLastAnalyticsFetchedAt] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [quickExportFeedback, setQuickExportFeedback] = useState<string | null>(null);

  // Boss direct action states
  const [pendingBossRequests, setPendingBossRequests] = useState<any[]>([]);
  const [bossActionLoading, setBossActionLoading] = useState<string | null>(null);
  const [copiedBossTrx, setCopiedBossTrx] = useState<string | null>(null);
  const [quickEmail, setQuickEmail] = useState('');
  const [quickDays, setQuickDays] = useState(31);
  const [quickGrantLoading, setQuickGrantLoading] = useState(false);
  const [bossFeedback, setBossFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Real-time listener for pending Boss upgrade requests
  // 🔒 M-2: Only set up listener once isAdminMode is confirmed true.
  // Without this guard, any authenticated user who visits /admin (before the
  // auth redirect fires) opens a Firestore listener on boss_requests. Firestore
  // rules immediately deny it (no data leak), but it generates noisy
  // permission-denied errors in the console and wastes a listener slot.
  useEffect(() => {
    if (!user || authLoading || !isAdminMode) return;
    const q = query(
      collection(db, 'boss_requests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPendingBossRequests(list);
      },
      (err) => console.error('Error listening to pending boss requests:', err)
    );
    return () => unsub();
  }, [user, authLoading, isAdminMode]);


  const handleApproveBoss = async (req: any) => {
    setBossActionLoading(req.id);
    setBossFeedback(null);

    // ⚡️ Optimistic UI update: remove item immediately from table
    const previousPending = [...pendingBossRequests];
    setPendingBossRequests((prev) => prev.filter((r) => r.id !== req.id));
    setStats((prev) => ({
      ...prev,
      pendingBossRequests: Math.max(0, prev.pendingBossRequests - 1),
      activeBossUsers: prev.activeBossUsers + 1,
    }));

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId: req.id,
          userId: req.userId,
          durationDays: req.durationDays,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve Boss request');

      setBossFeedback({
        text: `Approved! ${req.userName || req.userEmail} is now active Boss for ${req.durationDays} days.`,
        type: 'success',
      });
    } catch (err: any) {
      setPendingBossRequests(previousPending);
      setStats((prev) => ({
        ...prev,
        pendingBossRequests: previousPending.length,
        activeBossUsers: Math.max(0, prev.activeBossUsers - 1),
      }));
      setBossFeedback({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setBossActionLoading(null);
    }
  };

  const handleRejectBoss = async (req: any) => {
    const reason = window.prompt('Rejection reason (optional):', 'Transaction ID not verified in bKash');
    if (reason === null) return;
    setBossActionLoading(req.id);
    setBossFeedback(null);

    // ⚡️ Optimistic UI update: remove item immediately from table
    const previousPending = [...pendingBossRequests];
    setPendingBossRequests((prev) => prev.filter((r) => r.id !== req.id));
    setStats((prev) => ({
      ...prev,
      pendingBossRequests: Math.max(0, prev.pendingBossRequests - 1),
    }));

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          requestId: req.id,
          rejectionReason: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reject request');

      setBossFeedback({ text: `Rejected request for ${req.userName || req.userEmail}.`, type: 'success' });
    } catch (err: any) {
      setPendingBossRequests(previousPending);
      setStats((prev) => ({
        ...prev,
        pendingBossRequests: previousPending.length,
      }));
      setBossFeedback({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setBossActionLoading(null);
    }
  };

  const handleQuickGrantByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = quickEmail.trim();
    if (!email) return;
    setQuickGrantLoading(true);
    setBossFeedback(null);
    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_grant',
          email: email,
          durationDays: quickDays,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to grant Boss tier');

      setBossFeedback({
        text: `👑 Success! Boss tier granted to ${email} for ${quickDays} days.`,
        type: 'success',
      });
      setQuickEmail('');
      setStats((prev) => ({ ...prev, activeBossUsers: prev.activeBossUsers + 1 }));
    } catch (err: any) {
      setBossFeedback({ text: err.message || 'Grant failed', type: 'error' });
    } finally {
      setQuickGrantLoading(false);
    }
  };

  // ✅ Redirect if auth loaded and no user or no admin mode
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || authLoading) return;

      try {
        const adminMode = await checkAdminMode(user.uid);
        setIsAdminMode(adminMode);

        // Get all users count & pipeline stats
        const [
          usersSnapshot,
          rechargeSnapshot,
          pendingSnapshot,
          approvedSnapshot,
          rejectedSnapshot,
          surveySnapshot,
          pendingBossSnapshot,
          activeBossSnapshot,
        ] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'recharge_requests')),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'approved'))),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'rejected'))),
          getCountFromServer(collection(db, 'survey_responses')).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(query(collection(db, 'boss_requests'), where('status', '==', 'pending'))).catch(() => ({ data: () => ({ count: 0 }) })),
          getCountFromServer(query(collection(db, 'users'), where('accountTier', '==', 'Boss'))).catch(() => ({ data: () => ({ count: 0 }) })),
        ]);

        const totalUsers = usersSnapshot.data().count;
        console.log(`📊 Admin Dashboard - Total users: ${totalUsers}`);

        setStats({
          totalUsers,
          pendingRequests: pendingSnapshot.data().count,
          approvedRequests: approvedSnapshot.data().count,
          rejectedRequests: rejectedSnapshot.data().count,
          totalRequests: rechargeSnapshot.data().count,
          surveyResponses: surveySnapshot.data().count,
          pendingBossRequests: pendingBossSnapshot.data().count,
          activeBossUsers: activeBossSnapshot.data().count,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_analytics_active');
      if (saved === 'true') {
        setAnalyticsActive(true);
      }
    } catch {}
  }, []);

  const fetchSiteAnalytics = useCallback(
    async (forceFresh: boolean = false) => {
      if (!user || authLoading) return;

      setSiteAnalyticsLoading(true);
      setSiteAnalyticsError(null);
      try {
        const url = forceFresh ? '/api/admin/site-analytics?fresh=true' : '/api/admin/site-analytics';
        const response = await fetchWithToken(url, { method: 'GET' });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || `Request failed (${response.status})`);
        }

        setSiteAnalytics(json);
        setLastAnalyticsFetchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (error: any) {
        console.error('Error fetching site analytics:', error);
        setSiteAnalyticsError(error.message || 'Failed to load site analytics');
      } finally {
        setSiteAnalyticsLoading(false);
      }
    },
    [user, authLoading]
  );

  useEffect(() => {
    if (analyticsActive) {
      fetchSiteAnalytics();
    }
  }, [analyticsActive, fetchSiteAnalytics]);

  const handleEnableAnalytics = () => {
    setAnalyticsActive(true);
    try {
      localStorage.setItem('admin_analytics_active', 'true');
    } catch {}
  };

  const handleDisableAnalytics = () => {
    setAnalyticsActive(false);
    try {
      localStorage.setItem('admin_analytics_active', 'false');
    } catch {}
  };

  const handleQuickExportMarkdown = async () => {
    if (!siteAnalytics) {
      alert('Analytics data is not loaded yet. Please wait or click Refresh.');
      return;
    }
    try {
      const content = generateAdminAnalyticsMarkdown(siteAnalytics, stats);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const dateTag = new Date().toISOString().split('T')[0];
        downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.md`, content, 'text/markdown;charset=utf-8');
      }
      setQuickExportFeedback('Markdown copied to clipboard!');
      setTimeout(() => setQuickExportFeedback(null), 3000);
    } catch {
      setIsExportModalOpen(true);
    }
  };

  const handleQuickExportJson = async () => {
    if (!siteAnalytics) {
      alert('Analytics data is not loaded yet. Please wait or click Refresh.');
      return;
    }
    try {
      const content = generateAdminAnalyticsJson(siteAnalytics, stats);
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        const dateTag = new Date().toISOString().split('T')[0];
        downloadAnalyticsFile(`stocksimulatorbd-analytics-${dateTag}.json`, content, 'application/json;charset=utf-8');
      }
      setQuickExportFeedback('JSON copied to clipboard!');
      setTimeout(() => setQuickExportFeedback(null), 3000);
    } catch {
      setIsExportModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-8 flex items-center justify-center bg-white dark:bg-[#090E17]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-indigo-500 animate-spin reverse"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Syncing Admin Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#090E17]">
      {/* Header Section — grid + ambient glow, matching the homepage hero treatment */}
      <div className="relative border-b border-gray-100 dark:border-gray-800/60 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-full max-w-md h-[220px] bg-blue-500/10 dark:bg-blue-600/15 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 sm:pt-28 pb-6 sm:pb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Center</span>
                </h1>
                {isAdminMode && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Admin Mode
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-200">{user?.displayName || 'Admin'}</span>. Here's what's happening.
              </p>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
              <Link
                href="/admin/seo"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-105 text-white px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-blue-500/25 active:scale-95"
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span className="truncate">SEO Analytics</span>
              </Link>

              <Link
                href="/admin/tier"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-amber-500/20 active:scale-95"
              >
                <Crown className="w-4 h-4 fill-current shrink-0" />
                <span className="truncate">Boss Tier</span>
                {stats.pendingBossRequests > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                    {stats.pendingBossRequests}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/recharge"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/25 active:scale-95"
              >
                <Banknote className="w-4 h-4 shrink-0" />
                <span className="truncate">Recharges</span>
                {stats.pendingRequests > 0 && (
                  <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {stats.pendingRequests}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/survey"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
              >
                <Vote className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="truncate">Polls</span>
                {stats.surveyResponses > 0 && (
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {stats.surveyResponses}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/promo-codes"
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
              >
                <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Promo Codes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3.5 sm:px-4 pb-24 sm:pb-12 space-y-6 sm:space-y-8">

        {/* 👑 TOP PRIORITY: Boss Tier Pipeline Card */}
        <div className="pt-4 sm:pt-8">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-[#1a2130] dark:to-[#131822] border-2 border-amber-500/40 dark:border-amber-500/30 p-4 sm:p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 flex items-center justify-center text-gray-950 shadow-md shrink-0">
                  <Crown className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      Boss Tier Subscriptions
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-gray-950">
                      Tier Pipeline
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
                    Verify bKash transactions, activate 31-day (৳20) and 185-day (৳99) Boss memberships, or override user tiers manually.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 rounded-xl sm:rounded-2xl bg-white dark:bg-[#111620] border border-amber-300 dark:border-amber-500/30 text-xs shadow-sm">
                  <span className="text-gray-500 dark:text-gray-400">Active Bosses:</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {stats.activeBossUsers}
                  </span>
                </div>

                <Link
                  href="/admin/tier"
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 min-h-[44px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Crown className="w-4 h-4 fill-current shrink-0" />
                  <span>Review Subscriptions</span>
                  {stats.pendingBossRequests > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                      {stats.pendingBossRequests} Action Needed
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </Link>
              </div>
            </div>

            {/* Feedback message banner */}
            {bossFeedback && (
              <div
                className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border ${
                  bossFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>{bossFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setBossFeedback(null)}
                  className="opacity-70 hover:opacity-100 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Direct Pending Requests List */}
            {pendingBossRequests.length > 0 && (
              <div className="mt-5 pt-5 border-t border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Pending Boss Upgrades ({pendingBossRequests.length})
                  </h3>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">Direct 1-Click Verification</span>
                </div>
                <div className="space-y-2.5">
                  {pendingBossRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#111620] border border-amber-300/50 dark:border-amber-500/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-extrabold text-xs text-gray-900 dark:text-white">
                            {req.userName}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 break-all">
                            ({req.userEmail})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px]">
                          <span className="font-bold text-amber-600 dark:text-amber-400">{req.planName}</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-white">৳{req.amount}</span>
                          <span className="text-gray-400 hidden xs:inline">•</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {req.paymentMethod || 'bKash Send Money'}
                          </span>
                          {req.bankName && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                              🏦 {req.bankName}
                            </span>
                          )}
                          <span className="text-gray-400 hidden xs:inline">•</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] break-all">
                            Trx: {req.transactionId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(req.transactionId);
                              setCopiedBossTrx(req.id);
                              setTimeout(() => setCopiedBossTrx(null), 2000);
                            }}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5 active:scale-95 py-0.5 px-1.5 rounded bg-blue-50 dark:bg-blue-900/30"
                          >
                            {copiedBossTrx === req.id ? '✓ Copied' : 'Copy Trx'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80">
                        <button
                          type="button"
                          disabled={bossActionLoading === req.id}
                          onClick={() => handleApproveBoss(req)}
                          className="flex-1 sm:flex-none justify-center px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                          {bossActionLoading === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={bossActionLoading === req.id}
                          onClick={() => handleRejectBoss(req)}
                          className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Email Upgrade Bar */}
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-500" />
                <span>Direct Search & Grant Boss Tier by User Email</span>
              </div>
              <form onSubmit={handleQuickGrantByEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="Enter trader's registered email..."
                    className="w-full px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111620] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <select
                  value={quickDays}
                  onChange={(e) => setQuickDays(Number(e.target.value))}
                  className="px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111620] text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                >
                  <option value={31}>1 Month (31 Days)</option>
                  <option value={185}>6 Months (185 Days)</option>
                  <option value={365}>1 Year (365 Days)</option>
                  <option value={7}>7 Days (Trial)</option>
                </select>
                <button
                  type="submit"
                  disabled={quickGrantLoading || !quickEmail.trim()}
                  className="px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {quickGrantLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5 fill-current" />}
                  <span>Grant Boss</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Top Level Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Total Users */}
          <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <Users className="w-24 h-24 text-blue-600" />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Total Recharge Requests */}
          <Link href="/admin/recharge" className="block bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300 active:scale-[0.99]">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <Receipt className="w-24 h-24 text-indigo-600" />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Requests</p>
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{stats.totalRequests.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Site Analytics — On-Demand Mode to conserve Firestore reads */}
        {!analyticsActive ? (
          <div className="bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Site &amp; Trading Analytics</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                      On-Demand
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl leading-relaxed">
                    Analytics is paused on visit so reviewing bKash recharges and Boss subscriptions consumes zero Firestore reads. Turn on anytime to view live visitor rollups, traffic sources, and trading metrics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnableAnalytics}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Zap className="w-4 h-4 fill-current" />
                Turn On Analytics
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Analytics Live {lastAnalyticsFetchedAt ? `• Updated ${lastAnalyticsFetchedAt}` : ''}</span>
                {quickExportFeedback && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md animate-in fade-in">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {quickExportFeedback}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {/* Export Options for LLM / AI Analysis */}
                <button
                  type="button"
                  onClick={handleQuickExportMarkdown}
                  disabled={!siteAnalytics || siteAnalyticsLoading}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Copy formatted Markdown brief with prompt for ChatGPT / Claude / Gemini"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export as Markdown</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickExportJson}
                  disabled={!siteAnalytics || siteAnalyticsLoading}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Copy complete structured JSON data"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Export as JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={!siteAnalytics || siteAnalyticsLoading}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Open full preview, prompt inspector, and download options"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Export Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => fetchSiteAnalytics(true)}
                  disabled={siteAnalyticsLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${siteAnalyticsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleDisableAnalytics}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  Pause / Turn Off
                </button>
              </div>
            </div>

            <SiteAnalyticsSection
              data={siteAnalytics}
              loading={siteAnalyticsLoading}
              error={siteAnalyticsError}
              onRefresh={() => fetchSiteAnalytics(true)}
            />

            <AnalyticsExportModal
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              data={siteAnalytics}
              stats={stats}
              loading={siteAnalyticsLoading}
            />
          </div>
        )}

        {/* Requests Breakdown */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            Recharge Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Pending */}
            <Link href="/admin/recharge/pending" className="block bg-white dark:bg-[#1A1F26] border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 active:scale-[0.99]">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400">Action Needed</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.pendingRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending reviews</p>
            </Link>

            {/* Approved */}
            <Link href="/admin/recharge/approved" className="block bg-white dark:bg-[#1A1F26] border border-green-100 dark:border-green-500/20 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 active:scale-[0.99]">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">Approved</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.approvedRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successfully processed</p>
            </Link>

            {/* Rejected */}
            <Link href="/admin/recharge/rejected" className="block bg-white dark:bg-[#1A1F26] border border-red-100 dark:border-red-500/20 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 active:scale-[0.99]">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">Rejected</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.rejectedRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Declined requests</p>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            System Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">

            {/* Home Portal */}
            <a
              href="/"
              className="flex items-center gap-3.5 sm:gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-3.5 sm:p-4 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Return Home</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Go back to the main site</div>
              </div>
            </a>

            {/* Manage Recharges Link */}
            <a
              href="/admin/recharge"
              className="flex items-center gap-3.5 sm:gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-3.5 sm:p-4 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group relative overflow-hidden active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Recharges</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Process user transactions</div>
              </div>
            </a>

            {/* Promo Codes */}
            <Link
              href="/admin/promo-codes"
              className="flex items-center gap-3.5 sm:gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-3.5 sm:p-4 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Promo Codes</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Coins & Boss Tier Promos</div>
              </div>
            </Link>

            {/* SEO Intelligence Center */}
            <Link
              href="/admin/seo"
              className="flex items-center gap-3.5 sm:gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-3.5 sm:p-4 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">SEO Analytics</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Search & GEO/LLM Intelligence</div>
              </div>
            </Link>

            {/* Firebase Console */}
            {isAdminMode && (
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 sm:gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-3.5 sm:p-4 rounded-2xl hover:border-amber-500 dark:hover:border-amber-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">Database</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> External Access
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto group-hover:translate-x-1 transition-transform" />
              </a>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
