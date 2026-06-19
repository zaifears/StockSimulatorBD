'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { checkGodMode } from '@/lib/admin';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalRequests: 0
  });
  const [isGodMode, setIsGodMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Redirect if auth loaded and no user or no god mode
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || authLoading) return;

      try {
        const godMode = await checkGodMode(user.uid);
        setIsGodMode(godMode);

        // Get all users count
        const [usersSnapshot, rechargeSnapshot, pendingSnapshot, approvedSnapshot, rejectedSnapshot] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'recharge_requests')),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'approved'))),
          getCountFromServer(query(collection(db, 'recharge_requests'), where('status', '==', 'rejected')))
        ]);

        const totalUsers = usersSnapshot.data().count;
        console.log(`📊 Admin Dashboard - Total users: ${totalUsers}`);

        setStats({
          totalUsers,
          pendingRequests: pendingSnapshot.data().count,
          approvedRequests: approvedSnapshot.data().count,
          rejectedRequests: rejectedSnapshot.data().count,
          totalRequests: rechargeSnapshot.data().count
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 pb-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin reverse"></div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Syncing Admin Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-gray-50/50 dark:bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 dark:border-gray-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                Command Center
              </h1>
              {isGodMode && (
                <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  GOD MODE
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-200">{user?.displayName || 'Admin'}</span>. Here's what's happening.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="/admin/recharge"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Manage Recharges
              {stats.pendingRequests > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {stats.pendingRequests}
                </span>
              )}
            </a>
          </div>
        </div>

        {/* Top Level Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Users */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 2c-4.42 0-13 2.21-13 6v2h26v-2c0-3.79-8.58-6-13-6z"/></svg>
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Users</p>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
          </div>

          {/* Total Recharge Requests */}
          <Link href="/admin/recharge" className="block bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 transition-transform group-hover:scale-110 duration-500">
              <svg className="w-24 h-24 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Requests</p>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalRequests.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Requests Breakdown */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Recharge Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending */}
            <Link href="/admin/recharge/pending" className="block bg-white dark:bg-[#111] border border-orange-100 dark:border-orange-500/20 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Action Needed</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.pendingRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending reviews</p>
            </Link>

            {/* Approved */}
            <Link href="/admin/recharge/approved" className="block bg-white dark:bg-[#111] border border-green-100 dark:border-green-500/20 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">Approved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.approvedRequests}</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successfully processed</p>
            </Link>

            {/* Rejected */}
            <Link href="/admin/recharge/rejected" className="block bg-white dark:bg-[#111] border border-red-100 dark:border-red-500/20 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            System Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Home Portal */}
            <a
              href="/"
              className="flex items-center gap-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Return Home</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Go back to the main site</div>
              </div>
            </a>

            {/* Manage Recharges Link */}
            <a
              href="/admin/recharge"
              className="flex items-center gap-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 transition-colors group relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-purple-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm">Recharges</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Process user transactions</div>
              </div>
            </a>

            {/* Firebase Console */}
            {isGodMode && (
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-4 rounded-xl hover:border-amber-500 dark:hover:border-amber-500 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-amber-500 group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">Database</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> External Access
                  </div>
                </div>
              </a>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
