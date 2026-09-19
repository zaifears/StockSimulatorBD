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
  Flame, RefreshCw, Mail, Download, Sparkles, Send, Plus,
} from 'lucide-react';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import BossBadge from '@/components/ui/BossBadge';

type TierTab = 'pending' | 'active' | 'approved' | 'rejected' | 'expired' | 'manual';

export interface ActiveBossUser {
  uid: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
  accountTier: string;
  lastBossPlan: string;
  bossUntil: number | null;
  bossSince: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  isLifetimeOrUnlimited: boolean;
  isTrial: boolean;
  redeemedPromoCodes: string[];
  createdAt: string | null;
}

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
  paymentMethod?: string;
  paymentTab?: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface ExpiredBossUser {
  uid: string;
  name: string;
  email: string | null;
  lastBossPlan: string;
  bossUntil: number | null;
  bossSince: string | null;
  expiredAt: string | null;
  daysExpiredAgo: number | null;
  isTrial: boolean;
  redeemedPromoCodes: string[];
}

export default function TierList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TierTab>('pending');
  const [requests, setRequests] = useState<BossRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Active Boss Directory state
  const [activeUsers, setActiveUsers] = useState<ActiveBossUser[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [copiedAllActiveEmails, setCopiedAllActiveEmails] = useState(false);
  const [activeActionUid, setActiveActionUid] = useState<string | null>(null);
  const [activeExtendDays, setActiveExtendDays] = useState<{ [uid: string]: number }>({});

  // Expired Boss CRM state
  const [expiredUsers, setExpiredUsers] = useState<ExpiredBossUser[]>([]);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [copiedAllEmails, setCopiedAllEmails] = useState(false);

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
    expiredBossCount: 0,
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

  const fetchActiveUsers = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await fetchWithFreshToken('/api/admin/tier?view=active', { method: 'GET' });
      const json = await res.json();
      if (json.success && Array.isArray(json.activeUsers)) {
        setActiveUsers(json.activeUsers);
        setStats((prev) => ({ ...prev, activeBossCount: json.activeUsers.length }));
      }
    } catch (err) {
      console.error('Failed to fetch active boss users:', err);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  const fetchExpiredUsers = useCallback(async () => {
    setLoadingExpired(true);
    try {
      const res = await fetchWithFreshToken('/api/admin/tier?view=expired', { method: 'GET' });
      const json = await res.json();
      if (json.success && Array.isArray(json.expiredUsers)) {
        setExpiredUsers(json.expiredUsers);
      }
    } catch (err) {
      console.error('Failed to fetch expired boss users:', err);
    } finally {
      setLoadingExpired(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchActiveUsers();
    }
  }, [user, fetchStats, fetchActiveUsers]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'active' && activeUsers.length === 0) {
      fetchActiveUsers();
    }
    if (activeTab === 'expired' && expiredUsers.length === 0) {
      fetchExpiredUsers();
    }
  }, [user, activeTab, activeUsers.length, expiredUsers.length, fetchActiveUsers, fetchExpiredUsers]);

  // Fast initial fetch + Real-time listener for requests
  useEffect(() => {
    if (!user || activeTab === 'expired' || activeTab === 'active') return;
    setLoading(true);

    let isSubscribed = true;

    // Fast initial fetch via Admin API endpoint so data appears immediately without waiting on WebChannel handshake
    fetchWithFreshToken(`/api/admin/tier?status=${activeTab}`, { method: 'GET' })
      .then((res) => res.json())
      .then((json) => {
        if (isSubscribed && json.success && Array.isArray(json.requests)) {
          setRequests(json.requests);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Initial tier requests fetch error:', err);
      });

    const baseCol = collection(db, 'boss_requests');
    const q = activeTab === 'manual'
      ? query(baseCol, orderBy('createdAt', 'desc'))
      : query(baseCol, where('status', '==', activeTab), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BossRequest[];
        setRequests(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to boss requests:', error);
        if (isSubscribed) setLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
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

    // ⚡️ Optimistic UI update: remove item immediately so it vanishes with 0ms delay
    const previousRequests = [...requests];
    const previousCounts = { ...counts };
    const previousStats = { ...stats };

    if (activeTab === 'pending') {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    }
    setCounts((prev) => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      [action === 'approve' ? 'approved' : 'rejected']: prev[action === 'approve' ? 'approved' : 'rejected'] + 1,
    }));
    setStats((prev) => ({
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      approvedCount: action === 'approve' ? prev.approvedCount + 1 : prev.approvedCount,
      rejectedCount: action === 'reject' ? prev.rejectedCount + 1 : prev.rejectedCount,
      activeBossCount: action === 'approve' ? prev.activeBossCount + 1 : prev.activeBossCount,
    }));

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
      // Rollback on error
      setRequests(previousRequests);
      setCounts(previousCounts);
      setStats(previousStats);
      setMessage({ text: err.message || 'Action failed', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const searchUserDirect = async (queryTerm: string) => {
    const term = queryTerm.trim();
    if (!term) return;

    setManualSearching(true);
    setManualUserDoc(null);
    setMessage(null);

    try {
      const res = await fetchWithFreshToken(`/api/admin/tier?search=${encodeURIComponent(term)}`, {
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

  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await searchUserDirect(manualQuery);
  };

  const handleSelectExpiredForRenewal = (u: ExpiredBossUser) => {
    const target = u.email || u.uid;
    setManualQuery(target);
    setActiveTab('manual');
    searchUserDirect(target);
  };

  const handleSelectActiveForManual = (u: ActiveBossUser) => {
    const target = u.email || u.uid;
    setManualQuery(target);
    setActiveTab('manual');
    searchUserDirect(target);
  };

  const handleRevokeActiveUser = async (u: ActiveBossUser) => {
    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke Boss tier from ${u.name || u.email || u.uid}? They will revert to Bro tier immediately.`
    );
    if (!confirmRevoke) return;

    setActiveActionUid(u.uid);
    setMessage(null);

    const previousActive = [...activeUsers];
    setActiveUsers((prev) => prev.filter((item) => item.uid !== u.uid));
    setStats((prev) => ({ ...prev, activeBossCount: Math.max(0, prev.activeBossCount - 1) }));

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          userId: u.uid,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to revoke Boss tier');

      setMessage({
        text: `Revoked Boss status from ${u.name || u.email || u.uid}. Reverted to Bro tier.`,
        type: 'success',
      });
      fetchStats();
    } catch (err: any) {
      setActiveUsers(previousActive);
      setStats((prev) => ({ ...prev, activeBossCount: previousActive.length }));
      setMessage({ text: err.message || 'Revocation failed', type: 'error' });
    } finally {
      setActiveActionUid(null);
    }
  };

  const handleExtendActiveUser = async (u: ActiveBossUser) => {
    const days = activeExtendDays[u.uid] || 31;
    setActiveActionUid(u.uid);
    setMessage(null);

    try {
      const res = await fetchWithFreshToken('/api/admin/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_grant',
          userId: u.uid,
          durationDays: days,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to extend Boss tier');

      setMessage({
        text: `Success! Added +${days} days to ${u.name || u.email || u.uid}'s Boss tier.`,
        type: 'success',
      });
      await fetchActiveUsers();
      fetchStats();
    } catch (err: any) {
      setMessage({ text: err.message || 'Extension failed', type: 'error' });
    } finally {
      setActiveActionUid(null);
    }
  };

  const filteredActiveUsers = activeUsers.filter((u) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q) ||
      u.lastBossPlan?.toLowerCase().includes(q) ||
      u.redeemedPromoCodes?.some((code) => code.toLowerCase().includes(q))
    );
  });

  const handleDownloadActiveCSV = () => {
    if (filteredActiveUsers.length === 0) return;
    const headers = ['Name', 'Email', 'Plan', 'Days Left', 'Boss Since', 'Expires At', 'Is Trial', 'Promo Codes', 'UID'];
    const rows = filteredActiveUsers.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.lastBossPlan || '').replace(/"/g, '""')}"`,
      u.daysRemaining != null ? u.daysRemaining : 'Unlimited',
      `"${u.bossSince || ''}"`,
      `"${u.expiresAt || ''}"`,
      u.isTrial ? 'Yes' : 'No',
      `"${(u.redeemedPromoCodes || []).join('; ')}"`,
      `"${u.uid}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `active_boss_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllActiveEmails = () => {
    const validEmails = filteredActiveUsers
      .map((u) => u.email?.trim())
      .filter((e): e is string => Boolean(e && e.includes('@')));
    const unique = Array.from(new Set(validEmails));
    if (unique.length === 0) return;
    navigator.clipboard.writeText(unique.join(', '));
    setCopiedAllActiveEmails(true);
    setTimeout(() => setCopiedAllActiveEmails(false), 2500);
  };

  const filteredExpiredUsers = expiredUsers.filter((u) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase().trim();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q) ||
      u.lastBossPlan?.toLowerCase().includes(q) ||
      u.redeemedPromoCodes?.some((code) => code.toLowerCase().includes(q))
    );
  });

  const handleDownloadCSV = () => {
    if (filteredExpiredUsers.length === 0) return;
    const headers = ['Name', 'Email', 'Plan', 'Is Trial', 'Boss Since', 'Expired At', 'Days Ago', 'Promo Codes', 'UID'];
    const rows = filteredExpiredUsers.map((u) => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.lastBossPlan || '').replace(/"/g, '""')}"`,
      u.isTrial ? 'Yes' : 'No',
      `"${u.bossSince || ''}"`,
      `"${u.expiredAt || ''}"`,
      u.daysExpiredAgo ?? '',
      `"${(u.redeemedPromoCodes || []).join('; ')}"`,
      `"${u.uid}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expired_boss_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllEmails = () => {
    const validEmails = filteredExpiredUsers
      .map((u) => u.email?.trim())
      .filter((e): e is string => Boolean(e && e.includes('@')));
    const unique = Array.from(new Set(validEmails));
    if (unique.length === 0) return;
    navigator.clipboard.writeText(unique.join(', '));
    setCopiedAllEmails(true);
    setTimeout(() => setCopiedAllEmails(false), 2500);
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
    <div className="max-w-6xl mx-auto px-3.5 sm:px-4 py-2 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-gray-100 dark:bg-gray-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 fill-current shrink-0" />
              <span>Boss Tier Subscriptions</span>
            </h1>
            <BossBadge size="sm" interactive={false} />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Verify bKash transaction IDs, activate Boss memberships, and manage user tier privileges.
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/boss"
            target="_blank"
            className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>View /boss Page</span>
          </Link>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {message && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl mb-6 text-xs sm:text-sm font-semibold flex items-center gap-2 ${
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-6">
        <div
          onClick={() => setActiveTab('pending')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate">Pending Action</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span>{counts.pending}</span>
            {counts.pending > 0 && (
              <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                Action Needed
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('active')}
          className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm cursor-pointer transition-colors ${
            activeTab === 'active'
              ? 'bg-amber-500/10 border-amber-500/60 dark:bg-amber-950/20'
              : 'bg-white dark:bg-[#131822] border-gray-200 dark:border-gray-800 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate font-semibold">Active Boss</span>
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono flex items-baseline gap-1.5">
            <span>{activeUsers.length > 0 ? activeUsers.length : (stats.activeBossCount || 0)}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-sans">
              Live
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('expired')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-purple-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate">Expired Boss</span>
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono flex items-baseline gap-1.5">
            <span>{expiredUsers.length > 0 ? expiredUsers.length : (stats.expiredBossCount || 0)}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase font-sans">
              Re-engage
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('approved')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-emerald-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate">Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
            {counts.approved}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('rejected')}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:border-rose-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="truncate">Rejected</span>
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
            {counts.rejected}
          </div>
        </div>
      </div>

      {/* Tab Navigation — smooth touch scroll on mobile */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-3 overflow-x-auto no-scrollbar flex-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
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
          onClick={() => setActiveTab('active')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'active'
              ? 'bg-amber-500 text-gray-950 shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <Crown className="w-3.5 h-3.5 fill-current text-amber-500 group-hover:text-amber-400" />
          <span>Active Boss</span>
          {(stats.activeBossCount > 0 || activeUsers.length > 0) && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === 'active'
                ? 'bg-gray-950/20 text-gray-950'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              {activeUsers.length > 0 ? activeUsers.length : stats.activeBossCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
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
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
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
          onClick={() => setActiveTab('expired')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            activeTab === 'expired'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#131822] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Expired (Re-engage)</span>
          {(stats.expiredBossCount > 0 || expiredUsers.length > 0) && (
            <span className="text-[10px] opacity-75 font-mono font-bold">
              ({expiredUsers.length > 0 ? expiredUsers.length : (stats.expiredBossCount || 0)})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all active:scale-95 ${
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
            Look up any registered trader by their email address or Firebase UID to grant or revoke Boss access instantly.
          </p>

          <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6">
            <input
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Enter user email or Firebase UID..."
              className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a2130] text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={manualSearching || !manualQuery.trim()}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
            >
              {manualSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search & Inspect</span>
            </button>
          </form>

          {manualUserDoc && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-[#182030] border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-all">{manualUserDoc.email}</div>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5 break-all">UID: {manualUserDoc.id}</div>
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 shrink-0">Duration:</label>
                  <select
                    value={manualDays}
                    onChange={(e) => setManualDays(Number(e.target.value))}
                    className="flex-1 sm:flex-none px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131822] text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value={31}>1 Month (31 Days)</option>
                    <option value={185}>6 Months (185 Days)</option>
                    <option value={365}>365 Days (1 Year)</option>
                    <option value={7}>7 Days (Trial)</option>
                  </select>
                </div>

                <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleManualGrant('manual_grant')}
                    disabled={actionInProgress === 'manual'}
                    className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Crown className="w-3.5 h-3.5 fill-current" />
                    <span>Grant Boss</span>
                  </button>

                  {manualUserDoc.accountTier === 'Boss' && (
                    <button
                      type="button"
                      onClick={() => handleManualGrant('revoke')}
                      disabled={actionInProgress === 'manual'}
                      className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Expired Boss Users (Re-engagement CRM) */}
      {activeTab === 'expired' && (
        <div className="space-y-4 mb-8">
          {/* Header Card with Controls */}
          <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-500 shrink-0" />
                  <span>Expired Boss Users — Re-engagement CRM</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Traders who previously held Boss Tier (via trial promo code, monthly plan, or manual grant) whose access has ended. Copy emails for promo campaigns or grant 1-click renewals.
                </p>
              </div>

              {/* Action Buttons: Copy All Emails & Download CSV & Refresh */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchExpiredUsers}
                  disabled={loadingExpired}
                  className="px-3 py-2 min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Refresh expired list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExpired ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  disabled={filteredExpiredUsers.length === 0}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131822] hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllEmails}
                  disabled={filteredExpiredUsers.length === 0}
                  className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                    copiedAllEmails
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copiedAllEmails ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied {filteredExpiredUsers.filter(u => u.email).length} Emails!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Emails</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Search expired traders by name, email, plan (e.g. trial), or UID..."
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#182030] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-400 mt-2 px-1">
                <span>
                  Showing {filteredExpiredUsers.length} of {expiredUsers.length} expired traders
                </span>
                <span>
                  {filteredExpiredUsers.filter((u) => u.email).length} email addresses available for outreach
                </span>
              </div>
            </div>
          </div>

          {/* Expired Users List */}
          {loadingExpired ? (
            <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span>Scanning expired Boss subscriptions...</span>
            </div>
          ) : filteredExpiredUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                No Expired Boss Users Found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filterQuery.trim()
                  ? `No expired users match your search "${filterQuery}".`
                  : 'No users with expired Boss status found yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpiredUsers.map((u) => (
                <div
                  key={u.uid}
                  className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-purple-400/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: User details */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {u.name}
                        </span>

                        {u.isTrial ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                            {u.lastBossPlan}
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-purple-600 shrink-0" />
                            {u.lastBossPlan}
                          </span>
                        )}

                        {u.daysExpiredAgo != null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                            Expired {u.daysExpiredAgo === 0 ? 'today' : `${u.daysExpiredAgo}d ago`}
                          </span>
                        )}
                      </div>

                      {/* Email + 1-Click Copy */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {u.email ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 font-mono">
                            <span className="break-all">{u.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.email!, `email-${u.uid}`)}
                              className="text-[11px] font-sans font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 ml-1 active:scale-95"
                              title="Copy email address"
                            >
                              {copiedId === `email-${u.uid}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No email on file</span>
                        )}

                        <span className="text-gray-400 text-[11px] font-mono">
                          UID: {u.uid.slice(0, 10)}...
                        </span>
                      </div>

                      {/* Dates & Promos */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                        {u.expiredAt && (
                          <span>
                            Ended: <span className="font-semibold text-gray-700 dark:text-gray-300">{new Date(u.expiredAt).toLocaleDateString()}</span>
                          </span>
                        )}
                        {u.bossSince && (
                          <span>
                            Boss Since: <span className="font-semibold text-gray-700 dark:text-gray-300">{new Date(u.bossSince).toLocaleDateString()}</span>
                          </span>
                        )}
                        {u.redeemedPromoCodes && u.redeemedPromoCodes.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            Used Promos:
                            {u.redeemedPromoCodes.map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold border border-amber-200 dark:border-amber-800"
                              >
                                {code}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: 1-Click Action to Renew / Send Promo */}
                    <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800 w-full md:w-auto shrink-0">
                      {u.email && (
                        <a
                          href={`mailto:${encodeURIComponent(u.email)}?subject=${encodeURIComponent('Special Boss Tier Renewal Offer | StockSimulatorBD')}`}
                          className="flex-1 md:flex-none justify-center px-3.5 py-2.5 min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95"
                          title="Open default email client"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Email Trader</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectExpiredForRenewal(u)}
                        className="flex-1 md:flex-none justify-center px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Crown className="w-3.5 h-3.5 fill-current" />
                        <span>Send Promo / Renew</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Active Boss Users (Live Directory) */}
      {activeTab === 'active' && (
        <div className="space-y-4 mb-8">
          {/* Header Card with Controls */}
          <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500 shrink-0 fill-current" />
                  <span>Active Boss Traders — Live Directory</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Traders with currently active Boss Tier privileges. Inspect remaining duration, copy emails for outreach, grant extensions, or revoke privileges.
                </p>
              </div>

              {/* Action Buttons: Copy All Emails & Download CSV & Refresh */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchActiveUsers}
                  disabled={loadingActive}
                  className="px-3 py-2 min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Refresh active Boss list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingActive ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadActiveCSV}
                  disabled={filteredActiveUsers.length === 0}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#131822] hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold text-gray-800 dark:text-gray-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllActiveEmails}
                  disabled={filteredActiveUsers.length === 0}
                  className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                    copiedAllActiveEmails
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-gray-950'
                  }`}
                >
                  {copiedAllActiveEmails ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied {filteredActiveUsers.filter((u) => u.email).length} Emails!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Emails</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Search active Boss traders by name, email, plan, promo code, or UID..."
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#182030] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-400 mt-2 px-1">
                <span>
                  Showing {filteredActiveUsers.length} of {activeUsers.length} active Boss traders
                </span>
                <span>
                  {filteredActiveUsers.filter((u) => u.email).length} active emails reachable
                </span>
              </div>
            </div>
          </div>

          {/* Active Users List */}
          {loadingActive ? (
            <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Syncing active Boss directory...</span>
            </div>
          ) : filteredActiveUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-amber-500 fill-current" />
              </div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                No Active Boss Traders Found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filterQuery.trim()
                  ? `No active traders match your search "${filterQuery}".`
                  : 'No traders currently hold active Boss status.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActiveUsers.map((u) => {
                const isWorking = activeActionUid === u.uid;
                const durationSelection = activeExtendDays[u.uid] || 31;

                return (
                  <div
                    key={u.uid}
                    className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-amber-400/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Trader Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                            {u.name}
                          </span>

                          <BossBadge size="xs" interactive={false} />

                          {u.isTrial ? (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                              {u.lastBossPlan}
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-current" />
                              {u.lastBossPlan}
                            </span>
                          )}

                          {/* Expiry / Remaining Indicator */}
                          {u.daysRemaining != null ? (
                            u.daysRemaining > 7 ? (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                🟢 {u.daysRemaining} days left
                              </span>
                            ) : u.daysRemaining > 1 ? (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                                ⚠️ {u.daysRemaining}d left
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 animate-pulse">
                                🚨 Expiring {u.daysRemaining === 0 ? 'today' : 'tomorrow'}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              ♾️ Permanent / Lifetime
                            </span>
                          )}
                        </div>

                        {/* Email + UID with 1-Click Copy */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {u.email ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 font-mono">
                              <span className="break-all font-semibold">{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(u.email!, `email-${u.uid}`)}
                                className="text-[11px] font-sans font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5 ml-1 active:scale-95"
                                title="Copy email address"
                              >
                                {copiedId === `email-${u.uid}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-500">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No email on file</span>
                          )}

                          <div className="inline-flex items-center gap-1 text-gray-400 text-[11px] font-mono">
                            <span>UID: {u.uid.slice(0, 10)}...</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.uid, `uid-${u.uid}`)}
                              className="text-[10px] font-sans text-gray-500 hover:text-gray-300 ml-0.5"
                              title="Copy full UID"
                            >
                              {copiedId === `uid-${u.uid}` ? 'Copied' : 'copy'}
                            </button>
                          </div>
                        </div>

                        {/* Dates & Details */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                          {u.expiresAt && (
                            <span>
                              Active Until:{' '}
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {new Date(u.expiresAt).toLocaleDateString()} ({new Date(u.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            </span>
                          )}
                          {u.bossSince && (
                            <span>
                              Boss Since:{' '}
                              <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {new Date(u.bossSince).toLocaleDateString()}
                              </span>
                            </span>
                          )}
                          {u.redeemedPromoCodes && u.redeemedPromoCodes.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              Promos:
                              {u.redeemedPromoCodes.map((code) => (
                                <span
                                  key={code}
                                  className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold border border-amber-200 dark:border-amber-800"
                                >
                                  {code}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick Extend & Revoke Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800 w-full lg:w-auto shrink-0">
                        {u.email && (
                          <a
                            href={`mailto:${encodeURIComponent(u.email)}?subject=${encodeURIComponent('StockSimulatorBD Boss Tier Update')}`}
                            className="flex-1 sm:flex-none justify-center px-3 py-2 min-h-[40px] rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95"
                            title="Email this trader"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </a>
                        )}

                        {/* Duration Selector for Quick Extension */}
                        <select
                          value={durationSelection}
                          onChange={(e) =>
                            setActiveExtendDays((prev) => ({
                              ...prev,
                              [u.uid]: Number(e.target.value),
                            }))
                          }
                          disabled={isWorking}
                          className="px-2.5 py-2 min-h-[40px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131822] text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
                        >
                          <option value={31}>+31 Days (1 Mo)</option>
                          <option value={185}>+185 Days (6 Mo)</option>
                          <option value={365}>+365 Days (1 Yr)</option>
                          <option value={7}>+7 Days (Trial)</option>
                        </select>

                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleExtendActiveUser(u)}
                          className="flex-1 sm:flex-none justify-center px-3.5 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          title="Add more days to this user's Boss tier"
                        >
                          {isWorking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                          <span>Extend</span>
                        </button>

                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleRevokeActiveUser(u)}
                          className="flex-1 sm:flex-none justify-center px-3.5 py-2 min-h-[40px] rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 border border-rose-200 dark:border-rose-900/40"
                          title="Revoke Boss status and revert user to Bro tier"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Requests List for Pending / Approved / Rejected */}
      {activeTab !== 'manual' && activeTab !== 'expired' && activeTab !== 'active' && (
        <>
          {/* Search/Filter Bar for Requests */}
          {requests.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter requests by trader name, email, plan, or bKash TrxID..."
                  className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131822] text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
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
                    req.planName?.toLowerCase().includes(q) ||
                    req.paymentMethod?.toLowerCase().includes(q) ||
                    req.bankName?.toLowerCase().includes(q)
                  );
                })
                .map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-amber-400/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: User & Plan Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {req.userName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 break-all">
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {req.paymentMethod || 'bKash Send Money'}
                        </span>
                        {req.bankName && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                            🏦 {req.bankName}
                          </span>
                        )}
                        <span className="text-gray-400">
                          Submitted: {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="text-gray-500">TrxID:</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold break-all">
                          {req.transactionId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(req.transactionId, req.id)}
                          className="text-[11px] font-sans font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 active:scale-95"
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
                        {req.bkashNumber && (
                          <span className="text-gray-500 font-sans text-[11px]">
                            Sender: <code>{req.bkashNumber}</code>
                          </span>
                        )}
                        <span className="text-gray-400 font-sans text-[10px] break-all">
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
                      <div className="flex flex-row items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800 w-full md:w-auto shrink-0">
                        <button
                          type="button"
                          disabled={actionInProgress === req.id}
                          onClick={() => handleAction('approve', req)}
                          className="flex-1 md:flex-none justify-center px-4 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
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
                          className="flex-1 md:flex-none justify-center px-3.5 py-2.5 min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
        </>
      )}
    </div>
  );
}
