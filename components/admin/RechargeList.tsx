    'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where, startAfter, getDocs, getCountFromServer, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

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
      req.trxId?.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="min-h-screen pt-24 px-4 pb-12 bg-gray-50/50 dark:bg-[#0a0a0a]">
      {/* WebMCP Schema Injection */}
      <script 
        type="application/webmcp+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(adminWebMcpSchema) }}
      />
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-24 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in-right border border-green-500">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium text-sm">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 dark:border-gray-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                Recharge Operations
              </h1>
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Review and process incoming coin purchase requests.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
            </Link>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or TrxID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          {/* Filter Tabs as Links */}
          <div className="flex bg-gray-100/50 dark:bg-[#1a1a1a] p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 whitespace-nowrap overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = statusFilter === item.filter;
              return (
                <Link
                  key={item.filter}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? item.activeColor
                      : `${item.color} hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50`
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    isActive
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-gray-200/50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {stats[item.filter]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-[#111] rounded-2xl p-16 text-center border border-gray-200 dark:border-gray-800 border-dashed">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No {statusFilter !== 'all' ? statusFilter : ''} requests found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'New recharge requests will appear here'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-[#111] rounded-2xl p-6 border border-gray-200 dark:border-gray-800 transition-all hover:border-gray-300 dark:hover:border-gray-700"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="flex-1 w-full">
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                          'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                        }`}>
                          {req.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>}
                          {req.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {new Date(req.createdAt?.toDate()).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Three Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                        <div className="font-semibold text-gray-900 dark:text-white">{req.userName}</div>
                        <div className="text-xs text-gray-500 break-all">{req.userEmail}</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transaction</p>
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white break-all">{req.trxId}</div>
                        <div className="text-xs text-gray-500">Method: bKash ({req.bkashNumber})</div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</p>
                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                          ৳{req.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">+{req.coins.toLocaleString()} Coins</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
                      <form className="flex-1 lg:flex-none flex" onSubmit={(e) => { e.preventDefault(); handleApprove(req.id, req.userId, req.coins, req.userName); }}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          disabled={processing === req.id}
                          className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing === req.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                          <span>Approve</span>
                        </button>
                      </form>
                      <form className="flex-1 lg:flex-none flex" onSubmit={(e) => { e.preventDefault(); handleReject(req.id, req.userName); }}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <button
                          type="submit"
                          disabled={processing === req.id}
                          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-700 hover:border-red-500 hover:text-red-600 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                className="inline-flex items-center gap-2 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
