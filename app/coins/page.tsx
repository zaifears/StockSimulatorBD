'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Footer from '@/components/shared/Footer';
import { LoadingScreen } from '@/lib/components/shared';
import { ROUTES } from '@/lib/constants';
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, addDoc, getDocs, limit } from 'firebase/firestore';
import { useRecaptcha } from '@/hooks/useRecaptcha';

const BKASH_NUMBER = '01865333143';
const PRICE_PER_10K_COINS = 10; // 10 BDT = 10,000 Coins
const MIN_RECHARGE_BDT = 20; // Minimum 20 BDT
const MAX_RECHARGE_BDT = 5000; // Maximum 5,000 BDT per request
const COINS_PER_10_BDT = 10000;

const CoinsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { verifyRecaptcha } = useRecaptcha();

  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recharge form state
  const [showRechargeForm, setShowRechargeForm] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(20);
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rechargeError, setRechargeError] = useState('');
  const [rechargeSuccess, setRechargeSuccess] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Derived values
  const coinsToReceive = Math.floor(rechargeAmount / PRICE_PER_10K_COINS) * COINS_PER_10_BDT;

  // Manual refresh: re-read balance from Firestore
  const handleRefreshBalance = async () => {
    if (!user?.uid || refreshing) return;
    setRefreshing(true);
    try {
      const db = getFirestore();
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'skilldash-dse-v1';
      const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');
      const { getDoc: gDoc } = await import('firebase/firestore');
      const snap = await gDoc(stateRef);
      if (snap.exists()) {
        setBalance(Math.floor(snap.data().balance || 0));
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
    setTimeout(() => setRefreshing(false), 600);
  };

  // Auth redirect logic
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem('redirectMessage', 'Please log in to continue');
      sessionStorage.setItem('redirectAfterLogin', ROUTES.COINS);
      router.replace(ROUTES.AUTH);
    }
  }, [user, authLoading, router]);

  // Real-time listener for simulator balance (which IS the coin balance)
  useEffect(() => {
    if (!user?.uid) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'skilldash-dse-v1';
    const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');

    const unsubscribe = onSnapshot(
      stateRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBalance(Math.floor(data.balance || 0));
        } else {
          setBalance(0); // No state yet — bonus will create it
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching balance:', error);
        setBalance(0);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch user's recharge requests
  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const q = query(
      collection(db, 'recharge_requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = snapshot.docs
        .slice(0, 10)
        .map(d => ({ id: d.id, ...d.data() }));
      setRequests(requestsData);
    }, (error) => {
      console.error('Error fetching recharge requests:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Submit recharge request
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTrxId = trxId.trim();

    if (!user || !trimmedTrxId) {
      setRechargeError('Please enter your bKash Transaction ID');
      return;
    }

    // Basic TrxID format validation (alphanumeric, 5-20 chars)
    if (!/^[A-Za-z0-9]{5,20}$/.test(trimmedTrxId)) {
      setRechargeError('Invalid Transaction ID format. It should be 5-20 alphanumeric characters.');
      return;
    }

    if (rechargeAmount < MIN_RECHARGE_BDT) {
      setRechargeError(`Minimum recharge is ${MIN_RECHARGE_BDT} BDT`);
      return;
    }

    if (rechargeAmount > MAX_RECHARGE_BDT) {
      setRechargeError(`Maximum recharge is ${MAX_RECHARGE_BDT} BDT per request`);
      return;
    }

    if (rechargeAmount % PRICE_PER_10K_COINS !== 0) {
      setRechargeError(`Amount must be a multiple of ${PRICE_PER_10K_COINS} BDT`);
      return;
    }

    if (coinsToReceive <= 0) {
      setRechargeError('Invalid amount. Please increase the recharge amount.');
      return;
    }

    setIsSubmitting(true);
    setRechargeError('');
    setRechargeSuccess('');

    try {
      // 🤖 Verify with reCAPTCHA before submitting
      const recaptchaResult = await verifyRecaptcha('submit_recharge');
      
      if (!recaptchaResult.success) {
        setRechargeError(recaptchaResult.error || 'Security verification failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const db = getFirestore();

      // Removed client-side cross-user duplicate check to prevent Firebase permission errors.
      // Admins will visually see and reject any duplicate TrxIDs in their dashboard.

      const rechargeRef = await addDoc(collection(db, 'recharge_requests'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userEmail: user.email,
        amount: rechargeAmount,
        coins: coinsToReceive,
        transactionId: trimmedTrxId,
        trxId: trimmedTrxId,
        bkashNumber: BKASH_NUMBER,
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null
      });

      // 📧 Send email notification to admin (fire and forget - don't block UX)
      try {
        await fetch('/api/coins/send-recharge-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailData: {
              requestId: rechargeRef.id,
              userName: user.displayName || user.email?.split('@')[0] || 'User',
              userEmail: user.email,
              amount: rechargeAmount,
              coins: coinsToReceive,
              transactionId: trimmedTrxId,
              bkashNumber: BKASH_NUMBER,
              createdAt: new Date().toISOString(),
            },
            recaptchaToken: recaptchaResult.token, // Optional: send token for additional verification
          }),
        });
        console.log('✅ Admin notification email queued');
      } catch (emailError) {
        console.error('⚠️ Failed to send email notification:', emailError);
        // Don't fail the recharge request if email fails
      }

      setRechargeSuccess('✅ Recharge request submitted! Wait for admin approval.');
      setTrxId('');
      setRechargeAmount(20);

      setTimeout(() => {
        setShowRechargeForm(false);
        setRechargeSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error('Recharge submit error:', err);
      setRechargeError('Failed to submit recharge request. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-20">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
              <Image
                src="/coin/coin.png"
                alt="SkillDash Coin"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
              Your Coins
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            Your simulator balance is your Coin balance. Trade stocks to grow your Coins!
          </p>
        </div>

        {/* Current Balance - Hero Card */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-1 mb-8 shadow-xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8">
            <div className="inline-flex items-center gap-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 w-full justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                <Image
                  src="/coin/coin.png"
                  alt="SkillDash Coin"
                  width={64}
                  height={64}
                  className="w-16 h-16 object-contain"
                  priority
                />
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-1 tabular-nums">
                  {balance.toLocaleString()}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  Coins Available
                </div>
              </div>
              <button
                onClick={handleRefreshBalance}
                disabled={refreshing}
                title="Refresh balance"
                className="ml-2 p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-6 h-6 text-gray-500 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Buy More Coins Button */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => setShowRechargeForm(!showRechargeForm)}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-200 hover:scale-105 shadow-2xl flex items-center justify-center gap-2 sm:gap-3"
          >
            <span className="text-2xl sm:text-3xl">💰</span>
            <span>{showRechargeForm ? 'Hide Recharge Form' : 'Buy More Coins'}</span>
          </button>
        </div>

        {/* Recharge Form (Collapsible) */}
        {showRechargeForm && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 shadow-xl mb-8 border-2 border-green-500 dark:border-green-600">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-5 h-5 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">Recharge with bKash</h2>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">Quick and secure payment</p>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">10 BDT = 10,000 Coins</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Minimum recharge: {MIN_RECHARGE_BDT} BDT ({(MIN_RECHARGE_BDT / PRICE_PER_10K_COINS * COINS_PER_10_BDT).toLocaleString()} Coins)</p>
              </div>
            </div>

            {/* bKash Number Display */}
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-4 sm:p-6 rounded-xl mb-6 sm:mb-8 border-2 border-pink-200 dark:border-pink-800">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-xs sm:text-sm font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wide">Send Money To:</p>
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-3 my-3 sm:my-4">
                <div className="text-2xl sm:text-4xl font-bold text-pink-600 dark:text-pink-400 tracking-wider font-mono">
                  {BKASH_NUMBER}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(BKASH_NUMBER);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex-shrink-0 bg-pink-600 hover:bg-pink-700 text-white p-1.5 sm:p-2 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="Copy"
                  >
                    {copied ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                  </button>
                  {copied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in">
                      Copied!
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/20 p-2 sm:p-3 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Use <strong>&quot;Send Money&quot;</strong> option in bKash app, then copy your <strong>TrxID</strong> and submit below.</p>
              </div>
            </div>

            <form onSubmit={handleRechargeSubmit} className="space-y-6 sm:space-y-8">
              {/* Amount Input */}
              <div>
                <label className="flex text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide items-center gap-2">
                  Amount in BDT (min {MIN_RECHARGE_BDT}, multiples of {PRICE_PER_10K_COINS})
                </label>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Minus Button */}
                  <button
                    type="button"
                    onClick={() => setRechargeAmount(Math.max(MIN_RECHARGE_BDT, rechargeAmount - PRICE_PER_10K_COINS))}
                    disabled={rechargeAmount <= MIN_RECHARGE_BDT}
                    className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-40 disabled:hover:scale-100"
                  >
                    −
                  </button>

                  <input
                    type="number"
                    value={rechargeAmount}
                    aria-label="Recharge Amount in BDT"
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || MIN_RECHARGE_BDT;
                      // Snap to nearest valid multiple and clamp within range
                      const snapped = Math.round(val / PRICE_PER_10K_COINS) * PRICE_PER_10K_COINS;
                      setRechargeAmount(Math.min(MAX_RECHARGE_BDT, Math.max(MIN_RECHARGE_BDT, snapped)));
                    }}
                    min={MIN_RECHARGE_BDT}
                    max={MAX_RECHARGE_BDT}
                    step={PRICE_PER_10K_COINS}
                    className="flex-1 min-w-0 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-2xl sm:text-3xl font-bold text-center focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />

                  {/* Plus Button */}
                  <button
                    type="button"
                    onClick={() => setRechargeAmount(Math.min(MAX_RECHARGE_BDT, rechargeAmount + PRICE_PER_10K_COINS))}
                    disabled={rechargeAmount >= MAX_RECHARGE_BDT}
                    className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-2xl sm:text-3xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg disabled:opacity-40 disabled:hover:scale-100"
                  >
                    +
                  </button>
                </div>
                <div className="mt-3 sm:mt-4 text-center space-y-2">
                  <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    You&apos;ll get: {coinsToReceive.toLocaleString()} Coins
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Send exactly <strong>{rechargeAmount} BDT</strong> to {BKASH_NUMBER}
                  </div>
                </div>
              </div>

              {/* Quick Select */}
              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide flex items-center gap-2">
                  <span>⚡</span><span>Quick Select:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {[20, 50, 100, 200].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`group p-3 sm:p-5 rounded-xl border-2 transition-all duration-200 ${
                        rechargeAmount === amt
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105 shadow-lg'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:scale-105'
                      }`}
                    >
                      <div className={`text-xl sm:text-2xl font-bold mb-1 ${
                        rechargeAmount === amt ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {amt} BDT
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {(Math.floor(amt / PRICE_PER_10K_COINS) * COINS_PER_10_BDT).toLocaleString()} Coins
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* TrxID Input */}
              <div>
                <label className="flex text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>bKash Transaction ID:</span>
                </label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  aria-label="bKash Transaction ID"
                  placeholder="Example: 9C7B2A1D3E"
                  title="bKash Transaction ID"
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-base sm:text-lg font-mono focus:ring-4 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                />
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Find this in your bKash transaction details
                </p>
              </div>

              {/* Error/Success Messages */}
              {rechargeError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 sm:p-4 rounded-xl flex items-start gap-2 sm:gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-medium text-sm sm:text-base">{rechargeError}</span>
                </div>
              )}
              {rechargeSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-3 sm:p-4 rounded-xl flex items-start gap-2 sm:gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="font-medium text-sm sm:text-base">{rechargeSuccess}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-base sm:text-lg py-4 sm:py-5 px-6 sm:px-8 rounded-xl transition-all duration-200 hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 sm:gap-3"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Submit Request ({rechargeAmount} BDT → {coinsToReceive.toLocaleString()} Coins)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Recharge Request History */}
        {requests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg mb-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">📜 Your Recharge Requests</h2>
            <div className="space-y-3 sm:space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    req.status === 'approved'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : req.status === 'rejected'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
                        {req.coins?.toLocaleString()} Coins — {req.amount} BDT
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        TrxID: <span className="font-mono text-[10px] sm:text-sm">{req.trxId}</span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </div>
                    </div>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold self-start flex-shrink-0 ${
                      req.status === 'approved' ? 'bg-green-500 text-white'
                      : req.status === 'rejected' ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-white'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                  {req.status === 'approved' && (
                    <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-2">✅ Coins credited to your account!</div>
                  )}
                  {req.status === 'rejected' && (
                    <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2">❌ Request rejected. Contact support for details.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exchange Rate Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-lg mb-8 border-2 border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl">💱</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Exchange Rate</h2>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 text-center">
            <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10 BDT = 10,000 Coins</div>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              New users start with <strong>10,000 Coins</strong> for free.
              <br/>
              Need more? Recharge via bKash above!
            </p>
          </div>
        </div>

        {/* How Coins Work */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-xl shadow-lg">💡</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">How Coins Work</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-2xl">🎁</span>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">Free 10,000 Coins on Signup</h3>
                <p className="text-green-700 dark:text-green-400 text-sm">Every new user receives 10,000 Coins for free when they create an account and verify it.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-300">Grow by Trading</h3>
                <p className="text-blue-700 dark:text-blue-400 text-sm">Buy and sell DSE stocks in the simulator. Profitable trades increase your Coin balance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-semibold text-pink-800 dark:text-pink-300">Buy More via bKash</h3>
                <p className="text-pink-700 dark:text-pink-400 text-sm">Need more Coins? Send 10 BDT via bKash for 10,000 Coins. Minimum recharge: 20 BDT.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA to Simulator */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push(ROUTES.SIMULATOR)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg py-4 px-8 rounded-xl transition-all duration-200 hover:scale-105 shadow-xl flex items-center justify-center gap-3 mx-auto"
          >
            <span className="text-2xl">📈</span>
            <span>Start Trading</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-4 mt-12 sm:mt-16">
        <Footer />
      </div>
    </div>
  );
};

export default CoinsPage;
