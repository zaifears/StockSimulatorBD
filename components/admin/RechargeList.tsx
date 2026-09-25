'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where, startAfter, getDocs, getCountFromServer, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  Search, CheckCircle2, LayoutDashboard, Home, Clock, Inbox, Check, X, Loader2,
  ArrowLeft, Copy,
} from 'lucide-react';
import ScrollableHorizontal from '@/components/ui/ScrollableHorizontal';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  coins: number;
  trxId: string;
  bkashNumber: string;
  paymentMethod?: string;
  paymentTab?: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  processedAt?: any;
  processedBy?: string;
}

const NAV_ITEMS: { label: string; href: string; filter: StatusFilter; color: string; activeColor: string }[] = [
  { label: 'All', href: '/admin/recharge', filter: 'all', color: 'text-gray-500 dark:text-gray-400', activeColor: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700' },
  { label: 'Pending', href: '/admin/recharge/pending', filter: 'pending', color: 'text-gray-500 dark:text-gray-400', activeColor: 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-200 dark:border-orange-500/30' },
  { label: 'Approved', href: '/admin/recharge/approved', filter: 'approved', color: 'text-gray-500 dark:text-gray-400', activeColor: 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm border border-green-200 dark:border-green-500/30' },
  { label: 'Rejected', href: '/admin/recharge/rejected', filter: 'rejected', color: 'text-gray-500 dark:text-gray-400', activeColor: 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-500/30' },
];

export default function RechargeList({ statusFilter }: { statusFilter: StatusFilter }) {
  const { user } = useAuth();

  const PAGE_SIZE = 30;
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Build Firestore query with proper server-side status filtering
  const buildQuery = useCallback((cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const constraints: any[] = [];
    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }
    constraints.push(orderBy('createdAt', 'desc'));
    if (cursor) {
      constraints.push(startAfter(cursor));
    }
    constraints.push(limit(PAGE_SIZE + 1));
    return query(collection(db, 'recharge_requests'), ...constraints);
  }, [statusFilter]);

  // Real-time listener for the first page
  useEffect(() => {
    setRequests([]);
    setLastDoc(null);
    setHasMore(false);

    const q = buildQuery();

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      const requestsData = docs.slice(0, PAGE_SIZE)
        .map(d => ({ id: d.id, ...d.data() })) as RechargeRequest[];

      setRequests(requestsData);
      setHasMore(docs.length > PAGE_SIZE);
      setLastDoc(docs.length > 0 ? docs[Math.min(docs.length - 1, PAGE_SIZE - 1)] : null);
    }, (error) => {
      console.error('Error fetching requests:', error);
    });

    return () => unsubscribe();
  }, [buildQuery]);

  // Load more pages (non-realtime fetch)
  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const moreData = docs.slice(0, PAGE_SIZE)
        .map(d => ({ id: d.id, ...d.data() })) as RechargeRequest[];

      setRequests(prev => [...prev, ...moreData]);
      setHasMore(docs.length > PAGE_SIZE);
      setLastDoc(docs.length > 0 ? docs[Math.min(docs.length - 1, PAGE_SIZE - 1)] : null);
    } catch (error) {
      console.error('Error loading more requests:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleApprove = async (requestId: string, userId: string, coins: number, userName: string) => {
    if (!confirm(`✅ Approve and credit ${coins.toLocaleString()} coins to ${userName}?`)) return;

    setProcessing(requestId);

    try {
      // Get fresh Firebase ID token for server authentication
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('⚠️ Not authenticated. Please refresh and log in again.');
        setProcessing(null);
        return;
      }
      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'approve',
          requestId,
          userId,
          coins,
          userName,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve request');
      }

      showToast(data.message || `✅ Approved! ${coins.toLocaleString()} coins credited to ${userName}`);
    } catch (err: any) {
      console.error('Approve error:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string, userName: string) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;

    setProcessing(requestId);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('⚠️ Not authenticated. Please refresh and log in again.');
        setProcessing(null);
        return;
      }
      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'reject',
          requestId,
          userName,
          rejectionReason: reason || 'No reason provided',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject request');
      }

      showToast(data.message || `❌ Request from ${userName} rejected`);
    } catch (error: any) {
      console.error('Reject error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredRequests = requests
    .filter(req =>
      !searchTerm ||
      req.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.trxId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.bankName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const [stats, setStats] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  // Fetch accurate counts from server
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const col = collection(db, 'recharge_requests');
        const [allSnap, pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
          getCountFromServer(col),
          getCountFromServer(query(col, where('status', '==', 'pending'))),
          getCountFromServer(query(col, where('status', '==', 'approved'))),
          getCountFromServer(query(col, where('status', '==', 'rejected'))),
        ]);
        setStats({
          all: allSnap.data().count,
          pending: pendingSnap.data().count,
          approved: approvedSnap.data().count,
          rejected: rejectedSnap.data().count,
        });
      } catch (e) {
        console.error('Error fetching counts:', e);
      }
    };
    fetchCounts();
  }, [requests]); // Re-fetch when requests change (approve/reject updates snapshot)

  const adminWebMcpSchema = {
    tools: [
      {
        name: "approve_recharge",
        description: "Approve a pending coin recharge request.",
        parameters: {
          type: "object",
          properties: {
            request_id: { type: "string", description: "The ID of the recharge request" }
          },
          required: ["request_id"]
        }
      },
      {
        name: "reject_recharge",
        description: "Reject a pending coin recharge request.",
        parameters: {
          type: "object",
          properties: {
            request_id: { type: "string", description: "The ID of the recharge request" }
          },
          required: ["request_id"]
        }
      }
    ]
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-28 px-3.5 sm:px-4 pb-24 sm:pb-12 bg-gray-50/50 dark:bg-[#090E17]">
      {/* WebMCP Schema Injection */}
      <script
        type="application/webmcp+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(adminWebMcpSchema) }}
      />
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-20 sm:top-24 right-4 bg-green-600 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl shadow-2xl z-50 animate-slide-in-right border border-green-500">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium text-sm">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-gray-100 dark:border-gray-800 pb-5 sm:pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
              </Link>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Recharge <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Operations</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review and process incoming coin purchase requests.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1A1F26] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/30 active:scale-95"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, or TrxID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-white dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none shadow-sm"
            />
          </div>

          {/* Filter Tabs as Links — horizontal touch swipe */}
          <ScrollableHorizontal
            scrollAmount={140}
            scrollClassName="gap-1 p-1.5 flex-nowrap"
            className="bg-gray-100/70 dark:bg-[#111418] rounded-xl border border-gray-100 dark:border-gray-800"
            gradientFrom="from-gray-100 dark:from-[#111418]"
            arrowSize="xs"
            clearancePadding="pr-6 sm:pr-0"
            ariaLabel="Recharge queue filter tabs"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = statusFilter === item.filter;
              return (
                <Link
                  key={item.filter}
                  href={item.href}
                  className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 min-h-[40px] sm:min-h-0 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                    isActive
                      ? item.activeColor
                      : `${item.color} hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50`
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-gray-200/60 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {stats[item.filter]}
                  </span>
                </Link>
              );
            })}
          </ScrollableHorizontal>
        </div>

        {/* Requests List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-800 border-dashed">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                No requests found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search terms' : 'New recharge requests will appear here'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-[#1A1F26] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-sm"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 sm:gap-6">
                  <div className="flex-1 w-full">
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                          'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                        }`}>
                          {req.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>}
                          {req.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(req.createdAt?.toDate()).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Three Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{req.userName}</div>
                        <div className="text-xs text-gray-500 break-all">{req.userEmail}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transaction</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs sm:text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded break-all">
                            {req.trxId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(req.trxId);
                              setCopiedTrxId(req.id);
                              setTimeout(() => setCopiedTrxId(null), 2000);
                            }}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 active:scale-95"
                          >
                            {copiedTrxId === req.id ? '✓ Copied' : 'Copy Trx'}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {req.paymentMethod || 'bKash Send Money'}
                          </span>
                          {req.bankName && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                              🏦 {req.bankName}
                            </span>
                          )}
                          {req.bkashNumber && (
                            <span className="text-gray-400 font-mono text-[11px]">({req.bkashNumber})</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                        <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                          ৳{req.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">+{req.coins.toLocaleString()} Coins</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
                      <form className="flex-1 lg:flex-none flex" onSubmit={(e) => { e.preventDefault(); handleApprove(req.id, req.userId, req.coins, req.userName); }}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          disabled={processing === req.id}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-green-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {processing === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>Approve</span>
                        </button>
                      </form>
                      <form className="flex-1 lg:flex-none flex" onSubmit={(e) => { e.preventDefault(); handleReject(req.id, req.userName); }}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          disabled={processing === req.id}
                          className="w-full flex items-center justify-center gap-1.5 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 hover:border-red-500 hover:text-red-600 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Load More Button */}
          {hasMore && !searchTerm && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 bg-white dark:bg-[#1A1F26] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>Load More Requests</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
