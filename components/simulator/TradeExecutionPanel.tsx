'use client';

import { useState } from 'react';

interface TradeExecutionPanelProps {
  symbol: string;
  currentPrice: number;
  availableBalance: number; // User's cash balance
  currentHoldings: number; // How many shares they currently own
  onExecute: (type: 'BUY' | 'SELL', quantity: number) => Promise<void>;
}

export default function TradeExecutionPanel({
  symbol,
  currentPrice,
  availableBalance,
  currentHoldings,
  onExecute
}: TradeExecutionPanelProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 0.4% standard DSE broker commission
  const BROKER_FEE_RATE = 0.004; 
  const qtyNum = parseInt(quantity) || 0;
  
  const grossValue = qtyNum * currentPrice;
  const commission = grossValue * BROKER_FEE_RATE;
  
  const totalBuyCost = grossValue + commission;
  const totalSellRevenue = grossValue - commission;

  const canBuy = qtyNum > 0 && totalBuyCost <= availableBalance;
  const canSell = qtyNum > 0 && qtyNum <= currentHoldings;

  const handleTrade = async (type: 'BUY' | 'SELL') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onExecute(type, qtyNum);
      setQuantity('');
    } catch (error) {
      console.error('Trade Execution Failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Execute Trade</h3>
      
      {/* ── Price & Holdings ── */}
      <div className="flex justify-between items-end mb-6 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
        <div>
          <p className="text-sm text-slate-500 mb-1">Market Price</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">৳{currentPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500 mb-1">Your Shares</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{currentHoldings}</p>
        </div>
      </div>

      {/* ── Mobile-Optimized Input ── */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Quantity
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} // strictly numeric
            className="w-full text-2xl font-bold text-center bg-slate-100 dark:bg-slate-800 border-0 rounded-xl py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
      </div>

      {/* ── Commission Breakdown ── */}
      {qtyNum > 0 && (
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Gross Value</span>
            <span>৳{grossValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
            <span>Broker Fee (0.4%)</span>
            <span>৳{commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-slate-900 dark:text-slate-100">Total (Buy)</span>
            <span className={canBuy ? "text-slate-900 dark:text-slate-100" : "text-red-500"}>
              ৳{totalBuyCost.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── Execution Buttons (Thumb Ergonomics) ── */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleTrade('BUY')}
          disabled={!canBuy || isSubmitting}
          className="w-full py-4 rounded-xl font-bold text-lg text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {isSubmitting ? '...' : 'BUY'}
        </button>
        
        <button
          onClick={() => handleTrade('SELL')}
          disabled={!canSell || isSubmitting}
          className="w-full py-4 rounded-xl font-bold text-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {isSubmitting ? '...' : 'SELL'}
        </button>
      </div>
    </div>
  );
}