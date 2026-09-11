'use client';

// app/coins/page.tsx
// Funds screen — the app-shell version of what used to be a full marketing
// page (hero section, grid background, glows, footer). All the functional
// logic (bKash recharge submission, request history, validation) is
// unchanged; only the chrome changed: AppShell instead of the marketing
// navbar, compact cards instead of a landing-page hero, and balance now
// reads from the shared simulator subscription (contexts/SimulatorContext)
// instead of running its own separate onSnapshot listener on the same
// document.
//
// SEO: app/coins/layout.tsx (a server component) still exports this route's
// title/OG/Twitter metadata untouched — that's independent of how the client
// page inside it renders, so link previews and any indexing that already
// applied to this URL are unaffected by this rewrite.
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import AppShell from '@/components/app/AppShell';
import Image from 'next/image';
import { getFirestore, collection, query, where, orderBy, addDoc, onSnapshot } from 'firebase/firestore';
import {
  Gift, TrendingUp, Copy, CheckCircle2, XCircle, Clock, Plus, Minus,
  Send, AlertCircle, ArrowRight, Zap, Check, Ticket, Loader2, Crown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import BossBadge from '@/components/ui/BossBadge';

const BKASH_NUMBER = '01865333143';
const PRICE_PER_10K_COINS = 20; // 20 BDT = 10,000 Coins (500 coins per taka)
const MIN_RECHARGE_BDT = 20;
const MAX_RECHARGE_BDT = 5000;
const COINS_PER_10_BDT = 10000;

export default function CoinsPage() {
  return (
    <AppShell redirectPath="/coins" redirectMessage="Please sign in to manage your funds">
      <FundsScreen />
    </AppShell>
  );
}

function FundsScreen() {
  const { user, accountTier, isBoss } = useAuth();
  const router = useRouter();
  const { simulatorState } = useSharedSimulator();
  const balance = Math.floor(simulatorState.balance);

  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(20);
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rechargeError, setRechargeError] = useState('');
  const [rechargeSuccess, setRechargeSuccess] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  const baseCoins = Math.floor(rechargeAmount / PRICE_PER_10K_COINS) * COINS_PER_10_BDT;
  const bonusCoins = isBoss ? Math.round(baseCoins * 0.10) : 0;
  const coinsToReceive = baseCoins + bonusCoins;

  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(
      collection(db, 'recharge_requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setRequests(snapshot.docs.slice(0, 10).map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error('Error fetching recharge requests:', error)
    );
    return () => unsubscribe();
  }, [user]);

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) {
      setPromoError('Enter a code');
      return;
    }

    setPromoSubmitting(true);
    setPromoError('');
    setPromoSuccess('');

    try {
      const res = await fetchWithFreshToken('/api/simulator/promo-redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to redeem code');

      // No local balance update needed — the shared simulator/state
      // listener (contexts/SimulatorContext) picks up the server's credit
      // on its own, same as every other balance-changing action in the app.
      setPromoSuccess(data.message || 'Code redeemed!');
      setPromoCode('');
    } catch (err: any) {
      setPromoError(err.message || 'Failed to redeem code');
    } finally {
      setPromoSubmitting(false);
    }
  };

  const handleBuyMoreClick = () => {
    setShowRechargeForm(true);
    setTimeout(() => {
      document.getElementById('recharge-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTrxId = trxId.trim();

    if (!user || !trimmedTrxId) {
      setRechargeError('Please enter your bKash Transaction ID');
      return;
    }
    if (!/^[A-Za-z0-9]{5,20}$/.test(trimmedTrxId)) {
      setRechargeError('Invalid Transaction ID format. It should be 5-20 alphanumeric characters.');
      return;
    }
    if (rechargeAmount < MIN_RECHARGE_BDT || rechargeAmount > MAX_RECHARGE_BDT || rechargeAmount % PRICE_PER_10K_COINS !== 0 || baseCoins <= 0) {
      setRechargeError(`Invalid amount. Must be between ${MIN_RECHARGE_BDT} and ${MAX_RECHARGE_BDT} BDT, and a multiple of ${PRICE_PER_10K_COINS}.`);
      return;
    }

    setIsSubmitting(true);
    setRechargeError('');
    setRechargeSuccess('');

    try {
      const db = getFirestore();
      const rechargeRef = await addDoc(collection(db, 'recharge_requests'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userEmail: user.email,
        amount: rechargeAmount,
        coins: baseCoins, // Matches firestore.rules exchange rate: (amount / 20) * 10000
        bonusCoins: bonusCoins,
        totalCoins: coinsToReceive,
        isBoss: !!isBoss,
        transactionId: trimmedTrxId,
        trxId: trimmedTrxId,
        bkashNumber: BKASH_NUMBER,
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null,
      });

      try {
        fetch('/api/coins/send-recharge-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailData: {
              requestId: rechargeRef.id,
              userName: user.displayName || user.email?.split('@')[0] || 'User',
              userEmail: user.email,
              amount: rechargeAmount,
              coins: baseCoins,
              bonusCoins: bonusCoins,
              totalCoins: coinsToReceive,
              isBoss: !!isBoss,
              accountTier: accountTier || 'Bro',
              transactionId: trimmedTrxId,
              bkashNumber: BKASH_NUMBER,
              createdAt: new Date().toISOString(),
            },
          }),
        }).catch(() => {});
      } catch {}

      setRechargeSuccess('Recharge request submitted! Wait for admin approval.');
      setTrxId('');
      setRechargeAmount(20);
      setTimeout(() => {
        setShowRechargeForm(false);
        setRechargeSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Recharge submit error:', err);
      setRechargeError('Failed to submit recharge request. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
      <h1 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">Funds</h1>

      {/* Balance card */}
      <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl flex items-center justify-center border border-amber-200/50 dark:border-amber-700/50">
              <Image src="/coin/coin.png" alt="" width={28} height={28} className="w-7 h-7 object-contain" priority />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
                {balance.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Coins available</div>
            </div>
          </div>
          <button
            onClick={handleBuyMoreClick}
            className="shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Recharge
          </button>
        </div>
      </div>

      {/* 👑 Boss Mode +10% Coin Bonus Banner */}
      {isBoss ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-[#1a2130] dark:to-[#131822] border-2 border-amber-500/40 dark:border-amber-500/30 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-gray-950 flex items-center justify-center shrink-0 shadow-md">
                <Crown className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-black text-sm text-gray-900 dark:text-white">
                  <span>Boss Perk Active: +10% Free Coins</span>
                  <BossBadge size="xs" interactive={false} />
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                  You automatically get <strong className="font-extrabold">10% extra coins for free</strong> on all your bKash recharges!
                </p>
              </div>
            </div>
            <Link
              href="/boss"
              className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline hidden sm:block"
            >
              Boss Perks →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-950/30 dark:via-yellow-950/10 dark:to-transparent border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1">
                  <span>Boss Perk: 10% Extra Coins For Free</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  Boss tier gives you <strong className="text-amber-600 dark:text-amber-400 font-bold">10% extra coins for free</strong> on every recharge.
                </p>
              </div>
            </div>
            <Link
              href="/boss"
              className="shrink-0 inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 text-xs font-extrabold shadow-sm transition-all"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Upgrade to Boss (৳20)</span>
            </Link>
          </div>
        </div>
      )}

      {/* Promo code redemption — single-use codes credited server-side via
          app/api/simulator/promo-redeem, one redemption allowed per account. */}
      <div className="bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 shrink-0 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
            <Ticket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Have a promo code?</h2>
        </div>
        <form onSubmit={handleRedeemPromo} className="flex items-center gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              if (promoError) setPromoError('');
            }}
            placeholder="Enter code"
            className="flex-1 h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] text-sm font-mono font-bold uppercase tracking-wider"
          />
          <button
            type="submit"
            disabled={promoSubmitting || !promoCode.trim()}
            className="shrink-0 h-11 px-5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 text-white text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5"
          >
            {promoSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Redeem
          </button>
        </form>
        {promoError && (
          <p className="mt-2.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> {promoError}
          </p>
        )}
        {promoSuccess && (
          <p className="mt-2.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {promoSuccess}
          </p>
        )}
      </div>

      <div id="recharge-section" className="scroll-mt-24">
        {showRechargeForm && (
          <div className="bg-white dark:bg-[#1A1F26] rounded-2xl p-5 border-2 border-blue-100 dark:border-blue-900/50 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Recharge Coins</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Secure payment via bKash</p>
                </div>
              </div>
              <button
                onClick={() => setShowRechargeForm(false)}
                aria-label="Close"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/10 rounded-xl p-4 mb-5 border border-pink-100 dark:border-pink-900/30">
              <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Send Money To:
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xl font-bold text-pink-600 dark:text-pink-400 tracking-wider font-mono">
                  {BKASH_NUMBER}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(BKASH_NUMBER);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <form onSubmit={handleRechargeSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  Amount in BDT
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[20, 40, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        rechargeAmount === amt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {amt} BDT
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRechargeAmount(Math.max(MIN_RECHARGE_BDT, rechargeAmount - PRICE_PER_10K_COINS))}
                    disabled={rechargeAmount <= MIN_RECHARGE_BDT}
                    className="w-11 h-11 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || MIN_RECHARGE_BDT;
                      const snapped = Math.round(val / PRICE_PER_10K_COINS) * PRICE_PER_10K_COINS;
                      setRechargeAmount(Math.min(MAX_RECHARGE_BDT, Math.max(MIN_RECHARGE_BDT, snapped)));
                    }}
                    min={MIN_RECHARGE_BDT}
                    max={MAX_RECHARGE_BDT}
                    step={PRICE_PER_10K_COINS}
                    className="flex-1 h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] text-lg font-bold text-center tabular-nums"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setRechargeAmount(Math.min(MAX_RECHARGE_BDT, rechargeAmount + PRICE_PER_10K_COINS))}
                    disabled={rechargeAmount >= MAX_RECHARGE_BDT}
                    className="w-11 h-11 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {isBoss ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center mt-3">
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      <span>Base: <strong>{baseCoins.toLocaleString()}</strong></span>
                      <span className="mx-1.5">•</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">+10% Free Bonus: +{bonusCoins.toLocaleString()}</span>
                    </div>
                    <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                      <Crown className="w-4 h-4 fill-current" />
                      <span>You receive: {coinsToReceive.toLocaleString()} Coins</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-center">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      You receive: {baseCoins.toLocaleString()} Coins
                    </p>
                    <Link
                      href="/boss"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold mt-1"
                    >
                      <Crown className="w-3 h-3" />
                      <span>Boss gets 10% extra coins for free (+{Math.round(baseCoins * 0.1).toLocaleString()} free coins). Upgrade for ৳20 →</span>
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  bKash Transaction ID
                </label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="Example: 9C7B2A1D3E"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111418] text-sm font-mono uppercase"
                  required
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Found in your bKash SMS or app history
                </p>
              </div>

              {rechargeError && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {rechargeError}
                </div>
              )}
              {rechargeSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {rechargeSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {requests.length > 0 && (
          <div className="bg-white dark:bg-[#1A1F26] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm mb-4">
            <h2 className="text-sm font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" /> Recent Requests
            </h2>
            <div className="space-y-2.5">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111418] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5">
                      <span>{req.amount} BDT <span className="text-gray-400 font-normal mx-0.5">→</span> {(req.creditedCoins || req.totalCoins || req.coins)?.toLocaleString()} Coins</span>
                      {req.bonusCoins > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold border border-amber-500/30">
                          <Crown className="w-2.5 h-2.5 fill-current" />
                          +{req.bonusCoins.toLocaleString()} Boss Bonus
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono truncate">TrxID: {req.trxId}</div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${
                      req.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                        : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    }`}
                  >
                    {req.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-[#1A1F26] rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <div className="w-9 h-9 mx-auto bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-2 border border-blue-100 dark:border-blue-800/50">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">Grow by Trading</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Profitable trades grow your balance.</p>
          </div>
          <div className="bg-white dark:bg-[#1A1F26] rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <div className="w-9 h-9 mx-auto bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-2 border border-emerald-100 dark:border-emerald-800/50">
              <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">Free Signup Bonus</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">10,000 free Coins on verification.</p>
          </div>
        </div>

        <button
          onClick={() => router.push('/trade')}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.98]"
        >
          Go to Simulator <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
