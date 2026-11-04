'use client';

// The signed-in trader's own Boss upgrade requests, live, with the admin's
// rejection reason when one was rejected. Renders nothing for signed-out
// users or users with no requests. firestore.rules lets owners read their
// own boss_requests.
//
// Sorted client-side (equality filter only) so no composite index is needed;
// a user has a handful of these at most.

import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import RejectionNotice from '@/components/shared/RejectionNotice';

interface BossRequestRow {
  id: string;
  planName?: string;
  amount?: number;
  transactionId?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: any;
}

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const STATUS_STYLE: Record<BossRequestRow['status'], string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
};

export default function BossRequestHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BossRequestRow[]>([]);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }
    const q = query(collection(getFirestore(), 'boss_requests'), where('userId', '==', user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<BossRequestRow, 'id'>) }))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
          .slice(0, 5);
        setRequests(rows);
      },
      (err) => console.error('Error fetching Boss requests:', err)
    );
  }, [user]);

  if (requests.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl p-4 sm:p-6 mb-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
        <Clock className="w-4 h-4 text-gray-400" /> Your Upgrade Requests
      </h3>
      <div className="space-y-2.5">
        {requests.map((req) => {
          const created = toMillis(req.createdAt);
          return (
            <div
              key={req.id}
              className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f141c]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {req.planName || 'Boss'}{typeof req.amount === 'number' && <> · ৳{req.amount}</>}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5">
                    TrxID: {req.transactionId || '—'}
                    {created > 0 && (
                      <span className="font-sans"> · {new Date(created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLE[req.status] || STATUS_STYLE.pending}`}>
                  {(req.status || 'pending').toUpperCase()}
                </span>
              </div>
              {req.status === 'pending' && (
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">We&apos;re checking your payment. This page updates on its own.</p>
              )}
              {req.status === 'rejected' && <RejectionNotice reason={req.rejectionReason} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
