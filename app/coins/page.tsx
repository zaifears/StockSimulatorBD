'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Footer from '@/components/shared/Footer';
import { LoadingScreen } from '@/lib/components/shared';
import { ROUTES } from '@/lib/constants';
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { 
  Gift, TrendingUp, RefreshCw, Copy, 
  CheckCircle2, XCircle, Clock, Plus, Minus, 
  Send, AlertCircle, ArrowRight, Zap, Check
} from 'lucide-react';

const BKASH_NUMBER = '01865333143';
const PRICE_PER_10K_COINS = 10; // 10 BDT = 10,000 Coins
const MIN_RECHARGE_BDT = 20; // Minimum 20 BDT
const MAX_RECHARGE_BDT = 5000; // Maximum 5,000 BDT per request
const COINS_PER_10_BDT = 10000;

export default function CoinsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
      const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
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
      sessionStorage.setItem('redirectAfterLogin', ROUTES.COINS || '/coins');
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // Real-time listener for simulator balance
  useEffect(() => {
    if (!user?.uid) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const appId = process.env.NEXT_PUBLIC_SIMULATOR_APP_ID || 'stocksimulatorbd-dse-v1';
    const stateRef = doc(db, 'artifacts', appId, 'users', user.uid, 'simulator', 'state');

    const unsubscribe = onSnapshot(
      stateRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBalance(Math.floor(data.balance || 0));
        } else {
          setBalance(0);
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

  // Handle Buy Button Click (UX Fix: Smooth scroll to form)
  const handleBuyMoreClick = () => {
    setShowRechargeForm(true);
    setTimeout(() => {
      document.getElementById('recharge-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Submit recharge request
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

    if (rechargeAmount < MIN_RECHARGE_BDT || rechargeAmount > MAX_RECHARGE_BDT || rechargeAmount % PRICE_PER_10K_COINS !== 0 || coinsToReceive <= 0) {
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
        coins: coinsToReceive,
        transactionId: trimmedTrxId,
        trxId: trimmedTrxId,
        bkashNumber: BKASH_NUMBER,
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null
      });

      // Send email notification (fire and forget)
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
              coins: coinsToReceive,
              transactionId: trimmedTrxId,
              bkashNumber: BKASH_NUMBER,
              createdAt: new Date().toISOString(),
            },
          }),
        }).catch(() => {}); // catch silently
      } catch (emailError) {}

      setRechargeSuccess('✅ Recharge request submitted! Wait for admin approval.');
      setTrxId('');
      setRechargeAmount(20);

      setTimeout(() => {
        setShowRechargeForm(false);
        setRechargeSuccess('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden text-gray-800 dark:text-gray-200">
      
      {/* ✅ HERO SECTION WITH HOMEPAGE GRID & GLOWS */}
      <section className="relative w-full pt-24 pb-12 md:pt-32 md:pb-16 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-amber-500/10 dark:bg-amber-500/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Wealth</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
              Your simulator balance is your Coin balance. Trade stocks to grow it!
            </p>
          </div>

          {/* Current Balance Card - Horizontal Layout */}
          <div className="bg-white/80 dark:bg-[#1A1F26]/90 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-xl border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            {/* Inner subtle glow shifted to a horizontal gradient */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              
              {/* Left Side: Coin Icon & Balance */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center text-center sm:text-left gap-4 sm:gap-6 w-full md:w-auto">
                {/* Coin Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center border border-amber-200/50 dark:border-amber-700/50 shadow-inner">
                  <Image
                    src="/coin/coin.png"
                    alt="StockSimulatorBD Coin"
                    width={48}
                    height={48}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                    priority
                  />
                </div>
                
                {/* Balance Text */}
                <div>
                  <div className="text-5xl sm:text-6xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight leading-none mb-2">
                    {balance.toLocaleString()}
                  </div>
                  <div className="text-base sm:text-lg text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center sm:justify-start gap-2">
                    Coins Available
                    <button
                      onClick={handleRefreshBalance}
                      disabled={refreshing}
                      title="Refresh balance"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: CTA Button */}
              <div className="w-full md:w-auto flex-shrink-0">
                <button
                  onClick={handleBuyMoreClick}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 sm:py-5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/20 transform hover:-translate-y-1 whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  Buy More Coins
                </button>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* ✅ RECHARGE FORM & HISTORY SECTION */}
      <section id="recharge-section" className="w-full bg-gray-50 dark:bg-[#111418] py-16 sm:py-20 relative z-10 flex-1 scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          
          {showRechargeForm && (
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-blue-100 dark:border-blue-900/50 mb-10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                    <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recharge Coins</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Secure payment via bKash</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRechargeForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              {/* bKash Details */}
              <div className="bg-pink-50 dark:bg-pink-900/10 rounded-2xl p-6 mb-8 border border-pink-100 dark:border-pink-900/30">
                <p className="text-sm font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Send Money To:
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-3xl sm:text-4xl font-bold text-pink-600 dark:text-pink-400 tracking-wider font-mono">
                    {BKASH_NUMBER}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(BKASH_NUMBER);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all w-full sm:w-auto justify-center shadow-md shadow-pink-500/20"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Number'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleRechargeSubmit} className="space-y-8">
                {/* Amount Selector */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                    Amount in BDT
                  </label>
                  
                  {/* Quick Select Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRechargeAmount(amt)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                          rechargeAmount === amt
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                        }`}
                      >
                        {amt} BDT
                      </button>
                    ))}
                  </div>

                  {/* Manual Input */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRechargeAmount(Math.max(MIN_RECHARGE_BDT, rechargeAmount - PRICE_PER_10K_COINS))}
                      disabled={rechargeAmount <= MIN_RECHARGE_BDT}
                      className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xl flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Minus className="w-5 h-5" />
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
                      className="flex-1 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111418] text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setRechargeAmount(Math.min(MAX_RECHARGE_BDT, rechargeAmount + PRICE_PER_10K_COINS))}
                      disabled={rechargeAmount >= MAX_RECHARGE_BDT}
                      className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xl flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      You receive: {coinsToReceive.toLocaleString()} Coins
                    </p>
                  </div>
                </div>

                {/* TrxID Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                    bKash Transaction ID
                  </label>
                  <input
                    type="text"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="Example: 9C7B2A1D3E"
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111418] text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all uppercase"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Found in your bKash SMS or app history
                  </p>
                </div>

                {/* Status Messages */}
                {rechargeError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{rechargeError}</span>
                  </div>
                )}
                {rechargeSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm">{rechargeSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-8 rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Submit Request
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Recharge History */}
          {requests.length > 0 && (
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 mb-10">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" /> Recent Requests
              </h2>
              <div className="space-y-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111418] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        {req.amount} BDT <span className="text-gray-400 font-normal mx-2">→</span> {req.coins?.toLocaleString()} Coins
                      </div>
                      <div className="text-xs text-gray-500 font-mono mb-1">TrxID: {req.trxId}</div>
                      <div className="text-xs text-gray-400">
                        {req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap w-fit border ${
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                      : req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/50">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Grow by Trading</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Buy and sell DSE stocks. Profitable trades directly increase your Coin balance.</p>
            </div>
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800/50">
                <Gift className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Free Signup Bonus</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Every new user receives 10,000 Coins for free upon account verification.</p>
            </div>
          </div>

          {/* Trade CTA */}
          <div className="text-center">
            <button
              onClick={() => router.push('/trade')}
              className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:-translate-y-1"
            >
              Go to Simulator <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <div className="mt-auto z-10 bg-white dark:bg-[#090E17] border-t border-gray-100 dark:border-gray-800/60">
        <Footer />
      </div>
    </main>
  );
}