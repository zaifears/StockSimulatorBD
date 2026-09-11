'use client';

// components/admin/TierList.tsx
// Comprehensive admin interface to manage Boss tier subscription requests and manual grants.

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, orderBy, onSnapshot, where,
  doc, getDoc,
} from 'firebase/firestore';
import {
  Crown, Shield, Check, X, Clock, CheckCircle2, XCircle,
  Copy, Search, ArrowLeft, Loader2, UserCheck, UserX, AlertTriangle,
  Flame, RefreshCw,
} from 'lucide-react';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import BossBadge from '@/components/ui/BossBadge';

type TierTab = 'pending' | 'approved' | 'rejected' | 'manual';

interface BossRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  durationDays: number;
  transactionId: string;
  bkashNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export default function TierList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TierTab>('pending');
  const [requests, setRequests] = useState<BossRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Manual grant state
  const [manualQuery, setManualQuery] = useState('');
  const [manualUserDoc, setManualUserDoc] = useState<any>(null);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualDays, setManualDays] = useState(31);
  const [filterQuery, setFilterQuery] = useState('');

  // Counts
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [stats, setStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    activeBossCount: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithFreshToken('/api/admin/tier', { method: 'GET' });
      const json = await res.json();
      if (json.success && json.stats) {
        setStats(json.stats);
      }
    } catch (err) {
      console.error('Failed to fetch tier stats:', err);
    }
  }, []);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  // Real-time listener for requests
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const baseCol = collection(db, 'boss_requests');
    const q = activeTab === 'manual'
      ? query(baseCol, orderBy('createdAt', 'desc'))
      : query(baseCol, where('status', '==', activeTab), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BossRequest[];
        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching boss requests:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeTab]);

  // Real-time count badges
  useEffect(() => {
    if (!user) return;
    const baseCol = collection(db, 'boss_requests');
    const unsubPending = onSnapshot(query(baseCol, where('status', '==', 'pending')), (s) => {
      setCounts((prev) => ({ ...prev, pending: s.size }));
    });
    const unsubApproved = onSnapshot(query(baseCol, where('status', '==', 'approved')), (s) => {
      setCounts((prev) => ({ ...prev, approved: s.size }));
    });
    const unsubRejected = onSnapshot(query(baseCol, where('status', '==', 'rejected')), (s) => {
      setCounts((prev) => ({ ...prev, rejected: s.size }));
    });

    return () => {
      unsubPending();
      unsubApproved();
      unsubRejected();
    };
  }, [user]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAction = async (
    action: 'approve' | 'reject',
    req: BossRequest,
    rejectionReason?: string
  ) => {
    setActionInProgress(req.id);
    setMessage(null);

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          requestId: req.id,
          userId: req.userId,
          durationDays: req.durationDays,
          rejectionReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to process action');

      setMessage({
        text: action === 'approve'
          ? `Approved! ${req.userName} is now on Boss tier for ${req.durationDays} days.`
          : `Request from ${req.userName} has been rejected.`,
        type: 'success',
      });
      fetchStats();
    } catch (err: any) {
      setMessage({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryTerm = manualQuery.trim();
    if (!queryTerm) return;

    setManualSearching(true);
    setManualUserDoc(null);
    setMessage(null);

    try {
      const res = await fetchWithFreshToken(`/api/admin/tier?search=${encodeURIComponent(queryTerm)}`, {
        method: 'GET',
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.user) {
        throw new Error(json.error || `No user found matching: "${queryTerm}"`);
      }
      setManualUserDoc(json.user);
    } catch (err: any) {
      setMessage({ text: err.message || 'Search failed', type: 'error' });
    } finally {
      setManualSearching(false);
    }
  };

  const handleManualGrant = async (action: 'manual_grant' | 'revoke') => {
    if (!manualUserDoc?.id) return;
    setActionInProgress('manual');
    setMessage(null);

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: manualUserDoc.id,
          durationDays: manualDays,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed');

      setMessage({
        text: action === 'manual_grant'
          ? `Success! Granted Boss tier to ${manualUserDoc.name || manualUserDoc.email || manualUserDoc.id} for ${manualDays} days.`
          : `Success! Reverted ${manualUserDoc.name || manualUserDoc.email || manualUserDoc.id} to Bro tier.`,
        type: 'success',
      });

      // Refresh doc from backend
      const refreshRes = await fetchWithFreshToken(`/api/admin/tier?search=${encodeURIComponent(manualUserDoc.id)}`, { method: 'GET' });
      const refreshJson = await refreshRes.json();
      if (refreshJson.success && refreshJson.user) {
        setManualUserDoc(refreshJson.user);
      }
      fetchStats();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Crown className="w-7 h-7 text-amber-500 fill-current" />
              <span>Boss Tier Subscriptions</span>
            </h1>
            <BossBadge size="sm" interactive={false} />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Verify bKash transaction IDs, activate Boss memberships, and manage user tier privileges.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <Link
            href="/boss"
            target="_blank"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>View /boss Page</span>
          </Link>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl mb-6 text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Pending Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <span>{counts.pending}</span>
            {counts.pending > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                Action Needed
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Active Boss Users</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {stats.activeBossCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Approved Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {counts.approved}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Rejected / Declined</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {counts.rejected}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-gray-950 shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Requests</span>
          {counts.pending > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
              {counts.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
          <span className="text-[10px] opacity-75 font-mono font-bold">({counts.approved})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
          <span className="text-[10px] opacity-75 font-mono font-bold">({counts.rejected})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Email / UID & Grant</span>
        </button>
      </div>

      {/* Tab: Manual User Grant */}
      {activeTab === 'manual' && (
        <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            <span>Search User by Email or UID & Direct Tier Override</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            Look up any registered trader by their email address (e.g. user@gmail.com) or Firebase UID to grant or revoke Boss access instantly.
          </p>

          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Enter user email (e.g. trader@gmail.com) or Firebase UID..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2130] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={manualSearching || !manualQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {manualSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search & Inspect</span>
            </button>
          </form>

          {manualUserDoc && (
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{manualUserDoc.name || 'Anonymous User'}</span>
                    {manualUserDoc.accountTier === 'Boss' ? (
                      <BossBadge size="xs" interactive={false} />
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                        Bro Tier (Free)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{manualUserDoc.email}</div>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5">UID: {manualUserDoc.id}</div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <div className="text-gray-400">Boss Status:</div>
                  {manualUserDoc.bossUntil && manualUserDoc.bossUntil > Date.now() ? (
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      Active until {new Date(manualUserDoc.bossUntil).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">Not active</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Duration:</label>
                  <select
                    value={manualDays}
                    onChange={(e) => setManualDays(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131822] text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value={31}>1 Month (31 Days)</option>
                    <option value={185}>6 Months (185 Days)</option>
                    <option value={365}>365 Days (1 Year)</option>
                    <option value={7}>7 Days (Trial)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleManualGrant('manual_grant')}
                  disabled={actionInProgress === 'manual'}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>Grant Boss Access</span>
                </button>

                {manualUserDoc.accountTier === 'Boss' && (
                  <button
                    type="button"
                    onClick={() => handleManualGrant('revoke')}
                    disabled={actionInProgress === 'manual'}
                    className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Revoke to Bro</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search/Filter Bar for Requests */}
      {activeTab !== 'manual' && requests.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter requests by trader name, email, plan, or bKash TrxID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131822] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>Syncing requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
            <Crown className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
            No {activeTab} Boss requests
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeTab === 'pending'
              ? 'All clear! No pending Boss subscription requests waiting for verification.'
              : `No requests with status '${activeTab}' found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests
            .filter((req) => {
              if (!filterQuery.trim()) return true;
              const q = filterQuery.toLowerCase().trim();
              return (
                req.userName?.toLowerCase().includes(q) ||
                req.userEmail?.toLowerCase().includes(q) ||
                req.transactionId?.toLowerCase().includes(q) ||
                req.userId?.toLowerCase().includes(q) ||
                req.planName?.toLowerCase().includes(q)
              );
            })
            .map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:border-amber-400/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: User & Plan Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {req.userName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({req.userEmail})
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        req.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : req.status === 'approved'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      {req.planName} ({req.durationDays} Days)
                    </span>
                    <span className="font-black text-gray-900 dark:text-white">
                      ৳{req.amount}
                    </span>
                    <span className="text-gray-400">
                      Submitted: {new Date(req.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-gray-500">bKash TrxID:</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold">
                      {req.transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(req.transactionId, req.id)}
                      className="text-[11px] font-sans font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                    >
                      {copiedId === req.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy TrxID</span>
                        </>
                      )}
                    </button>
                    <span className="text-gray-400 font-sans text-[10px]">
                      UID: <code>{req.userId}</code>
                    </span>
                  </div>

                  {req.rejectionReason && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                      Rejection Reason: {req.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      disabled={actionInProgress === req.id}
                      onClick={() => handleAction('approve', req)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      {actionInProgress === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Boss</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionInProgress === req.id}
                      onClick={() => {
                        const reason = window.prompt('Enter rejection reason (optional):', 'Transaction ID not found in bKash account');
                        if (reason !== null) handleAction('reject', req, reason);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
