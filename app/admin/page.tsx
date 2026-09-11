'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { checkAdminMode } from '@/lib/admin';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import SiteAnalyticsSection, { SiteAnalyticsData } from '@/components/admin/SiteAnalyticsSection';
import {
  Users, Receipt, Banknote, Clock, CheckCircle2, XCircle, Zap,
  Home, Database, Link2, ShieldAlert, ArrowRight, Gift, Vote, Crown,
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
  const [siteAnalyticsLoading, setSiteAnalyticsLoading] = useState(true);
  const [siteAnalyticsError, setSiteAnalyticsError] = useState<string | null>(null);

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
    const fetchSiteAnalytics = async () => {
      if (!user || authLoading) return;

      setSiteAnalyticsLoading(true);
      setSiteAnalyticsError(null);
      try {
        const response = await fetchWithToken('/api/admin/site-analytics', { method: 'GET' });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.error || `Request failed (${response.status})`);
        }

        setSiteAnalytics(json);
      } catch (error: any) {
        console.error('Error fetching site analytics:', error);
        setSiteAnalyticsError(error.message || 'Failed to load site analytics');
      } finally {
        setSiteAnalyticsLoading(false);
      }
    };

    fetchSiteAnalytics();
  }, [user, authLoading]);

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

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/tier"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-300 shadow-lg shadow-amber-500/20 transform hover:-translate-y-1"
              >
                <Crown className="w-4 h-4 fill-current" />
                Boss Subscriptions
                {stats.pendingBossRequests > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                    {stats.pendingBossRequests}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/survey"
                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-[#1A1F26] border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
              >
                <Vote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Community Polls
                {stats.surveyResponses > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {stats.surveyResponses}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/promo-codes"
                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
              >
                <Gift className="w-4 h-4" />
                Promo Codes
              </Link>
              <Link
                href="/admin/recharge"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 transform hover:-translate-y-1"
              >
                <Banknote className="w-4 h-4" />
                Manage Recharges
                {stats.pendingRequests > 0 && (
                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                    {stats.pendingRequests}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-12 space-y-8">

        {/* 👑 TOP PRIORITY: Boss Tier Pipeline Card */}
        <div className="pt-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-[#1a2130] dark:to-[#131822] border-2 border-amber-500/40 dark:border-amber-500/30 p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-gray-950 shadow-md shrink-0">
                  <Crown className="w-7 h-7 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1.5">
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#111620] border border-amber-300 dark:border-amber-500/30 text-xs shadow-sm">
                  <span className="text-gray-500 dark:text-gray-400">Active Bosses:</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {stats.activeBossUsers}
                  </span>
                </div>

                <Link
                  href="/admin/tier"
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  <Crown className="w-4 h-4 fill-current" />
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
          </div>
        </div>

        {/* Top Level Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Users */}
          <div className="bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <Users className="w-24 h-24 text-blue-600" />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Total Recharge Requests */}
          <Link href="/admin/recharge" className="block bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <Receipt className="w-24 h-24 text-indigo-600" />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Requests</p>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalRequests.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Site Analytics — visits, engagement, registrations, coin leaderboard */}
        <SiteAnalyticsSection data={siteAnalytics} loading={siteAnalyticsLoading} error={siteAnalyticsError} />

        {/* Requests Breakdown */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-gray-400" />
            Recharge Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending */}
            <Link href="/admin/recharge/pending" className="block bg-white dark:bg-[#1A1F26] border border-orange-100 dark:border-orange-500/20 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Action Needed</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.pendingRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending reviews</p>
            </Link>

            {/* Approved */}
            <Link href="/admin/recharge/approved" className="block bg-white dark:bg-[#1A1F26] border border-green-100 dark:border-green-500/20 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">Approved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.approvedRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successfully processed</p>
            </Link>

            {/* Rejected */}
            <Link href="/admin/recharge/rejected" className="block bg-white dark:bg-[#1A1F26] border border-red-100 dark:border-red-500/20 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Rejected</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.rejectedRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Declined requests</p>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gray-400" />
            System Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            {/* Home Portal */}
            <a
              href="/"
              className="flex items-center gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group"
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
              className="flex items-center gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Recharges</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Process user transactions</div>
              </div>
            </a>

            {/* Firebase Console */}
            {isAdminMode && (
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl hover:border-amber-500 dark:hover:border-amber-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group"
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
