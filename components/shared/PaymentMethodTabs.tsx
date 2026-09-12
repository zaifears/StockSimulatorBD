'use client';

// components/shared/PaymentMethodTabs.tsx
// High-conversion, interactive 3-tab payment instructions for bKash, Other MFS, and Bank Transfers.
// Used across /coins and /boss#payment.

import React, { useState } from 'react';
import {
  Copy, Check, Send, CreditCard, Building2, Smartphone, AlertTriangle, ArrowRight
} from 'lucide-react';

export type PaymentTabId = 'bkash_send' | 'bkash_pay' | 'other';

export interface PaymentMethodTabsProps {
  amount: number;
  referenceCode?: string;
  activeTab: PaymentTabId;
  onTabChange: (tab: PaymentTabId, methodLabel: string) => void;
  className?: string;
}

export const PAYMENT_DETAILS = {
  bkashSendMoney: {
    number: '01865333143',
    type: 'Personal (Send Money)',
    tabLabel: 'bKash Send Money',
    badge: 'Primary Method',
  },
  bkashPayment: {
    number: '01581401895',
    type: 'Merchant / Make Payment',
    tabLabel: 'bKash Payment',
    badge: 'Secondary Method',
  },
  otherMfs: {
    number: '01865333143',
    channels: ['Cellfin', 'Nagad', 'Rocket'],
    tabLabel: 'Other MFS',
  },
  bank: {
    title: 'MD AL SHAHORIAR HOSSAIN',
    bankName: 'Standard Chartered Bank PLC',
    accountNumber: '18246161201',
    branch: 'Motijheel',
    mode: 'NPSB (Instant)',
    note: 'If you use BEFTN, transaction confirmation could take upto 1 working day. NPSB is recommended for instant confirmation.',
  }
};

export default function PaymentMethodTabs({
  amount,
  referenceCode = 'RECHARGE',
  activeTab,
  onTabChange,
  className = '',
}: PaymentMethodTabsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mfsSubTab, setMfsSubTab] = useState<'mfs' | 'bank'>('mfs');

  const formattedAmount = `${amount.toFixed(2)} BDT`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 3 Main Tabs Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-[#111620] rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Tab 1: bKash Send Money */}
        <button
          type="button"
          onClick={() => onTabChange('bkash_send', 'bKash Send Money')}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            activeTab === 'bkash_send'
              ? 'bg-white dark:bg-[#1B2230] text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-900/60 ring-2 ring-pink-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Send className="w-4 h-4 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm">bKash Send Money</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
            Primary Method
          </span>
        </button>

        {/* Tab 2: bKash Payment */}
        <button
          type="button"
          onClick={() => onTabChange('bkash_pay', 'bKash Payment')}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            activeTab === 'bkash_pay'
              ? 'bg-white dark:bg-[#1B2230] text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-900/60 ring-2 ring-pink-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm">bKash Payment</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            Secondary Method
          </span>
        </button>

        {/* Tab 3: Other Payment (Bank, Other MFS) */}
        <button
          type="button"
          onClick={() => onTabChange('other', mfsSubTab === 'bank' ? 'Bank Transfer (Standard Chartered)' : 'Other MFS (Nagad/Rocket/Cellfin)')}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            activeTab === 'other'
              ? 'bg-white dark:bg-[#1B2230] text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-900/60 ring-2 ring-blue-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm">Other Payment</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            Bank & Other MFS
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: bKash Send Money (Primary Method) */}
      {/* ========================================================================= */}
      {activeTab === 'bkash_send' && (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-[#D12053]/30 bg-gradient-to-br from-[#D12053] to-[#B01040] text-white">
          {/* Header strip */}
          <div className="px-5 py-3.5 bg-black/15 flex items-center justify-between border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase">bKash Send Money (Personal)</span>
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              Primary Method
            </span>
          </div>

          {/* Visual Step Illustration (Connected Directional Timeline - Non-selectable) */}
          <div className="mx-4 sm:mx-5 my-3.5 p-3 sm:p-3.5 rounded-xl bg-black/25 border border-white/10">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/80 mb-2.5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                Transfer Roadmap (Follow in order)
              </span>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono">3 Steps</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Open bKash</div>
                  <div className="text-[10px] text-white/75 truncate font-mono">App or *247#</div>
                </div>
              </div>

              <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-white/40 shrink-0" />

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  2
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Send Money</div>
                  <div className="text-[10px] text-white/75 truncate font-mono">01865333143</div>
                </div>
              </div>

              <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-white/40 shrink-0" />

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  3
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Submit TrxID</div>
                  <div className="text-[10px] text-white/75 truncate">Instant Verification</div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps container matching the exact clean layout from user's screenshot */}
          <div className="divide-y divide-white/15 px-5 py-2">
            {/* Step 1 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Go to your <strong>bKash Mobile App</strong> or Dial <code className="bg-black/25 px-1.5 py-0.5 rounded font-mono font-bold">*247#</code>
              </span>
            </div>

            {/* Step 2 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Choose <strong>&ldquo;Send Money&rdquo;</strong>
              </span>
            </div>

            {/* Step 3: Copyable Number */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Enter the Number: <strong className="font-mono text-base tracking-wider bg-black/20 px-2 py-0.5 rounded">{PAYMENT_DETAILS.bkashSendMoney.number}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(PAYMENT_DETAILS.bkashSendMoney.number, 'send_num')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                {copiedKey === 'send_num' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Number Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 4: Copyable Amount */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Enter the Amount: <strong className="font-mono text-base tracking-wider bg-black/20 px-2 py-0.5 rounded">{formattedAmount}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(amount.toFixed(2), 'send_amt')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                {copiedKey === 'send_amt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Amount Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Amount</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 5 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Now enter your <strong>bKash PIN</strong> to confirm.
              </span>
            </div>

            {/* Step 6 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Put the <strong>Transaction ID</strong> in the box below
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: bKash Payment (Secondary Method) */}
      {/* ========================================================================= */}
      {activeTab === 'bkash_pay' && (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-[#D12053]/30 bg-gradient-to-br from-[#C41A4E] to-[#990D37] text-white">
          {/* Header strip */}
          <div className="px-5 py-3.5 bg-black/15 flex items-center justify-between border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-white" />
              <span className="text-xs font-black tracking-wider uppercase">bKash Make Payment</span>
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              Secondary Method
            </span>
          </div>

          {/* Visual Step Illustration (Connected Directional Timeline - Non-selectable) */}
          <div className="mx-4 sm:mx-5 my-3.5 p-3 sm:p-3.5 rounded-xl bg-black/25 border border-white/10">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/80 mb-2.5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                Transfer Roadmap (Follow in order)
              </span>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono">3 Steps</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Open bKash</div>
                  <div className="text-[10px] text-white/75 truncate font-mono">App or *247#</div>
                </div>
              </div>

              <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-white/40 shrink-0" />

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  2
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Make Payment</div>
                  <div className="text-[10px] text-white/75 truncate font-mono">01581401895</div>
                </div>
              </div>

              <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-white/40 shrink-0" />

              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/30">
                  3
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Submit TrxID</div>
                  <div className="text-[10px] text-white/75 truncate">Instant Verification</div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps container */}
          <div className="divide-y divide-white/15 px-5 py-2">
            {/* Step 1 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Go to your <strong>bKash Mobile App</strong> or Dial <code className="bg-black/25 px-1.5 py-0.5 rounded font-mono font-bold">*247#</code>
              </span>
            </div>

            {/* Step 2 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Choose <strong>&ldquo;Make Payment&rdquo;</strong>
              </span>
            </div>

            {/* Step 3: Copyable Merchant Number */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Enter the Number: <strong className="font-mono text-base tracking-wider bg-black/20 px-2 py-0.5 rounded">{PAYMENT_DETAILS.bkashPayment.number}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(PAYMENT_DETAILS.bkashPayment.number, 'pay_num')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                {copiedKey === 'pay_num' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Number Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 4: Copyable Amount */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  Enter the Amount: <strong className="font-mono text-base tracking-wider bg-black/20 px-2 py-0.5 rounded">{formattedAmount}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(amount.toFixed(2), 'pay_amt')}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white active:scale-95 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                {copiedKey === 'pay_amt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Amount Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Amount</span>
                  </>
                )}
              </button>
            </div>

            {/* Step 5 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Now enter your <strong>bKash PIN</strong> to confirm.
              </span>
            </div>

            {/* Step 6 */}
            <div className="py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                Put the <strong>Transaction ID</strong> in the box below
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Other Payment (Bank, Other MFS) */}
      {/* ========================================================================= */}
      {activeTab === 'other' && (
        <div className="space-y-4">
          {/* Sub-selector: Other MFS vs Bank Account */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-[#161c28] rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setMfsSubTab('mfs');
                onTabChange('other', 'Other MFS (Nagad/Rocket/Cellfin)');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                mfsSubTab === 'mfs'
                  ? 'bg-white dark:bg-[#1f2737] text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cellfin, Nagad & Rocket</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMfsSubTab('bank');
                onTabChange('other', 'Bank Transfer');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                mfsSubTab === 'bank'
                  ? 'bg-white dark:bg-[#1f2737] text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Bank Transfer</span>
            </button>
          </div>

          {/* Sub-View 1: Other MFS (Cellfin, Nagad, Rocket) */}
          {mfsSubTab === 'mfs' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-[#161c28]">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-950/30 dark:via-[#161c28] border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-[9px] text-white font-black flex items-center justify-center shadow-xs">C</span>
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-[9px] text-white font-black flex items-center justify-center shadow-xs">N</span>
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-[9px] text-white font-black flex items-center justify-center shadow-xs">R</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      Cellfin, Nagad & Rocket (Personal Send Money)
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    Send Money / Transfer
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
                {/* Visual Step Illustration (Connected Directional Timeline - Non-selectable) */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-orange-500/10 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/30">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-orange-900 dark:text-orange-300 mb-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      Transfer Roadmap (Follow in order)
                    </span>
                    <span className="text-[10px] bg-orange-200/50 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full font-mono">
                      Personal MFS
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-800">
                        1
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Open MFS App</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Cellfin / Nagad / Rocket</div>
                      </div>
                    </div>

                    <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-orange-400/60 dark:text-orange-500/40 shrink-0" />

                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-800">
                        2
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Send Money</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-mono">To 01865333143</div>
                      </div>
                    </div>

                    <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-orange-400/60 dark:text-orange-500/40 shrink-0" />

                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-800">
                        3
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Paste TrxID Below</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Instant Verification</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Number Copy Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      Target Mobile Number (Nagad / Rocket / Cellfin)
                    </span>
                    <span className="font-mono text-xl font-black text-gray-900 dark:text-white tracking-widest mt-0.5 block">
                      {PAYMENT_DETAILS.otherMfs.number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(PAYMENT_DETAILS.otherMfs.number, 'mfs_num')}
                    className="inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white active:scale-95 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm"
                  >
                    {copiedKey === 'mfs_num' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Number</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Amount Copy Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      Required Amount
                    </span>
                    <span className="font-mono text-base font-black text-gray-900 dark:text-white mt-0.5 block">
                      {formattedAmount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(amount.toFixed(2), 'mfs_amt')}
                    className="inline-flex items-center justify-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 active:scale-95 px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
                  >
                    {copiedKey === 'mfs_amt' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Amount</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step List */}
                <ol className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Open your <strong>Cellfin</strong>, <strong>Nagad</strong>, or <strong>Rocket</strong> App.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Select <strong>Send Money</strong> or <strong>Fund Transfer</strong> to personal number <strong>{PAYMENT_DETAILS.otherMfs.number}</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Enter amount <strong>{formattedAmount}</strong> and confirm with your PIN.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Copy the <strong>Transaction ID</strong> from the confirmation message and paste it below.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Sub-View 2: Standard Chartered Bank Account Details */}
          {mfsSubTab === 'bank' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-[#161c28]">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/30 dark:via-[#161c28] border-b border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                        Standard Chartered Bank PLC
                      </h3>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Direct Bank Transfer (NPSB / BEFTN)</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Preferred Mode: NPSB (Instant)
                  </span>
                </div>
              </div>

              {/* Visual NPSB Transfer Route (Connected Directional Timeline - Non-selectable) */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/30 mx-4 sm:mx-5 mt-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    How to Transfer (Any Bank App ➔ Standard Chartered)
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    NPSB 24/7 Real-Time
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      1
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Open Your Bank App</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Citytouch, Astha, Cellfin...</div>
                    </div>
                  </div>

                  <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-blue-400/60 dark:text-blue-500/40 shrink-0" />

                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      2
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Transfer Mode</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">Select NPSB (Instant)</div>
                    </div>
                  </div>

                  <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-blue-400/60 dark:text-blue-500/40 shrink-0" />

                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                      3
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">Deposit to SCB</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-mono">A/C 18246161201</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details Grid — Each Detail is 100% Copyable */}
              <div className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* A/C Title */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">
                        Account Title
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs truncate block mt-0.5">
                        {PAYMENT_DETAILS.bank.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(PAYMENT_DETAILS.bank.title, 'bank_title')}
                      className="shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                      title="Copy Account Title"
                    >
                      {copiedKey === 'bank_title' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Account Number */}
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide block">
                        Account Number
                      </span>
                      <span className="font-mono font-black text-sm text-blue-900 dark:text-blue-200 tracking-wider truncate block mt-0.5">
                        {PAYMENT_DETAILS.bank.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(PAYMENT_DETAILS.bank.accountNumber, 'bank_acc')}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                      title="Copy Account Number"
                    >
                      {copiedKey === 'bank_acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{copiedKey === 'bank_acc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Bank Name */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">
                        Bank Name
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs truncate block mt-0.5">
                        {PAYMENT_DETAILS.bank.bankName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(PAYMENT_DETAILS.bank.bankName, 'bank_name')}
                      className="shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                      title="Copy Bank Name"
                    >
                      {copiedKey === 'bank_name' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Branch */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">
                        Branch
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs truncate block mt-0.5">
                        {PAYMENT_DETAILS.bank.branch}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(PAYMENT_DETAILS.bank.branch, 'bank_branch')}
                      className="shrink-0 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                      title="Copy Branch"
                    >
                      {copiedKey === 'bank_branch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Amount to Transfer */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#111620] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">
                      Transfer Amount
                    </span>
                    <span className="font-mono font-black text-sm text-gray-900 dark:text-white block mt-0.5">
                      {formattedAmount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(amount.toFixed(2), 'bank_amt')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all active:scale-95"
                  >
                    {copiedKey === 'bank_amt' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Amount</span>
                      </>
                    )}
                  </button>
                </div>

                {/* BEFTN / NPSB Warning Alert */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-extrabold">Note:</strong> {PAYMENT_DETAILS.bank.note}
                  </div>
                </div>

                {/* Bank Name in TrxID Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-blue-950 dark:text-blue-200 text-xs flex items-start gap-2.5">
                  <span className="text-base shrink-0">💡</span>
                  <div className="leading-relaxed">
                    <strong className="font-extrabold text-blue-900 dark:text-blue-100">Bank Transfer Steps:</strong> Simply select your sending bank from the searchable dropdown list below and enter your transfer reference code (e.g. <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-bold">FT24091234</code> or <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-bold">Ref#12345678</code>). You do not need to type the bank name in the reference box.
                  </div>
                </div>

                {/* Instruction note */}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed pt-1">
                  Use your bank app (Citytouch, EBL SKYBANKING, BRAC Astha, Islami Bank Cellfin, etc.) to initiate an <strong>NPSB Fund Transfer</strong> to Standard Chartered Bank. Then copy the Bank Reference / Transaction ID and submit it below.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
