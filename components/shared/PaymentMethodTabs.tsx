'use client';

// components/shared/PaymentMethodTabs.tsx
// High-conversion, interactive payment instructions supporting:
// 1. BanglaQR (Primary / Recommended - Interoperable QR for all Banks & MFS)
// 2. bKash (Secondary - Payment Merchant & Personal Send Money with QR codes)
// 3. Other Payment (Cellfin, Nagad, Rocket & Standard Chartered Bank NPSB)
// Used across /boss#payment and /coins.

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Copy,
  Check,
  Send,
  CreditCard,
  Building2,
  Smartphone,
  AlertTriangle,
  ArrowRight,
  QrCode,
  Maximize2,
  X,
  ShieldCheck,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';

export type PaymentTabId = 'banglaqr' | 'bkash' | 'other' | 'bkash_send' | 'bkash_pay';
export type BkashSubTabId = 'payment' | 'personal';
export type OtherSubTabId = 'mfs' | 'bank';

export interface PaymentMethodTabsProps {
  amount: number;
  referenceCode?: string;
  activeTab: PaymentTabId;
  onTabChange: (tab: PaymentTabId, methodLabel: string) => void;
  className?: string;
  variant?: 'boss' | 'coins';
}

export const PAYMENT_DETAILS = {
  banglaqr: {
    tabLabel: 'BanglaQR',
    badge: 'Primary / Recommended',
    imagePath: '/payment/banglaqr.png',
  },
  bkashPayment: {
    number: '01581401895',
    type: 'Merchant / Make Payment',
    tabLabel: 'bKash Make Payment',
    badge: 'Merchant Counter',
    imagePath: '/payment/bkash-payment.png',
  },
  bkashSendMoney: {
    number: '01865333143',
    type: 'Personal (Send Money)',
    tabLabel: 'bKash Send Money',
    badge: 'Personal Number',
    imagePath: '',
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
    note: 'If you use BEFTN, transaction confirmation could take up to 1 working day. NPSB is recommended for instant confirmation.',
  },
};

// Fallback stylized QR Graphic when local PNG is pending upload
function StylizedQrFallback({
  title,
  subText,
  brandColor = 'emerald',
}: {
  title: string;
  subText: string;
  brandColor?: 'emerald' | 'pink';
}) {
  const isPink = brandColor === 'pink';

  return (
    <div
      className={`w-52 sm:w-60 aspect-[800/1060] mx-auto rounded-2xl p-4 flex flex-col items-center justify-between border-2 border-dashed shadow-inner text-center select-none ${
        isPink
          ? 'bg-gradient-to-b from-pink-50 to-rose-100/60 dark:from-pink-950/40 dark:to-[#1a1016] border-pink-300 dark:border-pink-800'
          : 'bg-gradient-to-b from-emerald-50 to-teal-100/60 dark:from-emerald-950/40 dark:to-[#0c1815] border-emerald-300 dark:border-emerald-800'
      }`}
    >
      <div className="flex items-center justify-between w-full text-[10px] font-mono uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
        <span>Scan & Pay</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
            isPink
              ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300'
              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {isPink ? 'bKash' : 'BanglaQR'}
        </span>
      </div>

      <div className="relative my-auto flex flex-col items-center justify-center">
        <div
          className={`w-28 h-28 rounded-2xl flex items-center justify-center border-2 shadow-sm ${
            isPink
              ? 'bg-white dark:bg-black/40 border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400'
              : 'bg-white dark:bg-black/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <QrCode className="w-16 h-16 animate-pulse" />
        </div>
        <div
          className={`mt-2 text-[10px] font-black uppercase tracking-wider ${
            isPink ? 'text-pink-700 dark:text-pink-300' : 'text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {title}
        </div>
      </div>

      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-tight">
        {subText}
      </div>
    </div>
  );
}

interface ZoomModalState {
  src: string;
  title: string;
  variant: 'qr' | 'banner';
  brand?: 'banglaqr' | 'bkash';
  caption?: string;
}

export default function PaymentMethodTabs({
  amount,
  referenceCode = 'BOSS',
  activeTab,
  onTabChange,
  className = '',
  variant = 'boss',
}: PaymentMethodTabsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bkashSubTab, setBkashSubTab] = useState<BkashSubTabId>('payment');
  const [mfsSubTab, setMfsSubTab] = useState<OtherSubTabId>('mfs');
  const [imageErrorMap, setImageErrorMap] = useState<{ [src: string]: boolean }>({});
  const [activeZoomModal, setActiveZoomModal] = useState<ZoomModalState | null>(null);

  const formattedAmount = `${amount.toFixed(2)} BDT`;

  // Normalizes effective tab
  const normalizedTab: 'banglaqr' | 'bkash' | 'other' =
    activeTab === 'banglaqr'
      ? 'banglaqr'
      : activeTab === 'bkash' || activeTab === 'bkash_pay' || activeTab === 'bkash_send'
      ? 'bkash'
      : 'other';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleImageError = (src: string) => {
    setImageErrorMap((prev) => ({ ...prev, [src]: true }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 3 Main Tabs Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-[#111620] rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Tab 1: BanglaQR (Primary / Recommended) */}
        <button
          type="button"
          onClick={() => onTabChange('banglaqr', 'BanglaQR')}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            normalizedTab === 'banglaqr'
              ? 'bg-white dark:bg-[#1B2230] text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-900/60 ring-2 ring-emerald-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-black text-xs sm:text-sm">BanglaQR</span>
          </div>
          <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black leading-none mt-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Primary Method
          </span>
        </button>

        {/* Tab 2: bKash (Secondary - Payment & Personal) */}
        <button
          type="button"
          onClick={() => {
            onTabChange(
              'bkash',
              bkashSubTab === 'payment'
                ? 'bKash Make Payment (Merchant)'
                : 'bKash Send Money (Personal)'
            );
          }}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            normalizedTab === 'bkash'
              ? 'bg-white dark:bg-[#1B2230] text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-900/60 ring-2 ring-pink-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Send className="w-4 h-4 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm">bKash</span>
          </div>
          <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none mt-1 bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
            Payment & Personal
          </span>
        </button>

        {/* Tab 3: Other Payment (Bank, Other MFS) */}
        <button
          type="button"
          onClick={() => {
            onTabChange(
              'other',
              mfsSubTab === 'bank'
                ? 'Bank Transfer (Standard Chartered)'
                : 'Other MFS (Nagad/Rocket/Cellfin)'
            );
          }}
          className={`flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all relative ${
            normalizedTab === 'other'
              ? 'bg-white dark:bg-[#1B2230] text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-900/60 ring-2 ring-blue-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm">Other Payment</span>
          </div>
          <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold leading-none mt-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            Bank & Other MFS
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BanglaQR (Primary Method - All Banks & MFS)                         */}
      {/* ========================================================================= */}
      {normalizedTab === 'banglaqr' && (
        <div className="rounded-2xl overflow-hidden shadow-sm border border-emerald-500/30 bg-gradient-to-br from-[#0c4a34] via-[#064e3b] to-[#043d2e] text-white">
          {/* Header Strip */}
          <div className="px-4 sm:px-6 py-3.5 bg-black/20 flex items-center justify-between border-b border-white/10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase">
                BanglaQR
              </span>
            </div>
            <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black leading-none bg-emerald-400 text-gray-950">
              Primary • Scan With Any App
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* QR Code Presentation Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101915] text-gray-900 dark:text-gray-100 border border-emerald-300 dark:border-emerald-700/50 shadow-md flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6">
              {/* QR Image Container (Responsive, Crisp & Zoomable) */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative p-2.5 bg-white rounded-2xl border-2 border-emerald-500 shadow-md">
                  {imageErrorMap['/payment/banglaqr.png'] ? (
                    <StylizedQrFallback
                      title="BanglaQR Code"
                      subText="Scan with any MFS or Banking App"
                      brandColor="emerald"
                    />
                  ) : (
                    <div
                      onClick={() =>
                        setActiveZoomModal({
                          src: '/payment/banglaqr.png',
                          title: 'BanglaQR - Scan to Pay',
                          variant: 'qr',
                          brand: 'banglaqr',
                          caption: 'Point your phone camera or bank app QR scanner at this code.',
                        })
                      }
                      className="relative w-52 sm:w-60 aspect-[800/1060] overflow-hidden rounded-xl bg-white flex items-center justify-center cursor-pointer group"
                      title="Click to enlarge"
                    >
                      <Image
                        src="/payment/banglaqr.png"
                        alt="BanglaQR Code - StockSimulatorBD"
                        width={800}
                        height={1060}
                        priority
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                        onError={() => handleImageError('/payment/banglaqr.png')}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveZoomModal({
                        src: '/payment/banglaqr.png',
                        title: 'BanglaQR - Scan to Pay',
                        variant: 'qr',
                        brand: 'banglaqr',
                        caption: 'Point your phone camera or bank app QR scanner at this code.',
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>View / Enlarge QR</span>
                  </button>
                  <a
                    href="/payment/banglaqr.png"
                    download="StockSimulatorBD_BanglaQR.png"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:underline bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <span>Download</span>
                  </a>
                </div>
              </div>

              {/* Instructions beside QR */}
              <div className="flex-1 space-y-3 text-xs w-full min-w-0">
                {/* Fixed Uncrooked Amount Row with Copy Button */}
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">
                      Exact Amount to Pay
                    </span>
                    <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 whitespace-nowrap">
                      {formattedAmount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(amount.toFixed(2), 'bqr_amt')}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedKey === 'bqr_amt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'bqr_amt' ? 'Copied' : 'Copy Amount'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Scan this BanglaQR with <strong>any Bank or MFS app</strong> (bKash, Nagad, Cellfin, Citytouch, Astha, etc.). Enter your Phone / WhatsApp number below after completing payment.
                  </div>
                </div>

                {/* Important Alert Notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>WhatsApp Communication:</strong> Providing your active mobile number below is required for BanglaQR payments so our team can reach out on WhatsApp if verification is needed.
                  </div>
                </div>

                {/* Accepted Apps Banner Image */}
                {!imageErrorMap['/payment/banglaqr-app.png'] && (
                  <div
                    onClick={() =>
                      setActiveZoomModal({
                        src: '/payment/banglaqr-app.png',
                        title: 'Supported Banking & MFS Apps for BanglaQR',
                        variant: 'banner',
                        caption: 'All of these 20+ Bank and MFS apps support BanglaQR scanning.',
                      })
                    }
                    className="relative w-full overflow-hidden rounded-xl border border-red-500/30 shadow-md group cursor-pointer hover:border-red-400 transition-all active:scale-[0.99] bg-[#be1e2d]"
                  >
                    <Image
                      src="/payment/banglaqr-app.png"
                      alt="Supported Banking & MFS Apps for BanglaQR"
                      width={1000}
                      height={420}
                      priority
                      className="w-full h-auto object-contain rounded-xl"
                      onError={() => handleImageError('/payment/banglaqr-app.png')}
                    />
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Maximize2 className="w-2.5 h-2.5" />
                      <span>Tap to zoom</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: bKash (Secondary Method - Payment & Personal Sub-Tabs)             */}
      {/* ========================================================================= */}
      {normalizedTab === 'bkash' && (
        <div className="space-y-3">
          {/* bKash Sub-Selector: Make Payment (Merchant) vs Send Money (Personal) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-[#161c28] rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setBkashSubTab('payment');
                onTabChange('bkash', 'bKash Make Payment (Merchant)');
              }}
              className={`w-full flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                bkashSubTab === 'payment'
                  ? 'bg-white dark:bg-[#1f2737] text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-900/60'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>1. Make Payment (Merchant QR)</span>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 font-black">
                Payment
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBkashSubTab('personal');
                onTabChange('bkash', 'bKash Send Money (Personal)');
              }}
              className={`w-full flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                bkashSubTab === 'personal'
                  ? 'bg-white dark:bg-[#1f2737] text-pink-600 dark:text-pink-400 shadow-sm border border-pink-200 dark:border-pink-900/60'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 shrink-0" />
                <span>2. Send Money (Personal)</span>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 font-black">
                Personal
              </span>
            </button>
          </div>

          {/* Sub-View 1: bKash Make Payment */}
          {bkashSubTab === 'payment' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-[#D12053]/30 bg-gradient-to-br from-[#C41A4E] to-[#990D37] text-white">
              {/* Header strip */}
              <div className="px-4 sm:px-6 py-3.5 bg-black/15 flex items-center justify-between border-b border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-white" />
                  <span className="text-xs font-black tracking-wider uppercase">
                    bKash Make Payment (Merchant)
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black leading-none bg-white/20 backdrop-blur-sm">
                  TrxID Required
                </span>
              </div>

              {/* QR + Instruction Layout */}
              <div className="p-4 sm:p-5">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#151c27] text-gray-900 dark:text-gray-100 border border-pink-300 dark:border-pink-900/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 mb-4">
                  {/* QR Image Box */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative group p-2.5 bg-white rounded-2xl border-2 border-[#D12053] shadow-md">
                      {imageErrorMap['/payment/bkash-payment.png'] ? (
                        <StylizedQrFallback
                          title="bKash Merchant QR"
                          subText="Scan & Choose 'Make Payment'"
                          brandColor="pink"
                        />
                      ) : (
                        <div
                          onClick={() =>
                            setActiveZoomModal({
                              src: '/payment/bkash-payment.png',
                              title: 'bKash Merchant Payment QR',
                              variant: 'qr',
                              brand: 'bkash',
                              caption: 'Scan with bKash app from "Make Payment" to complete.',
                            })
                          }
                          className="relative w-52 sm:w-60 aspect-[800/1060] overflow-hidden rounded-xl bg-white flex items-center justify-center cursor-pointer group"
                          title="Click to enlarge"
                        >
                          <Image
                            src="/payment/bkash-payment.png"
                            alt="bKash Payment QR"
                            width={800}
                            height={1060}
                            priority
                            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                            onError={() => handleImageError('/payment/bkash-payment.png')}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveZoomModal({
                            src: '/payment/bkash-payment.png',
                            title: 'bKash Merchant Payment QR',
                            variant: 'qr',
                            brand: 'bkash',
                            caption: 'Scan with bKash app from "Make Payment" to complete.',
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-700 dark:text-pink-400 hover:underline bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-lg border border-pink-200 dark:border-pink-800"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>View / Enlarge QR</span>
                      </button>
                      <a
                        href="/payment/bkash-payment.png"
                        download="StockSimulatorBD_bKash_Payment.png"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:underline bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* Manual Copy Details */}
                  <div className="flex-1 space-y-3 w-full text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                          bKash Merchant Number
                        </span>
                        <span className="font-mono text-base font-black text-gray-900 dark:text-white block">
                          {PAYMENT_DETAILS.bkashPayment.number}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_DETAILS.bkashPayment.number, 'pay_num')}
                        className="px-3 py-1.5 rounded-lg bg-[#D12053] hover:bg-[#b01040] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                      >
                        {copiedKey === 'pay_num' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'pay_num' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                          Exact Amount to Pay
                        </span>
                        <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 block">
                          {formattedAmount}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(amount.toFixed(2), 'pay_amt')}
                        className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                      >
                        {copiedKey === 'pay_amt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'pay_amt' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <ol className="space-y-1.5 text-gray-600 dark:text-gray-300 text-[11px] pt-1">
                      <li>• Open bKash app or dial <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">*247#</code></li>
                      <li>• Select <strong>&ldquo;Make Payment&rdquo;</strong> (or scan the Merchant QR)</li>
                      <li>• Enter Merchant number <strong>{PAYMENT_DETAILS.bkashPayment.number}</strong> & amount <strong>{formattedAmount}</strong></li>
                      <li>• Put the <strong>Transaction ID (TrxID)</strong> in the box below (Mandatory)</li>
                      <li>• Optional: Add your WhatsApp number for faster communication</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-View 2: bKash Send Money (Personal - QR Hidden per user request) */}
          {bkashSubTab === 'personal' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-[#D12053]/30 bg-gradient-to-br from-[#D12053] to-[#B01040] text-white">
              {/* Header strip */}
              <div className="px-4 sm:px-6 py-3.5 bg-black/15 flex items-center justify-between border-b border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-white" />
                  <span className="text-xs font-black tracking-wider uppercase">
                    bKash Send Money (Personal)
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black leading-none bg-white/20 backdrop-blur-sm">
                  Personal Number • Direct Send
                </span>
              </div>

              {/* Clean No-QR Layout */}
              <div className="p-4 sm:p-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151c27] text-gray-900 dark:text-gray-100 border border-pink-300 dark:border-pink-900/40 shadow-sm space-y-4 mb-4">
                  {/* Notice Alert */}
                  <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/60 text-pink-900 dark:text-pink-200 text-xs flex items-start gap-2.5">
                    <Smartphone className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="font-bold">Personal Account Transfer:</strong> bKash does not provide QR codes for personal accounts anymore. Please use <strong>&ldquo;Send Money&rdquo;</strong> in your bKash app or dial <code className="bg-pink-100 dark:bg-pink-900/50 px-1 py-0.5 rounded font-mono font-bold">*247#</code> directly to our personal number below.
                    </div>
                  </div>

                  {/* Manual Copy Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                          bKash Personal Number
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-gray-900 dark:text-white block mt-0.5">
                          {PAYMENT_DETAILS.bkashSendMoney.number}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(PAYMENT_DETAILS.bkashSendMoney.number, 'send_num')}
                        className="px-3 py-2 rounded-lg bg-[#D12053] hover:bg-[#b01040] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                      >
                        {copiedKey === 'send_num' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedKey === 'send_num' ? 'Copied' : 'Copy Number'}</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#1a2130] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                          Exact Amount to Send
                        </span>
                        <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          {formattedAmount}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(amount.toFixed(2), 'send_amt')}
                        className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        {copiedKey === 'send_amt' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedKey === 'send_amt' ? 'Copied' : 'Copy Amount'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">
                      Step-by-Step Instructions:
                    </span>
                    <ol className="space-y-1.5 text-gray-700 dark:text-gray-300 text-xs">
                      <li>• Open your bKash app or dial <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">*247#</code></li>
                      <li>• Select <strong>&ldquo;Send Money&rdquo;</strong></li>
                      <li>• Enter Personal Number <strong>{PAYMENT_DETAILS.bkashSendMoney.number}</strong></li>
                      <li>• Enter Amount <strong>{formattedAmount}</strong></li>
                      <li>• Enter your bKash PIN to confirm transfer</li>
                      <li>• Copy the <strong>Transaction ID (TrxID)</strong> from confirmation SMS or app receipt</li>
                      <li>• Paste TrxID in the box below (Mandatory). Optional: add your WhatsApp number for ease.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Other Payment (Bank, Other MFS)                                    */}
      {/* ========================================================================= */}
      {normalizedTab === 'other' && (
        <div className="space-y-4">
          {/* Sub-selector: Other MFS vs Bank Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-[#161c28] rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                setMfsSubTab('mfs');
                onTabChange('other', 'Other MFS (Nagad/Rocket/Cellfin)');
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                mfsSubTab === 'mfs'
                  ? 'bg-white dark:bg-[#1f2737] text-orange-600 dark:text-orange-400 shadow-sm border border-orange-200 dark:border-orange-900/60'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Cellfin, Nagad & Rocket</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMfsSubTab('bank');
                onTabChange('other', 'Bank Transfer (Standard Chartered)');
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                mfsSubTab === 'bank'
                  ? 'bg-white dark:bg-[#1f2737] text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-900/60'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Bank Transfer (NPSB)</span>
            </button>
          </div>

          {/* Sub-View 1: Other MFS (Cellfin, Nagad, Rocket) */}
          {mfsSubTab === 'mfs' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-[#161c28]">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-950/30 dark:via-[#161c28] border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-[9px] text-white font-black flex items-center justify-center">C</span>
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-[9px] text-white font-black flex items-center justify-center">N</span>
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-[9px] text-white font-black flex items-center justify-center">R</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                      Cellfin, Nagad & Rocket (Send Money)
                    </h3>
                  </div>
                  <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold leading-none bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300">
                    Send Money / Transfer
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
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

                <ol className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Open your <strong>Cellfin</strong>, <strong>Nagad</strong>, or <strong>Rocket</strong> App.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Select <strong>Send Money</strong> or <strong>Fund Transfer</strong> to <strong>{PAYMENT_DETAILS.otherMfs.number}</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Enter amount <strong>{formattedAmount}</strong> and confirm with your PIN.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Copy the <strong>Transaction ID</strong> and paste it below.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Sub-View 2: Standard Chartered Bank Account Details */}
          {mfsSubTab === 'bank' && (
            <div className="rounded-2xl overflow-hidden shadow-sm border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-[#161c28]">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950/30 dark:via-[#161c28] border-b border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start sm:items-center justify-between flex-wrap gap-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                        Standard Chartered Bank PLC
                      </h3>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Direct Bank Transfer (NPSB / BEFTN)</span>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold leading-none bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Preferred Mode: NPSB (Instant)
                  </span>
                </div>
              </div>

              {/* Bank Details Grid */}
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
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                      title="Copy Account Title"
                    >
                      {copiedKey === 'bank_title' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{copiedKey === 'bank_title' ? 'Copied' : 'Copy'}</span>
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
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                      title="Copy Bank Name"
                    >
                      {copiedKey === 'bank_name' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{copiedKey === 'bank_name' ? 'Copied' : 'Copy'}</span>
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
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                      title="Copy Branch"
                    >
                      {copiedKey === 'bank_branch' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{copiedKey === 'bank_branch' ? 'Copied' : 'Copy'}</span>
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
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-extrabold">Note:</strong> {PAYMENT_DETAILS.bank.note}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Zoom Modal for QR Code and Apps Banner */}
      {activeZoomModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveZoomModal(null)}
        >
          <div
            className={`bg-white dark:bg-[#111620] rounded-3xl p-4 sm:p-5 w-full border border-gray-200 dark:border-gray-800 shadow-2xl relative ${
              activeZoomModal.variant === 'banner' ? 'max-w-xl sm:max-w-2xl' : 'max-w-sm'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-gray-900 dark:text-white">
                {activeZoomModal.title}
              </h4>
              <button
                type="button"
                onClick={() => setActiveZoomModal(null)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Banner vs QR */}
            {activeZoomModal.variant === 'banner' ? (
              <div className="relative w-full overflow-hidden rounded-2xl border border-red-500/40 shadow-inner bg-[#be1e2d] aspect-[1000/420]">
                {imageErrorMap[activeZoomModal.src] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white">
                    <span className="font-bold text-sm">Supported Apps for BanglaQR</span>
                    <span className="text-xs text-white/80 mt-1">bKash, Nagad, Cellfin, Citytouch, Astha, SC Mobile, Upay &amp; 20+ banks</span>
                  </div>
                ) : (
                  <Image
                    src={activeZoomModal.src}
                    alt={activeZoomModal.title}
                    width={1000}
                    height={420}
                    priority
                    className="w-full h-full object-contain rounded-2xl"
                    onError={() => handleImageError(activeZoomModal.src)}
                  />
                )}
              </div>
            ) : (
              <div
                className={`p-3 bg-white rounded-2xl border-2 shadow-inner flex items-center justify-center ${
                  activeZoomModal.brand === 'bkash'
                    ? 'border-[#D12053]/50'
                    : 'border-emerald-500/50'
                }`}
              >
                {imageErrorMap[activeZoomModal.src] ? (
                  <StylizedQrFallback
                    title={activeZoomModal.title}
                    subText="Scan from another screen or phone"
                    brandColor={activeZoomModal.brand === 'bkash' ? 'pink' : 'emerald'}
                  />
                ) : (
                  <div className="relative w-full aspect-[800/1060] overflow-hidden rounded-xl bg-white flex items-center justify-center">
                    <Image
                      src={activeZoomModal.src}
                      alt={activeZoomModal.title}
                      width={800}
                      height={1060}
                      priority
                      className="w-full h-full object-contain rounded-xl"
                      onError={() => handleImageError(activeZoomModal.src)}
                    />
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-3 font-medium">
              {activeZoomModal.caption || (
                activeZoomModal.variant === 'banner'
                  ? 'All of these 20+ Bank and MFS apps support BanglaQR scanning.'
                  : 'Point your phone camera or bank app QR scanner at this code.'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
