'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import Link from 'next/link';

interface TradeExecutionPanelProps {
  symbol: string;
  currentPrice: number;
  availableBalance: number; 
  currentHoldings: number; 
  isMarketOpen: boolean;
  isAuthenticated: boolean;
  onExecute: (type: 'BUY' | 'SELL', quantity: number) => Promise<void>;
}

export default function TradeExecutionPanel({
  symbol,
  currentPrice,
  availableBalance,
  currentHoldings,
  isMarketOpen,
  isAuthenticated,
  onExecute
}: TradeExecutionPanelProps) {
  const [quantity, setQuantity] = useState<string>('1');
  const [submittingType, setSubmittingType] = useState<'BUY' | 'SELL' | null>(null);

  // 0.4% standard DSE broker commission
  const BROKER_FEE_RATE = 0.004; 
  const qtyNum = parseInt(quantity) || 0;
  
  const grossValue = qtyNum * currentPrice;
  const commission = grossValue * BROKER_FEE_RATE;
  
  const totalBuyCost = grossValue + commission;
  const totalSellRevenue = grossValue - commission;

  // Logic checks
  const canBuy = qtyNum > 0 && totalBuyCost <= availableBalance;
  const canSell = qtyNum > 0 && qtyNum <= currentHoldings;
  const isInputDisabled = submittingType !== null || !isMarketOpen || !isAuthenticated;

  const handleTrade = async (type: 'BUY' | 'SELL') => {
    if (isInputDisabled) return;
    setSubmittingType(type);
    try {
      await onExecute(type, qtyNum);
    } catch (error) {
      // Silently catch here to prevent Next.js full-screen dev error overlay.
    } finally {
      setSubmittingType(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Execute Trade</h3>
      
      {/* ── Price & Holdings ── */}
      <div className="flex justify-between items-end mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-sm text-slate-500 mb-1">Market Price</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">৳{currentPrice.toFixed(2)}</p>
        </div>
        {isAuthenticated && (
          <div className="text-right">
            <p className="text-sm text-slate-500 mb-1">Your Shares</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{currentHoldings}</p>
          </div>
        )}
      </div>

      {/* ── Contextual Warnings ── */}
      {!isAuthenticated ? (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg flex items-center justify-center">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
            You must log in to trade stocks
          </p>
        </div>
      ) : !isMarketOpen ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center justify-center">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Market is currently closed
          </p>
        </div>
      ) : null}

      {/* ── Stepper Input ── */}
      <div className="mb-6">
        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider text-xs">
          Quantity
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            title="Decrease quantity"
            onClick={() => setQuantity(String(Math.max(1, qtyNum - 1)))}
            disabled={qtyNum <= 1 || isInputDisabled}
            className="p-3 sm:p-3.5 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Minus className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          
          <input
            type="number"
            min="1"
            value={quantity}
            disabled={isInputDisabled}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
            onBlur={() => {
              if (!quantity || parseInt(quantity) <= 0) setQuantity('1');
            }}
            className="flex-1 min-w-0 w-full text-2xl font-bold text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="1"
          />
          
          <button
            type="button"
            aria-label="Increase quantity"
            title="Increase quantity"
            onClick={() => setQuantity(String(qtyNum + 1))}
            disabled={isInputDisabled}
            className="p-3 sm:p-3.5 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* ── Commission Breakdown ── */}
      {qtyNum > 0 && isAuthenticated && (
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Gross Value</span>
            <span>৳{grossValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Broker Fee (0.4%)</span>
            <span>৳{commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1">
            <span className="text-slate-900 dark:text-slate-100">Total</span>
            <span className={canBuy ? "text-slate-900 dark:text-slate-100" : "text-red-500"}>
              ৳{totalBuyCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── Execution Buttons ── */}
      {!isAuthenticated ? (
        <Link 
          href="/auth"
          className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95 flex items-center justify-center"
        >
          Log In to Trade
        </Link>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTrade('BUY')}
            disabled={!canBuy || isInputDisabled}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-sm shadow-green-500/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {submittingType === 'BUY' ? '...' : 'BUY'}
          </button>
          
          <button
            type="button"
            onClick={() => handleTrade('SELL')}
            disabled={!canSell || isInputDisabled}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {submittingType === 'SELL' ? '...' : 'SELL'}
          </button>
        </div>
      )}
    </div>
  );
}