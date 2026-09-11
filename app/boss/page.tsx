'use client';

// app/boss/page.tsx
// Pricing & Complete Feature Audit Page: Bro (Free) vs Boss (Pro)
// Optimized for mobile (320px-640px) and large displays (1280px-2560px).
// Preview mode: complete visual, interactive comparison and bKash payment instructions.

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BossBadge from '@/components/ui/BossBadge';
import Footer from '@/components/shared/Footer';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import {
  Crown,
  Check,
  X,
  Zap,
  ShieldCheck,
  FileText,
  PieChart,
  Receipt,
  Coins,
  Copy,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  History,
  Building2,
  Download,
  Flame,
  ChevronDown,
  Shield,
  Filter,
  Loader2,
  AlertCircle,
  LogIn,
} from 'lucide-react';

const BKASH_NUMBER = '01865333143';

interface PlanDetails {
  id: 'monthly' | 'semester';
  name: string;
  badge?: string;
  durationDays: number;
  durationLabel: string;
  priceBdt: number;
  perDayText: string;
  savingsText?: string;
  popular?: boolean;
}

const PLANS: PlanDetails[] = [
  {
    id: 'monthly',
    name: 'Monthly Boss',
    durationDays: 31,
    durationLabel: '31 Days Access',
    priceBdt: 20,
    perDayText: '৳0.65 / day',
  },
  {
    id: 'semester',
    name: 'Semester Boss',
    badge: 'BEST VALUE • SAVE 18%',
    durationDays: 185,
    durationLabel: '6 Months (185 Days)',
    priceBdt: 99,
    perDayText: '৳0.53 / day',
    savingsText: 'Save ৳21 vs monthly renewals',
    popular: true,
  },
];

interface AuditFeature {
  name: string;
  description: string;
  bro: string | boolean;
  boss: string | boolean;
  isBossExclusive?: boolean;
  tag?: string;
}

interface AuditCategory {
  category: string;
  description: string;
  features: AuditFeature[];
}

const COMPLETE_AUDIT_DATA: AuditCategory[] = [
  {
    category: '1. DSE Core Trading Engine',
    description: 'The authentic Dhaka Stock Exchange market simulation — 100% free forever for every Bro.',
    features: [
      {
        name: 'DSE Live Market Board',
        description: 'Real-time prices for 400+ listed instruments, category filters (A, B, N, Z), and instant search.',
        bro: 'Included Free',
        boss: 'Included Free',
      },
      {
        name: 'Realistic Order Execution',
        description: 'Instant buy & sell market orders matched against actual live DSE Last Traded Price (LTP).',
        bro: 'Included Free',
        boss: 'Included Free',
      },
      {
        name: 'Clearing & Settlement Rules',
        description: 'Authentic T+1 clearing settlement cycle and 0.40% brokerage commission, matching real brokerages.',
        bro: 'T+1 & 0.40%',
        boss: 'T+1 & 0.40%',
      },
      {
        name: 'Starting Demo Capital',
        description: '৳100,000 virtual paper cash upon signup + 10,000 welcome bonus for verified users.',
        bro: '৳100k + 10k',
        boss: '৳100k + 10k',
      },
      {
        name: 'Technical Candlestick Charts',
        description: 'Interactive daily candlestick charts powered by TradingView Lightweight Charts engine.',
        bro: '90-Day Daily',
        boss: '90-Day Daily',
      },
      {
        name: 'Holdings Portfolio Table',
        description: 'Real-time overview of current held stocks, entry price, total valuation, day P&L, and net return.',
        bro: 'Included Free',
        boss: 'Included Free',
      },
    ],
  },
  {
    category: '2. Analytics & Risk Radar (Boss Exclusive)',
    description: 'Institutional-grade portfolio analytics to uncover hidden risks and evaluate your true returns.',
    features: [
      {
        name: 'Portfolio Insights Radar (Feature A)',
        description: 'Banked Realized P&L vs Unrealized gains, DSE Category spread (A/B/N/Z), and 40%+ concentration risk alerts.',
        bro: false,
        boss: 'Full Radar Active',
        isBossExclusive: true,
        tag: 'Feature A',
      },
      {
        name: 'Industry Sector Exposure',
        description: 'Deep asset distribution breakdown across all 21 DSE industry sectors (Banks, Pharma, Fuel & Power, Textiles, etc.).',
        bro: false,
        boss: '21 Sectors Breakdown',
        isBossExclusive: true,
      },
      {
        name: 'Cumulative Commission Paid Tracker',
        description: 'Calculates the exact 0.4% brokerage fee your trade churn would cost in real-world broker accounts.',
        bro: false,
        boss: 'Live Lifetime Audit',
        isBossExclusive: true,
      },
    ],
  },
  {
    category: '3. Statements & Historical Depth',
    description: 'Complete record-keeping and shareable statements for serious learners and trading track records.',
    features: [
      {
        name: 'Order History Depth (Feature B)',
        description: 'Lookback depth into previous buy and sell executions, prices, timestamps, and commissions.',
        bro: 'Last 10 Trades',
        boss: 'Unlimited Lifetime Audit',
        isBossExclusive: true,
        tag: 'Feature B',
      },
      {
        name: 'Official Portfolio Statement (PDF)',
        description: '1-click download of an official, executive-ready PDF statement of your portfolio holdings, cost basis, and returns.',
        bro: false,
        boss: '1-Click High-Res PDF',
        isBossExclusive: true,
        tag: 'New Feature',
      },
    ],
  },
  {
    category: '4. Economic Perks & Status',
    description: 'Tangible account advantages, recharge multipliers, and platform recognition.',
    features: [
      {
        name: 'Recharge Coin Bonus (Feature C)',
        description: 'Extra virtual coins automatically credited on every single bKash fund recharge (e.g. ৳100 = 55,000 coins).',
        bro: 'Standard (500/৳)',
        boss: '+10% Extra Coins',
        isBossExclusive: true,
        tag: 'Feature C',
      },
      {
        name: 'Golden BOSS Profile Badge',
        description: 'Distinctive metallic gold crown badge displayed beside your username on profile, leaderboard, and community.',
        bro: 'Bro Member',
        boss: 'Golden Crown BOSS',
        isBossExclusive: true,
      },
      {
        name: 'Priority Features & Sandbox Betas',
        description: 'Highest priority access to upcoming DSE multi-portfolio sandbox slots and new analysis tools.',
        bro: 'Standard Queue',
        boss: 'VIP Priority Access',
        isBossExclusive: true,
      },
    ],
  },
];

const FAQS = [
  {
    q: 'Will core paper trading ever become paid?',
    a: 'Never. Buying, selling, live DSE market tickers, 400+ stocks, and basic portfolio tracking are 100% free and will remain free forever for every Bro. StockSimulatorBD exists to democratize financial literacy in Bangladesh.',
  },
  {
    q: 'Why ৳20 or ৳99 instead of a recurring monthly subscription?',
    a: 'In Bangladesh, automated credit card debits are frustrating and often get declined. We believe in complete transparency: no auto-renewals, no hidden fees, and no surprises. You pay once for 31 days or 185 days via bKash, and it simply expires when the time is up.',
  },
  {
    q: 'What happens when my Boss membership expires?',
    a: 'Your account seamlessly transitions back to the Bro tier. You will never lose your stocks, balance, or trades. Boss-exclusive views like deep analytics and PDF generation will pause until you choose to renew.',
  },
  {
    q: 'How does the +10% Recharge Coin Bonus work?',
    a: 'Whenever you recharge virtual coins (for example, ৳100 recharge = 50,000 coins for Bro), an active Boss member receives 55,000 coins (+5,000 bonus coins) credited directly to their simulator balance.',
  },
  {
    q: 'Can I export my portfolio PDF on my phone?',
    a: 'Yes! The Portfolio PDF Generator runs seamlessly on both mobile phones and desktop computers, allowing you to instantly download or share your portfolio summary.',
  },
];

export default function BossPage() {
  const { user, accountTier, isBoss } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semester'>('semester');
  const [copied, setCopied] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<{
    requestId: string;
    planName: string;
    amount: number;
    durationDays: number;
    trxId: string;
  } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [auditFilter, setAuditFilter] = useState<'all' | 'boss_only'>('all');

  const activePlan = PLANS.find((p) => p.id === selectedPlan) || PLANS[1];

  const handleCopyBkash = () => {
    navigator.clipboard.writeText(BKASH_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTrxId = trxId.trim().toUpperCase();

    if (!user) {
      router.push('/auth?redirect=/boss');
      return;
    }

    if (!trimmedTrxId) {
      setSubmitError('Please enter your bKash Transaction ID');
      return;
    }

    if (!/^[A-Za-z0-9]{5,20}$/.test(trimmedTrxId)) {
      setSubmitError('Invalid Transaction ID format. It should be 5-20 alphanumeric characters.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const db = getFirestore();
      const docRef = await addDoc(collection(db, 'boss_requests'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userEmail: user.email,
        planId: activePlan.id,
        planName: activePlan.name,
        amount: activePlan.priceBdt,
        durationDays: activePlan.durationDays,
        transactionId: trimmedTrxId,
        bkashNumber: BKASH_NUMBER,
        status: 'pending',
        createdAt: new Date(),
        processedAt: null,
        processedBy: null,
      });

      // Dispatch admin alert email in background
      try {
        fetch('/api/boss/send-request-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailData: {
              requestId: docRef.id,
              userName: user.displayName || user.email?.split('@')[0] || 'User',
              userEmail: user.email,
              planId: activePlan.id,
              planName: activePlan.name,
              amount: activePlan.priceBdt,
              durationDays: activePlan.durationDays,
              transactionId: trimmedTrxId,
              bkashNumber: BKASH_NUMBER,
              createdAt: new Date().toISOString(),
            },
          }),
        }).catch((err) => console.error('Failed to notify admin via email:', err));
      } catch {}

      setSubmitSuccess({
        requestId: docRef.id,
        planName: activePlan.name,
        amount: activePlan.priceBdt,
        durationDays: activePlan.durationDays,
        trxId: trimmedTrxId,
      });
      setTrxId('');
    } catch (err: any) {
      console.error('Boss request submission failed:', err);
      setSubmitError(err.message || 'Failed to submit Boss request. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090E17] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Background Gradients & Ambient Glow */}
      <div className="relative overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-20 md:pt-32 md:pb-24 border-b border-gray-200 dark:border-gray-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800c_1px,transparent_1px),linear-gradient(to_bottom,#8080800c_1px,transparent_1px)] bg-[size:24px_24px] sm:bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[320px] sm:h-[450px] bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4 sm:mb-6 animate-fade-in-up">
            <BossBadge size="xs" interactive={false} />
            <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300">
              Upgrade from Bro to Boss
            </span>
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight sm:leading-none">
            Stop Trading Blind. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
              Trade Like a Boss.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 sm:mb-8">
            Every user is by default a <strong className="text-blue-600 dark:text-blue-400 font-bold">Bro</strong> with 100% free lifetime DSE trading.
            Upgrade to <strong className="text-amber-600 dark:text-amber-400 font-bold">Boss</strong> to unlock institutional-grade portfolio insights,
            official PDF statements, unlimited trade audits, and +10% coin bonuses.
          </p>

          {/* Current User Tier Indicator */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 shadow-sm text-xs font-medium">
            <span className="text-gray-500 dark:text-gray-400">
              Your Current Status:
            </span>
            {isBoss ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                <Crown className="w-3.5 h-3.5 fill-current" /> Boss Tier Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold">
                <Shield className="w-3 h-3" /> Bro Tier (Free)
              </span>
            )}
            <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Paper Trading Always 100% Free
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Cards Section */}
      <section className="py-10 sm:py-16 md:py-24 max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Affordable, Transparent Pricing
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            No auto-renewals. No surprise charges. Pay once with bKash and enjoy uninterrupted Boss access.
          </p>
        </div>

        {/* Mobile Plan Selector Segmented Control */}
        <div className="flex md:hidden items-center justify-center p-1 rounded-2xl bg-gray-200/70 dark:bg-gray-800/80 mb-6 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              selectedPlan === 'monthly'
                ? 'bg-white dark:bg-[#111620] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            31 Days (৳20)
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan('semester')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              selectedPlan === 'semester'
                ? 'bg-amber-500 text-gray-950 shadow-sm font-black'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Sparkles className="w-3 h-3 fill-current" />
            <span>6 Mo (৳99)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8 items-stretch">
          {/* Bro Plan (Free Forever) */}
          <div className="bg-white dark:bg-[#111620] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 lg:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  Bro Plan
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Free Forever
                </span>
              </div>
              <div className="mb-4">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">
                  ৳0
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Default lifetime access for all
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Everything you need to master Dhaka Stock Exchange trading mechanics without risking real money.
              </p>

              <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Real-time DSE Market Board (400+ stocks)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Buy/Sell Orders & T+1 Settlement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>৳100,000 Demo Cash + 10k Welcome Bonus</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>90-Day Daily Candlestick Charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic Holdings Table & Last 10 Trades</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
                  <X className="w-4 h-4 text-gray-300 dark:text-gray-700 shrink-0" />
                  <span>Portfolio Insights & Risk Radar</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
                  <X className="w-4 h-4 text-gray-300 dark:text-gray-700 shrink-0" />
                  <span>Official PDF Statement Download</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <Link
                href="/trade"
                className="w-full block text-center py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-xs transition-colors"
              >
                Trade as Bro (Current Tier)
              </Link>
            </div>
          </div>

          {/* Monthly Boss (৳20) */}
          <div
            onClick={() => setSelectedPlan('monthly')}
            className={`cursor-pointer bg-white dark:bg-[#111620] border-2 rounded-3xl p-5 sm:p-7 lg:p-8 flex flex-col justify-between shadow-sm transition-all duration-200 relative ${
              selectedPlan === 'monthly'
                ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/10'
                : 'border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Monthly Boss
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  31 Days
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">
                    ৳20
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/ 31 days</span>
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  ৳0.65 / day (Less than a cup of cha)
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Test-drive institutional portfolio analytics and download your first verified statements.
              </p>

              <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold">Everything in Bro Tier, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Portfolio Insights (Realized P&L & Sectors)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Unlimited Lifetime Trade History</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Official PDF Portfolio Statement Generator</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>+10% Bonus Coins on Every Recharge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Golden BOSS Profile Badge</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <button
                type="button"
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  selectedPlan === 'monthly'
                    ? 'bg-amber-500 hover:bg-amber-600 text-gray-950 shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <span>Select 31 Days (৳20)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Semester Boss (৳99 / 6 Months - Highlighted) */}
          <div
            onClick={() => setSelectedPlan('semester')}
            className={`cursor-pointer bg-gradient-to-b from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-[#111620] dark:to-[#111620] border-2 rounded-3xl p-5 sm:p-7 lg:p-8 flex flex-col justify-between shadow-lg transition-all duration-200 relative transform md:-translate-y-2 lg:-translate-y-3 ${
              selectedPlan === 'semester'
                ? 'border-amber-500 ring-4 ring-amber-500/25 shadow-amber-500/20'
                : 'border-amber-400/60 dark:border-amber-600/60 hover:border-amber-500'
            }`}
          >
            {/* Top Ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>Most Popular • Save 18%</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-[11px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-amber-500 text-gray-950 flex items-center gap-1 shadow-sm">
                  <Crown className="w-3 h-3 fill-current" /> Semester Boss
                </span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                  185 Days (6 Mo)
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">
                    ৳99
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/ 6 months</span>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  Just ৳16.50 / month (৳0.53 / day)
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                The ultimate companion for the full university semester or market cycle. Maximum savings & zero hassle.
              </p>

              <div className="space-y-3 text-xs text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                  <Crown className="w-4 h-4 text-amber-500 shrink-0 fill-current" />
                  <span>All Boss Features for 6 Full Months</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span>Unlimited 1-Click PDF Portfolio Statements</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span>Full Portfolio Risk Radar & Sector Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span>Unlimited Order History & Trade Audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span>+10% Extra Coins on EVERY bKash Recharge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span>Golden BOSS Crown Profile Badge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-black" />
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Save ৳21 vs renewing monthly</span>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <button
                type="button"
                className="w-full py-3.5 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 shadow-lg shadow-amber-500/25 hover:brightness-105 active:scale-98"
              >
                <span>Activate Semester Boss (৳99)</span>
                <Flame className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase: The 4 Signature Boss Features */}
      <section className="py-12 sm:py-20 bg-white dark:bg-[#0c111c] border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Exclusive Privileges
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Four Superpowers That Make You a Boss
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
              Designed specifically to turn casual paper traders into analytical, disciplined investors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {/* Feature 1: Official Portfolio PDF */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#131926] border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:border-amber-500/50 transition-colors flex flex-col justify-between">
              <div>
                <BossBadge corner size="xs" />
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  1. Official Portfolio Statement (PDF)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Export an executive-ready statement of your portfolio holdings in 1 click. Includes your entry prices, current DSE LTP, total valuation, daily and overall P&L, sector allocation, and timestamped verification.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 truncate">
                  <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate">DSE_Summary.pdf</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                  Vector 300 DPI
                </span>
              </div>
            </div>

            {/* Feature 2: Portfolio Insights & Sector Radar */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#131926] border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:border-amber-500/50 transition-colors flex flex-col justify-between">
              <div>
                <BossBadge corner size="xs" />
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <PieChart className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  2. Insights & Sector Radar (Feature A)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Never put all your eggs in one basket. See your precise asset distribution across all 21 DSE sectors, category breakdown (A, B, N, Z), and automated warnings when a single stock exceeds 40% of your net worth.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 truncate">
                  <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>21 DSE Sectors</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                  Live Radar
                </span>
              </div>
            </div>

            {/* Feature 3: Unlimited Lifetime Order History */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#131926] border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:border-amber-500/50 transition-colors flex flex-col justify-between">
              <div>
                <BossBadge corner size="xs" />
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  3. Lifetime Order Audit (Feature B)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  While Bro accounts are limited to their last 10 transactions, Boss accounts keep an everlasting trade ledger. Audit past buy and sell executions, average price fills, and exact timestamps across months of trading.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                  Bro: Last 10
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                  Boss: Unlimited
                </span>
              </div>
            </div>

            {/* Feature 4: +10% Recharge Coin Bonus */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-[#131926] border border-gray-200 dark:border-gray-800 relative overflow-hidden group hover:border-amber-500/50 transition-colors flex flex-col justify-between">
              <div>
                <BossBadge corner size="xs" />
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  4. +10% Coin Bonus (Feature C)
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Need more virtual capital to test high-value trades? Every time you recharge funds via bKash, you instantly get 10% extra coins added directly to your simulator balance automatically.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs font-mono">
                <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                  ৳100 = 50k
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  Boss = 55k (+10%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPLETE FEATURE AUDIT: BRO VS BOSS SECTION */}
      <section className="py-12 sm:py-20 md:py-28 max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Full Transparency
          </div>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Complete Feature Audit: Bro vs. Boss
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            A comprehensive mapping of every single feature across both tiers. No hidden fine print.
          </p>

          {/* Table Filter Toggle */}
          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 mt-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuditFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                auditFilter === 'all'
                  ? 'bg-white dark:bg-[#141A24] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              All Features (14)
            </button>
            <button
              type="button"
              onClick={() => setAuditFilter('boss_only')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                auditFilter === 'boss_only'
                  ? 'bg-amber-500 text-gray-950 font-black shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Crown className="w-3 h-3 fill-current" />
              <span>Boss Exclusives Only</span>
            </button>
          </div>
        </div>

        {/* ── DESKTOP & TABLET COMPARISON TABLE (Hidden on Small Phones) ── */}
        <div className="hidden md:block bg-white dark:bg-[#111620] border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-gray-50 dark:bg-[#161c28] border-b border-gray-200 dark:border-gray-800 px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <div className="col-span-6 lg:col-span-7">Platform Capability & Feature</div>
            <div className="col-span-3 lg:col-span-2 text-center text-blue-600 dark:text-blue-400">
              Bro (Free Tier)
            </div>
            <div className="col-span-3 lg:col-span-3 text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
              <Crown className="w-3.5 h-3.5 fill-current" /> Boss (Pro Tier)
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {COMPLETE_AUDIT_DATA.map((section, sIdx) => {
              const visibleFeatures = auditFilter === 'boss_only'
                ? section.features.filter((f) => f.isBossExclusive)
                : section.features;

              if (visibleFeatures.length === 0) return null;

              return (
                <div key={sIdx}>
                  {/* Category Header Row */}
                  <div className="px-6 py-3 bg-gray-100/70 dark:bg-[#141a24] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-300">
                        {section.category}
                      </span>
                      <span className="hidden lg:inline text-[11px] text-gray-400 ml-3">
                        {section.description}
                      </span>
                    </div>
                  </div>

                  {visibleFeatures.map((item, fIdx) => (
                    <div
                      key={fIdx}
                      className="grid grid-cols-12 px-6 py-4 items-center hover:bg-gray-50/70 dark:hover:bg-[#151c27] transition-colors"
                    >
                      <div className="col-span-6 lg:col-span-7 pr-4">
                        <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white">
                          <span>{item.name}</span>
                          {item.isBossExclusive && <BossBadge size="xs" />}
                          {item.tag && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono font-semibold">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      {/* Bro Column */}
                      <div className="col-span-3 lg:col-span-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {typeof item.bro === 'boolean' ? (
                          item.bro ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                              <span>Included</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                              <X className="w-3.5 h-3.5 text-gray-400" />
                              <span>Locked</span>
                            </div>
                          )
                        ) : (
                          item.bro
                        )}
                      </div>

                      {/* Boss Column */}
                      <div className="col-span-3 lg:col-span-3 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                        {typeof item.boss === 'boolean' ? (
                          item.boss ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                              <Check className="w-3.5 h-3.5 text-amber-500" />
                              <span>Included</span>
                            </div>
                          ) : (
                            <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-extrabold border border-amber-500/20">
                            {item.boss}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MOBILE AUDIT CARDS (Touch & Phone Friendly) ── */}
        <div className="block md:hidden space-y-4">
          {COMPLETE_AUDIT_DATA.map((section, sIdx) => {
            const visibleFeatures = auditFilter === 'boss_only'
              ? section.features.filter((f) => f.isBossExclusive)
              : section.features;

            if (visibleFeatures.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-2.5">
                <div className="px-1 py-1 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {section.category}
                </div>

                {visibleFeatures.map((item, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111620] border border-gray-200 dark:border-gray-800 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{item.name}</span>
                        {item.isBossExclusive && <BossBadge size="xs" />}
                        {item.tag && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mb-3">
                      {item.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                      {/* Bro column on mobile */}
                      <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                          Bro (Free)
                        </div>
                        <div className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          {typeof item.bro === 'boolean' ? (
                            item.bro ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Included</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-400">Locked</span>
                              </>
                            )
                          ) : (
                            <span>{item.bro}</span>
                          )}
                        </div>
                      </div>

                      {/* Boss column on mobile */}
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold mb-0.5 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5 fill-current" /> Boss (Pro)
                        </div>
                        <div className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          {typeof item.boss === 'boolean' ? (
                            item.boss ? (
                              <>
                                <Check className="w-3 h-3 text-amber-500" />
                                <span>Included</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-gray-400" />
                                <span>Locked</span>
                              </>
                            )
                          ) : (
                            <span>{item.boss}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment Instructions Section */}
      <section className="py-12 sm:py-20 bg-slate-100/70 dark:bg-[#0c1017] border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
              Quick & Easy Local Payment
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
              How to Activate Boss Access
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
              Send the selected amount via bKash Personal and provide your Transaction ID below.
            </p>
          </div>

          <div className="bg-white dark:bg-[#131822] border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-sm">
            {/* Step 1: Select Plan */}
            <div className="mb-6">
              <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                1. Selected Membership Plan
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-amber-500 bg-amber-500/10 text-gray-900 dark:text-white ring-2 ring-amber-500/20'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{plan.name}</div>
                    <div className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400">
                      ৳{plan.priceBdt}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {plan.durationLabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: bKash Send Money */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-pink-50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-pink-700 dark:text-pink-300 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  2. Send Money via bKash Personal
                </span>
                <span className="text-xs font-mono font-bold text-pink-600 dark:text-pink-400">
                  Amount: ৳{activePlan.priceBdt}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-[#1a2130] p-3 sm:p-4 rounded-xl border border-pink-200 dark:border-pink-800/40 gap-3">
                <div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase">
                    bKash Personal Number
                  </div>
                  <div className="font-mono font-black text-lg sm:text-xl text-gray-900 dark:text-white tracking-wider">
                    {BKASH_NUMBER}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBkash}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-all active:scale-95"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Number Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-pink-700/80 dark:text-pink-300/80 mt-2.5 leading-relaxed">
                Open bKash App → Tap <strong>Send Money</strong> → Enter <strong>{BKASH_NUMBER}</strong> → Amount <strong>৳{activePlan.priceBdt}</strong> → Reference: <code>BOSS</code>.
              </p>
            </div>

            {/* Step 3: Transaction ID Entry */}
            {!user ? (
              <div className="text-center p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2 fill-current" />
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                  Sign In Required to Upgrade
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 max-w-md mx-auto">
                  Please sign in or create an account so we can link your Boss subscription to your profile.
                </p>
                <Link
                  href="/auth?redirect=/boss"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 font-black text-xs shadow-md transition-all active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Continue</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    3. Enter bKash Transaction ID (TrxID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => {
                        setTrxId(e.target.value.toUpperCase());
                        if (submitError) setSubmitError('');
                      }}
                      placeholder="e.g. BL95K87J9"
                      maxLength={20}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-700 text-base font-mono tracking-wider uppercase text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    You will find this 10-character alphanumeric code in your bKash confirmation SMS or statement.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Boss Upgrade Request Submitted!</span>
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-400 leading-relaxed">
                      Thank you! Your request for <strong>{submitSuccess.planName}</strong> (৳{submitSuccess.amount}) with TrxID <code>{submitSuccess.trxId}</code> has been received.
                      Our admin has been notified via email and will approve your transaction shortly.
                    </p>
                    <div className="pt-2 flex items-center gap-3 border-t border-emerald-200 dark:border-emerald-800/60 font-medium">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        Request ID: <code>{submitSuccess.requestId}</code>
                      </span>
                      <Link
                        href="/coins"
                        className="ml-auto text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        View Coins & Funds →
                      </Link>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !trxId.trim()}
                  className="w-full py-3.5 sm:py-4 px-6 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-gray-950 shadow-md hover:brightness-105 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request…</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 fill-current" />
                      <span>Submit {activePlan.name} Request (৳{activePlan.priceBdt})</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-12 sm:py-20 md:py-24 max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            <ShieldCheck className="w-4 h-4" /> Clear Answers
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111620] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-amber-500' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-6 pb-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-t border-gray-200 dark:border-gray-800 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <BossBadge size="md" interactive={false} className="mb-3" />
          <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mb-2">
            Ready to upgrade your Dhaka trading game?
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6">
            Join the serious traders using StockSimulatorBD Boss today for just ৳20.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.scrollTo({ top: 450, behavior: 'smooth' })}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              Choose a Plan
            </button>
            <Link
              href="/trade"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs transition-all text-center"
            >
              Keep Trading as Bro
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
