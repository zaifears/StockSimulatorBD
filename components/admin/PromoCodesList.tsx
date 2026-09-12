'use client';

// components/admin/PromoCodesList.tsx
// Admin panel for generating and managing promo_codes/{CODE} documents.
// Structural sibling of RechargeList.tsx, but simpler: no server-side
// pagination (promo codes are a much smaller collection than recharge
// requests) and a single page with client-side status tabs instead of
// separate /admin/promo-codes/{status} routes.
//
// Reads the collection directly via onSnapshot — firestore.rules grants
// admins read access to promo_codes for exactly this — but every write
// (generate, disable) goes through app/api/admin/promo-codes, since that's
// the only path allowed to write this collection at all.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Home, Loader2, Plus, Copy, Check, Ban, Search, Gift, Crown, Sparkles, Coins, ArrowLeft } from 'lucide-react';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';

interface PromoCode {
  id: string; // = code
  code: string;
  rewardType?: 'coins' | 'boss';
  amount: number;
  bossDays?: number | null;
  status: 'active' | 'used' | 'disabled';
  redeemed: boolean;
  redeemedBy: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

type Tab = 'all' | 'active' | 'used' | 'disabled' | 'expired';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'used', label: 'Used' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'expired', label: 'Expired' },
];

const isExpired = (c: PromoCode) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

export default function PromoCodesList() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'promo_codes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PromoCode)),
      (err) => console.error('Error loading promo codes:', err)
    );
    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const c = { all: codes.length, active: 0, used: 0, disabled: 0, expired: 0 };
    for (const code of codes) {
      if (code.status === 'used') c.used++;
      else if (code.status === 'disabled') c.disabled++;
      else if (isExpired(code)) c.expired++;
      else c.active++;
    }
    return c;
  }, [codes]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return codes.filter((c) => {
      if (q && !c.code.includes(q)) return false;
      if (tab === 'all') return true;
      if (tab === 'expired') return isExpired(c) && c.status === 'active';
      if (tab === 'active') return c.status === 'active' && !isExpired(c);
      return c.status === tab;
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
              <Gift className="w-6 h-6 text-amber-500" /> Promo Codes
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Single-use promo codes for trading balance or Boss tier upgrades</p>
          </div>
          <button
            onClick={() => setShowGenerate(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 min-h-[44px] sm:min-h-0 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/30 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Generate Codes
          </button>
        </div>

        {/* Tabs — smooth horizontal touch swipe */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl mb-4 overflow-x-auto no-scrollbar flex-nowrap">
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
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code…"
            className="w-full h-11 pl-10 pr-3 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-xl text-xs sm:text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No codes match this view.</div>
          ) : (
            filtered.map((code) => <CodeRow key={code.id} code={code} expired={isExpired(code)} />)
          )}
        </div>
      </div>

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} />}
    </div>
  );
}

function CodeRow({ code, expired }: { code: PromoCode; expired: boolean }) {
  const [copied, setCopied] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const disable = async () => {
    if (!confirm(`Disable ${code.code}? This can't be undone, but it doesn't affect codes that are already used.`)) return;
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

  const badge =
    code.status === 'used'
      ? { label: 'USED', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' }
      : code.status === 'disabled'
        ? { label: 'DISABLED', cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
        : expired
          ? { label: 'EXPIRED', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
          : { label: 'ACTIVE', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' };

  return (
    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
      <div className="min-w-0 flex items-start sm:items-center gap-2.5 sm:gap-3">
        <button
          onClick={copy}
          className="shrink-0 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors active:scale-95 mt-0.5 sm:mt-0"
          title="Copy promo code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-gray-900 dark:text-white tracking-wider break-all">{code.code}</span>
            <span className={`sm:hidden px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.cls}`}>{badge.label}</span>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
            {code.rewardType === 'boss' || (code.bossDays && code.bossDays > 0) ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                <Crown className="w-3 h-3 fill-current" />
                Boss Tier ({code.bossDays || 31} Days)
              </span>
            ) : (
              <span className="font-bold text-gray-700 dark:text-gray-300">
                ৳{code.amount.toLocaleString()} Coins
              </span>
            )}
            {code.redeemedBy && <span className="font-mono break-all">→ {code.redeemedBy.slice(0, 10)}…</span>}
            {code.expiresAt && !code.redeemed && <span>expires {new Date(code.expiresAt).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
        <span className={`hidden sm:inline-block px-2 py-1 rounded-full text-[10px] font-bold border ${badge.cls}`}>{badge.label}</span>
        {code.status === 'active' && (
          <button
            onClick={disable}
            disabled={disabling}
            title="Disable this code"
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50 active:scale-95"
          >
            {disabling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function GenerateModal({ onClose }: { onClose: () => void }) {
  const [rewardType, setRewardType] = useState<'coins' | 'boss'>('coins');
  const [amount, setAmount] = useState(5000);
  const [bossDays, setBossDays] = useState(31);
  const [quantity, setQuantity] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [customCode, setCustomCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<string[] | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken(true);
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'generate',
          rewardType,
          amount: rewardType === 'coins' ? amount : 0,
          bossDays: rewardType === 'boss' ? bossDays : undefined,
          quantity: customCode.trim() ? 1 : quantity,
          expiresInDays: expiresInDays.trim() ? Number(expiresInDays) : undefined,
          customCode: customCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate codes');
      setCreated(data.codes);
    } catch (err: any) {
      setError(err.message || 'Failed to generate codes');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting || (rewardType === 'coins' && amount <= 0) || (rewardType === 'boss' && (!bossDays || bossDays <= 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#1A1F26] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6 max-h-[88vh] overflow-y-auto pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {created ? (
          <>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {created.length} code{created.length === 1 ? '' : 's'} generated
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Copy these now to share — they stay visible in the list too, but this is the easiest place to grab them all at once.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 mb-4">
              {created.map((c) => (
                <div key={c} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 font-mono font-bold text-sm tracking-wider">
                  {c}
                  <button
                    onClick={() => navigator.clipboard.writeText(c)}
                    className="p-1.5 rounded bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(created.join('\n'))}
              className="w-full mb-2 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold active:scale-95"
            >
              Copy all
            </button>
            <button onClick={onClose} className="w-full py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold active:scale-95">
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-500" /> Generate Promo Codes
            </h2>

            {/* Reward Type Toggle */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                Reward Type
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRewardType('coins')}
                  className={`py-2 px-3 min-h-[40px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    rewardType === 'coins'
                      ? 'bg-white dark:bg-[#111418] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-blue-500" />
                  <span>💰 Trading Coins</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRewardType('boss')}
                  className={`py-2 px-3 min-h-[40px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    rewardType === 'boss'
                      ? 'bg-amber-500 text-gray-950 shadow-sm font-black'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>👑 Boss Tier</span>
                </button>
              </div>
            </div>

            {/* Reward-specific fields */}
            {rewardType === 'coins' ? (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                  Coins Amount per code
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-11 px-3 mb-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono font-bold"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 5000, 10000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-semibold transition-colors border active:scale-95 ${
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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
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
                      className={`p-2.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all text-left active:scale-95 ${
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
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono text-sm"
                />
              </div>
            )}

            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Quantity {customCode.trim() && <span className="normal-case font-normal text-gray-400">(fixed at 1 for a custom code)</span>}
            </label>
            <input
              type="number"
              value={customCode.trim() ? 1 : quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              disabled={!!customCode.trim()}
              className="w-full h-11 px-3 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono font-bold disabled:opacity-50"
            />

            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Expires in (days, optional)</label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="Never expires"
              className="w-full h-11 px-3 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono"
            />

            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Custom code (optional)</label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="Leave blank to auto-generate random codes"
              className="w-full h-11 px-3 mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] font-mono uppercase"
            />

            {error && <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2 mb-4">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold active:scale-95">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={isSubmitDisabled}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Generate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
