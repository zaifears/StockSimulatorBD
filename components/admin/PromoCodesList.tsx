'use client';

// components/admin/PromoCodesList.tsx
// Admin panel for generating and managing promo_codes/{CODE} documents.
// Supports single-use and multi-use promo codes, custom campaign codes with
// configurable redemption caps, per-user limits, and a detailed audit log
// of every trader redemption (email, name, timestamp, reward).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import {
  Loader2, Plus, Copy, Check, Ban, Search, Gift, Crown,
  Coins, ArrowLeft, Users, Clock, Mail, Trash2, X, ExternalLink,
  ChevronRight, Sparkles, Filter
} from 'lucide-react';
import ScrollableHorizontal from '@/components/ui/ScrollableHorizontal';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';

export interface PromoRedemptionEntry {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  rewardType: 'coins' | 'boss';
  amount?: number;
  bossDays?: number;
  redeemedAt: string;
}

export interface PromoCode {
  id: string; // = code
  code: string;
  rewardType?: 'coins' | 'boss';
  amount: number;
  bossDays?: number | null;
  status: 'active' | 'used' | 'disabled';
  maxUses?: number;
  usedCount?: number;
  maxUsesPerUser?: number;
  redeemed: boolean;
  redeemedBy?: string | null;
  redeemedAt?: string | null;
  lastRedeemedAt?: string | null;
  redemptions?: PromoRedemptionEntry[];
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

type Tab = 'all' | 'active' | 'partially_used' | 'used' | 'disabled' | 'expired';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'partially_used', label: 'In Progress' },
  { key: 'used', label: 'Exhausted / Used' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'expired', label: 'Expired' },
];

const isExpired = (c: PromoCode) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

export function getCodeUsage(c: PromoCode) {
  const max = typeof c.maxUses === 'number' && c.maxUses > 0 ? c.maxUses : 1;
  const used =
    typeof c.usedCount === 'number'
      ? c.usedCount
      : c.status === 'used' || c.redeemed
      ? 1
      : 0;
  const remaining = Math.max(0, max - used);
  const isFull = used >= max || c.status === 'used';
  const isPartial = used > 0 && !isFull;
  return { max, used, remaining, isFull, isPartial };
}

export default function PromoCodesList() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [inspectingCode, setInspectingCode] = useState<PromoCode | null>(null);

  useEffect(() => {
    // Listen to the most recent 300 promo codes
    const q = query(collection(db, 'promo_codes'), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PromoCode));
      },
      (err) => console.error('Error loading promo codes:', err)
    );
    return () => unsubscribe();
  }, []);

  // Update selected code in modal if updated in real-time snapshot
  useEffect(() => {
    if (!inspectingCode) return;
    const updated = codes.find((c) => c.id === inspectingCode.id);
    if (updated) setInspectingCode(updated);
  }, [codes, inspectingCode]);

  const counts = useMemo(() => {
    const c = { all: codes.length, active: 0, partially_used: 0, used: 0, disabled: 0, expired: 0 };
    for (const code of codes) {
      const { isFull, isPartial } = getCodeUsage(code);
      if (code.status === 'disabled') {
        c.disabled++;
      } else if (isExpired(code)) {
        c.expired++;
      } else if (isFull) {
        c.used++;
      } else {
        c.active++;
        if (isPartial) c.partially_used++;
      }
    }
    return c;
  }, [codes]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return codes.filter((c) => {
      const { isFull, isPartial } = getCodeUsage(c);
      const expired = isExpired(c);

      if (q) {
        const codeMatches = c.code.includes(q);
        const userMatches = c.redemptions?.some(
          (r) =>
            r.userEmail?.toUpperCase().includes(q) ||
            r.userName?.toUpperCase().includes(q) ||
            r.userId.toUpperCase().includes(q)
        );
        if (!codeMatches && !userMatches) return false;
      }

      if (tab === 'all') return true;
      if (tab === 'expired') return expired && c.status !== 'disabled';
      if (tab === 'disabled') return c.status === 'disabled';
      if (tab === 'used') return isFull && c.status !== 'disabled';
      if (tab === 'partially_used') return isPartial && !expired && c.status === 'active';
      if (tab === 'active') return !isFull && !expired && c.status === 'active';
      return true;
    });
  }, [codes, tab, search]);

  return (
    <div className="min-h-screen pt-20 sm:pt-28 pb-24 sm:pb-12 px-3.5 sm:px-4 bg-gray-50/50 dark:bg-[#090E17]">
      <div className="max-w-5xl mx-auto">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Gift className="w-6 h-6 text-amber-500" /> Promo Codes Manager
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate single-use or multi-use campaign codes with live redemption tracking & audit logs
            </p>
          </div>
          <button
            onClick={() => setShowGenerate(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/30 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Promo Code
          </button>
        </div>

        {/* Tabs */}
        <ScrollableHorizontal
          scrollAmount={140}
          scrollClassName="gap-1.5 p-1 flex-nowrap"
          className="bg-gray-100 dark:bg-gray-900/50 rounded-xl mb-4"
          gradientFrom="from-gray-100 dark:from-gray-900"
          arrowSize="xs"
          clearancePadding="pr-6 sm:pr-0"
          ariaLabel="Promo code filter tabs"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3.5 py-2 min-h-[40px] sm:min-h-0 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                tab === t.key
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t.label} <span className="opacity-60 font-mono">({counts[t.key]})</span>
            </button>
          ))}
        </ScrollableHorizontal>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code name, trader email, or user UID…"
            className="w-full h-11 pl-10 pr-3 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Code list */}
        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No promo codes found matching your criteria.
            </div>
          ) : (
            filtered.map((code) => (
              <CodeRow
                key={code.id}
                code={code}
                onViewRedemptions={() => setInspectingCode(code)}
              />
            ))
          )}
        </div>
      </div>

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
      {inspectingCode && (
        <RedemptionsModal
          code={inspectingCode}
          onClose={() => setInspectingCode(null)}
        />
      )}
    </div>
  );
}

function CodeRow({
  code,
  onViewRedemptions,
}: {
  code: PromoCode;
  onViewRedemptions: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const expired = isExpired(code);
  const { max, used, remaining, isFull, isPartial } = getCodeUsage(code);

  const copy = () => {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const disable = async () => {
    if (!confirm(`Disable ${code.code}? Nobody else will be able to redeem it.`)) return;
    setDisabling(true);
    try {
      const res = await fetchWithFreshToken('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: code.code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to disable code');
    } catch (err: any) {
      alert(err.message || 'Failed to disable code');
    } finally {
      setDisabling(false);
    }
  };

  const deleteCode = async () => {
    if (!confirm(`Delete unredeemed code ${code.code}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetchWithFreshToken('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', code: code.code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete code');
    } catch (err: any) {
      alert(err.message || 'Failed to delete code');
    } finally {
      setDeleting(false);
    }
  };

  const badge =
    code.status === 'disabled'
      ? { label: 'DISABLED', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
      : expired
      ? { label: 'EXPIRED', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
      : isFull
      ? { label: 'FULLY USED', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' }
      : isPartial
      ? { label: 'ACTIVE (PARTIAL)', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' }
      : { label: 'ACTIVE', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' };

  return (
    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
      <div className="min-w-0 flex items-start sm:items-center gap-3">
        <button
          onClick={copy}
          className="shrink-0 p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors active:scale-95 mt-0.5 sm:mt-0"
          title="Copy promo code"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-sm sm:text-base text-gray-900 dark:text-white tracking-wider break-all">
              {code.code}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.cls}`}>
              {badge.label}
            </span>
            {/* Usage Progress Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                isFull
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
              }`}
            >
              <Users className="w-3 h-3" />
              {used} / {max} used {remaining > 0 && `(${remaining} left)`}
            </span>
          </div>

          <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-2 flex-wrap mt-1">
            {code.rewardType === 'boss' || (code.bossDays && code.bossDays > 0) ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                <Crown className="w-3 h-3 fill-current" />
                {code.bossDays && code.bossDays <= 7
                  ? `Boss Trial (${code.bossDays} Days)`
                  : `Boss Tier (${code.bossDays || 31} Days)`}
              </span>
            ) : (
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Coins className="w-3 h-3 text-blue-500" />
                ৳{code.amount.toLocaleString()} Coins
              </span>
            )}

            {code.maxUsesPerUser && code.maxUsesPerUser > 1 && (
              <span className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 px-1.5 py-0.5 rounded">
                Up to {code.maxUsesPerUser}x/user
              </span>
            )}

            {code.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Exp: {new Date(code.expiresAt).toLocaleDateString()}
              </span>
            )}

            <span>Created {new Date(code.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
        {/* View Entries button */}
        {used > 0 ? (
          <button
            onClick={onViewRedemptions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
            title="Inspect every trader redemption entry"
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Entries ({used})</span>
          </button>
        ) : (
          <span className="text-[11px] text-gray-400 font-mono px-2">0 redemptions</span>
        )}

        {/* Disable active code */}
        {code.status === 'active' && !isFull && (
          <button
            onClick={disable}
            disabled={disabling}
            title="Disable future redemptions"
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50 active:scale-95"
          >
            {disabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Delete unredeemed code */}
        {used === 0 && code.status !== 'used' && (
          <button
            onClick={deleteCode}
            disabled={deleting}
            title="Delete unredeemed code"
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50 active:scale-95"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function RedemptionsModal({ code, onClose }: { code: PromoCode; onClose: () => void }) {
  const [entries, setEntries] = useState<PromoRedemptionEntry[]>(code.redemptions || []);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const { max, used } = getCodeUsage(code);

  // Fetch full subcollection entries if array was missing or limited
  useEffect(() => {
    async function loadFullHistory() {
      setLoadingEntries(true);
      try {
        const res = await fetchWithFreshToken('/api/admin/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_redemptions', code: code.code }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.redemptions) && data.redemptions.length > 0) {
          setEntries(data.redemptions);
        }
      } catch (err) {
        console.warn('Failed to fetch redemptions subcollection:', err);
      } finally {
        setLoadingEntries(false);
      }
    }
    loadFullHistory();
  }, [code.code]);

  const copyAllEmails = () => {
    const emails = entries
      .map((e) => e.userEmail)
      .filter((email): email is string => Boolean(email));
    const unique = Array.from(new Set(emails));
    if (unique.length === 0) return;
    navigator.clipboard.writeText(unique.join(', '));
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  };

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-[#1A1F26] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-lg text-gray-900 dark:text-white">
                {code.code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {used} / {max} Redeemed
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Audit log of all registered trader accounts who redeemed this promo code
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 py-3">
          <div className="text-xs font-semibold text-gray-500">
            {entries.length} Redemption Entr{entries.length === 1 ? 'y' : 'ies'} Recorded
          </div>
          {entries.some((e) => e.userEmail) && (
            <button
              onClick={copyAllEmails}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
            >
              {copiedEmails ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Mail className="w-3.5 h-3.5" />}
              {copiedEmails ? 'Copied Emails!' : 'Copy All Emails'}
            </button>
          )}
        </div>

        {/* Entries Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
          {loadingEntries && entries.length === 0 ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Loading redemption history…
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No redemptions recorded for this code yet.
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div key={entry.id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {entry.userName || 'DSE Trader'}
                    </span>
                    {entry.userEmail && (
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        ({entry.userEmail})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span className="font-mono">UID: {entry.userId.slice(0, 10)}…</span>
                    <button
                      onClick={() => copyUid(entry.userId)}
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      {copiedUid === entry.userId ? 'Copied' : 'Copy UID'}
                    </button>
                    <span>•</span>
                    <span>
                      {entry.redeemedAt
                        ? new Date(entry.redeemedAt).toLocaleString('en-US', {
                            timeZone: 'Asia/Dhaka',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }) + ' (Dhaka)'
                        : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 self-start sm:self-center">
                  {entry.rewardType === 'boss' || entry.bossDays ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                      <Crown className="w-3 h-3 fill-current" />
                      +{entry.bossDays || 31} Days Boss
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                      <Coins className="w-3 h-3" />
                      +৳{entry.amount?.toLocaleString()} Coins
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function GenerateModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'custom' | 'random'>('custom');
  const [rewardType, setRewardType] = useState<'coins' | 'boss'>('coins');
  const [amount, setAmount] = useState(5000);
  const [bossDays, setBossDays] = useState(31);
  const [quantity, setQuantity] = useState(1);
  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [allowMultiplePerUser, setAllowMultiplePerUser] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<string[] | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const isCustom = mode === 'custom' && Boolean(customCode.trim());
      const normalizedCustomCode = isCustom ? customCode.trim().toUpperCase() : undefined;

      const res = await fetchWithFreshToken('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          rewardType,
          amount: rewardType === 'coins' ? amount : 0,
          bossDays: rewardType === 'boss' ? bossDays : undefined,
          quantity: isCustom ? 1 : quantity,
          maxUses: maxUses,
          maxUsesPerUser: allowMultiplePerUser ? maxUses : 1,
          expiresInDays: expiresInDays.trim() ? Number(expiresInDays) : undefined,
          customCode: normalizedCustomCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate promo codes');
      setCreated(data.codes);
    } catch (err: any) {
      setError(err.message || 'Failed to generate promo codes');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    (rewardType === 'coins' && amount <= 0) ||
    (rewardType === 'boss' && (!bossDays || bossDays <= 0)) ||
    (mode === 'custom' && !customCode.trim());

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#1A1F26] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 max-h-[90vh] overflow-y-auto pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-center text-lg font-extrabold text-gray-900 dark:text-white mb-1">
              {created.length} Promo Code{created.length === 1 ? '' : 's'} Created!
            </h2>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4">
              {maxUses > 1
                ? `Each code can be redeemed ${maxUses} times across traders.`
                : 'Each code is single-use and ready to share.'}
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 mb-4">
              {created.map((c) => (
                <div
                  key={c}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 font-mono font-bold text-sm tracking-wider"
                >
                  <span>{c}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(c)}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(created.join('\n'))}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold active:scale-95"
              >
                Copy all
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-95"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" /> Create Promo Codes
            </h2>

            {/* Code Mode: Custom Campaign vs Random Generation */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Generation Mode
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  className={`py-2 px-3 min-h-[38px] rounded-lg text-xs font-bold transition-all ${
                    mode === 'custom'
                      ? 'bg-white dark:bg-[#111418] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Custom Named Code
                </button>
                <button
                  type="button"
                  onClick={() => setMode('random')}
                  className={`py-2 px-3 min-h-[38px] rounded-lg text-xs font-bold transition-all ${
                    mode === 'random'
                      ? 'bg-white dark:bg-[#111418] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Auto-Generate Random
                </button>
              </div>
            </div>

            {/* Custom Code Input (if mode is custom) */}
            {mode === 'custom' && (
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Custom Code Name
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="e.g. EID2026, SUMMERPROMO, DHAKA100"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono font-bold text-sm tracking-wider uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Reward Type Toggle */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Reward Type
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRewardType('coins')}
                  className={`py-2 px-3 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    rewardType === 'coins'
                      ? 'bg-white dark:bg-[#111418] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-blue-500" />
                  <span>Trading Balance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRewardType('boss')}
                  className={`py-2 px-3 min-h-[38px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    rewardType === 'boss'
                      ? 'bg-amber-500 text-gray-950 shadow-sm font-black'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>👑 Boss Tier</span>
                </button>
              </div>
            </div>

            {/* Coins or Boss Inputs */}
            {rewardType === 'coins' ? (
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Coins Amount per Redemption
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-11 px-3.5 mb-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono font-bold text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 5000, 10000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                        amount === amt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      ৳{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Boss Duration (Days)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { label: '7 Days (Trial)', days: 7 },
                    { label: '31 Days (1 Month)', days: 31 },
                    { label: '185 Days (6 Months)', days: 185 },
                    { label: '365 Days (1 Year)', days: 365 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setBossDays(p.days)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                        bossDays === p.days
                          ? 'bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-[10px] text-gray-400">Duration</div>
                      <div className="font-extrabold">{p.label}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={bossDays}
                  onChange={(e) => setBossDays(Math.max(1, Number(e.target.value)))}
                  placeholder="Custom days"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono text-sm"
                />
              </div>
            )}

            {/* Usage Limit: How many times can this code be used? */}
            <div className="mb-4 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
              <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200 mb-1 uppercase tracking-wide">
                Number of Allowed Uses (Total Redemptions)
              </label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                How many traders can redeem this code before it exhausts? (Default: 1 use)
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[1, 5, 10, 25, 50, 100, 500].map((uses) => (
                  <button
                    key={uses}
                    type="button"
                    onClick={() => setMaxUses(uses)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      maxUses === uses
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {uses === 1 ? '1 (Single-use)' : `${uses} uses`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={100000}
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
                placeholder="Custom number of uses"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111418] font-mono text-sm"
              />

              {/* Multi-use per user toggle */}
              {maxUses > 1 && (
                <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowMultiplePerUser}
                    onChange={(e) => setAllowMultiplePerUser(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Allow the <strong>same trader</strong> to redeem multiple times (Default: 1 use per account)
                  </span>
                </label>
              )}
            </div>

            {/* Random Mode Quantity */}
            {mode === 'random' && (
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Quantity of Distinct Codes to Generate
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(200, Number(e.target.value))))}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono font-bold"
                />
              </div>
            )}

            {/* Expiry */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                Expires in (Days, Optional)
              </label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Leave blank for no expiration"
                className="w-full h-11 px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={isSubmitDisabled}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-500/25"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Generate Promo Code</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
