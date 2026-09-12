'use client';

// components/portfolio/PdfStatementButton.tsx
// Production-ready PDF Statement export trigger with 120s anti-spam cooldown,
// 100% client-side zero-resource generation, and strict Boss tier gating.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileDown, FileText, Loader2, Crown, ShieldAlert, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { fetchWithToken } from '@/lib/utils/fetchWithToken';
import { generatePortfolioPdf } from '@/lib/utils/pdfGenerator';
import type { PortfolioTotals } from '@/lib/utils/portfolio';
import type { PortfolioItem, Stock } from '@/hooks/useSimulator';

const COOLDOWN_KEY = 'ssbd_last_statement_export_ts';
const COOLDOWN_SECONDS = 120; // 120 seconds cooldown

interface Props {
  isBoss: boolean;
  totals: PortfolioTotals;
  portfolio: PortfolioItem[];
  stockBySymbol: Map<string, Stock>;
  balance: number;
  realizedGainLoss: number;
}

export default function PdfStatementButton({
  isBoss,
  totals,
  portfolio,
  stockBySymbol,
  balance,
  realizedGainLoss,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Check persistent 120-second cooldown in localStorage on mount and interval
  useEffect(() => {
    const checkCooldown = () => {
      try {
        const storedTs = localStorage.getItem(COOLDOWN_KEY);
        if (storedTs) {
          const elapsed = (Date.now() - Number(storedTs)) / 1000;
          if (elapsed < COOLDOWN_SECONDS) {
            setCooldownActive(true);
            return;
          }
        }
        setCooldownActive(false);
      } catch {
        setCooldownActive(false);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setErrorToast(null);

    // 🔒 1. Client-Side Boss Gate: Bro users get the Upgrade Modal directly
    if (!isBoss) {
      setShowUpgradeModal(true);
      return;
    }

    // 🔒 2. Anti-Abuse Cooldown Guard
    if (cooldownActive || isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      // 🔒 3. Authoritative Server-Side Verification Ticket
      // Even if someone changes isBoss in the console/DevTools, the server strictly checks Admin SDK
      const response = await fetchWithToken('/api/portfolio/statement-ticket', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 403 || data.isBoss === false) {
        // Tamper attempt intercepted or Boss expired
        setShowUpgradeModal(true);
        setIsGenerating(false);
        return;
      }

      if (response.status === 429 || data.error === 'Please Wait') {
        // Server enforced 120s cooldown
        setCooldownActive(true);
        localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
        setIsGenerating(false);
        return;
      }

      if (!response.ok || !data.success || !data.ticket) {
        throw new Error(data.error || 'Failed to authorize statement download');
      }

      // 4. Generate & Download PDF (100% Client-Side, 0 server compute)
      await generatePortfolioPdf({
        ticket: data.ticket,
        totals,
        portfolio,
        stockBySymbol,
        balance,
        realizedGainLoss,
      });

      // 5. Activate 120-second cooldown
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
      setCooldownActive(true);
    } catch (err: any) {
      console.error('Statement generation error:', err);
      setErrorToast(err?.message || 'Download failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        {isBoss ? (
          <button
            type="button"
            onClick={handleExport}
            disabled={cooldownActive || isGenerating}
            title={
              cooldownActive
                ? 'Please wait before generating another statement'
                : 'Download Portfolio Statement PDF'
            }
            aria-label="Download Portfolio Statement PDF"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm shrink-0 active:scale-95 ${
              cooldownActive || isGenerating
                ? 'bg-amber-500/10 border border-amber-400/30 text-amber-700/60 dark:text-amber-300/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-gray-950 shadow-amber-500/20'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Generating...</span>
              </>
            ) : cooldownActive ? (
              <>
                <FileDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
                <span>Please Wait</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">PDF Statement</span>
                <span className="xs:hidden">PDF</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            title="PDF Statement is a Boss Tier feature — click to upgrade"
            aria-label="PDF Statement (Boss Tier required)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 transition-all active:scale-95 shadow-sm shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="hidden xs:inline">PDF Statement</span>
            <span className="xs:hidden">PDF</span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded bg-amber-500 text-gray-950 ml-0.5">
              👑 Upgrade
            </span>
          </button>
        )}
      </div>

      {/* Error Toast */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>{errorToast}</span>
          <button type="button" onClick={() => setErrorToast(null)} className="ml-2 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* 👑 BRO TIER UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#1A1F26] border border-amber-400/40 rounded-2xl shadow-2xl p-6 text-gray-900 dark:text-white">
            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-gray-950 shadow-md shadow-amber-500/20 shrink-0">
                <Crown className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">
                  Unlock PDF Portfolio Statement
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  Exclusive Boss Tier Privilege
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Download clean, professional DSE paper-trading portfolio statements complete with lot-by-lot T+1 lock-in maturity, gain/loss breakdowns, and portfolio equity valuation for your simulated trading records.
            </p>

            <div className="space-y-2 mb-6 bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/80 dark:border-amber-500/20 rounded-xl p-3.5">
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Standard DSE Instrument & Holdings Statement Table
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  +10% Extra Free Coins on Every bKash Recharge
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Risk Radar, Sector Breakdown & Banked Realized P&L
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/boss"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 active:scale-95 text-gray-950 px-4 py-3 rounded-xl text-sm font-black transition-all shadow-md shadow-amber-500/25"
              >
                <Sparkles className="w-4 h-4 fill-current shrink-0" />
                <span>Upgrade to Boss (৳20 / mo)</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
