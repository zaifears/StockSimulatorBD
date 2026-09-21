'use client';

import { useState, useMemo } from 'react';
import { Plus, Minus, Clock, Bell } from 'lucide-react';
import Link from 'next/link';
import NotTradedInfo from './trade/NotTradedInfo';
import MarketClosedModal from '@/components/market/MarketClosedModal';
import { getNextMarketOpen } from '@/lib/utils/marketSchedule';

interface TradeExecutionPanelProps {
  symbol: string;
  currentPrice: number;
  /** False when the stock has had zero matched trades today — no live price to trade at. */
  isTraded?: boolean;
  /** Yesterday's closing price, shown when isTraded is false so the price line doesn't just read ৳0.00. */
  lastClose?: number;
  availableBalance: number;
  currentHoldings: number;
  isMarketOpen: boolean;
  isAuthenticated: boolean;
  onExecute: (type: 'BUY' | 'SELL', quantity: number) => Promise<void>;
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TradeExecutionPanel({
  symbol,
  currentPrice,
  isTraded = true,
  lastClose,
  availableBalance,
  currentHoldings,
  isMarketOpen,
  isAuthenticated,
  onExecute
}: TradeExecutionPanelProps) {
  const [quantity, setQuantity] = useState<string>('1');
  const [submittingType, setSubmittingType] = useState<'BUY' | 'SELL' | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const nextSession = useMemo(() => getNextMarketOpen(), []);

  // 0.4% standard DSE broker commission
  const BROKER_FEE_RATE = 0.004;
  const qtyNum = parseInt(quantity) || 0;

  const grossValue = qtyNum * currentPrice;
  const commission = grossValue * BROKER_FEE_RATE;

  const totalBuyCost = grossValue + commission;
  const totalSellRevenue = grossValue - commission;

  // Logic checks
  const canBuy = qtyNum > 0 && isTraded && totalBuyCost <= availableBalance;
  const canSell = qtyNum > 0 && isTraded && qtyNum <= currentHoldings;
  const isInputDisabled = submittingType !== null || !isMarketOpen || !isAuthenticated;

  const handleTrade = async (type: 'BUY' | 'SELL') => {
    if (!isAuthenticated) return;
    if (!isMarketOpen) {
      setIsCalendarModalOpen(true);
      return;
    }
    if (submittingType !== null || (type === 'BUY' ? !canBuy : !canSell)) return;
    setSubmittingType(type);
    try {
      await onExecute(type, qtyNum);
    } catch (error) {
      // Silently catch here to prevent Next.js full-screen dev error overlay.
    } finally {
      setSubmittingType(null);
    }
  };

  const tradeWebMcpSchema = {
    tools: [
      {
        name: "execute_paper_trade",
        description: `Execute a buy or sell order for ${symbol} on the simulated market.`,
        parameters: {
          type: "object",
          properties: {
            trade_action: { type: "string", enum: ["BUY", "SELL"], description: "Whether to buy or sell the stock." },
            quantity: { type: "integer", minimum: 1, description: "The number of shares to trade." }
          },
          required: ["trade_action", "quantity"]
        }
      }
    ]
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-4 sm:p-6 shadow-sm"
    >
      {/* WebMCP Schema Injection */}
      <script type="application/webmcp+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tradeWebMcpSchema) }} />
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">Execute Trade</h3>

      {/* ── Price & Holdings ── */}
      <div className="flex justify-between items-end mb-5 bg-gray-50 dark:bg-[#111418] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Market Price</p>
          {isTraded ? (
            <p className="font-mono font-bold text-2xl text-gray-900 dark:text-white tabular-nums">৳{fmt(currentPrice)}</p>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-base font-bold text-gray-400 dark:text-gray-500">Not traded today</p>
              <NotTradedInfo lastClose={lastClose} />
            </div>
          )}
        </div>
        {isAuthenticated && (
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Your Shares</p>
            <p className="font-mono font-bold text-lg text-gray-900 dark:text-white tabular-nums">{currentHoldings}</p>
          </div>
        )}
      </div>

      {/* ── Contextual Warnings ── */}
      {!isAuthenticated ? (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg flex items-center justify-center">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
            You must log in to trade stocks
          </p>
        </div>
      ) : !isTraded ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center justify-center gap-1.5">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            This stock hasn&apos;t traded today
          </p>
          <NotTradedInfo lastClose={lastClose} />
        </div>
      ) : !isMarketOpen ? (
        <div className="mb-4 p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate">
              Market is closed · Resumes {nextSession.nextOpenDhakaFormatted}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-2xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Remind Me</span>
          </button>
        </div>
      ) : null}

      {/* ── Stepper Input ── */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease quantity"
            title="Decrease quantity"
            onClick={() => setQuantity(String(Math.max(1, qtyNum - 1)))}
            disabled={qtyNum <= 1 || isInputDisabled}
            className="p-3 sm:p-3.5 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Minus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <input
            name="quantity"
            type="number"
            min="1"
            value={quantity}
            disabled={isInputDisabled}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
            onBlur={() => {
              if (!quantity || parseInt(quantity) <= 0) setQuantity('1');
            }}
            className="flex-1 min-w-0 w-full font-mono text-2xl font-bold text-center tabular-nums bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 rounded-xl py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="1"
          />

          <button
            type="button"
            aria-label="Increase quantity"
            title="Increase quantity"
            onClick={() => setQuantity(String(qtyNum + 1))}
            disabled={isInputDisabled}
            className="p-3 sm:p-3.5 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── Commission Breakdown ── */}
      {/* Shows both buy cost and sell proceeds rather than assuming buy —
          BUY and SELL are both live below at all times (no mode toggle),
          so a figure block that only ever reflected buy math would mislead
          anyone about to sell. Commission itself is amber, matching
          DESIGN.md's rule that amber is reserved for the commission line
          and other "this is the simulation talking" moments. */}
      {qtyNum > 0 && isAuthenticated && isTraded && (
        <div className="space-y-1.5 mb-5 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">৳{fmt(currentPrice)} × {qtyNum}</span>
            <span className="font-mono text-gray-900 dark:text-white tabular-nums">৳{fmt(grossValue)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Broker Fee (0.4%)</span>
            <span className="font-mono text-amber-700 dark:text-amber-400 tabular-nums">৳{fmt(commission)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1.5 border-t border-gray-200 dark:border-gray-800">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Buy total</span>
            <span className={`font-mono font-bold text-base tabular-nums ${canBuy ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              ৳{fmt(totalBuyCost)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Sell proceeds</span>
            <span className={`font-mono font-bold text-base tabular-nums ${canSell ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              ৳{fmt(totalSellRevenue)}
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
            name="trade_action"
            value="BUY"
            type="button"
            onClick={() => handleTrade('BUY')}
            disabled={isAuthenticated && isMarketOpen && (!canBuy || submittingType !== null)}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
              !isMarketOpen
                ? 'bg-emerald-600/85 hover:bg-emerald-600 border border-emerald-500/30 cursor-pointer'
                : !canBuy || submittingType !== null
                ? 'bg-emerald-500 opacity-40 shadow-none cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
            }`}
          >
            {submittingType === 'BUY' ? '...' : !isMarketOpen ? 'Set Buy Alarm' : 'BUY'}
          </button>

          <button
            name="trade_action"
            value="SELL"
            type="button"
            onClick={() => handleTrade('SELL')}
            disabled={isAuthenticated && isMarketOpen && (!canSell || submittingType !== null)}
            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
              !isMarketOpen
                ? 'bg-rose-600/85 hover:bg-rose-600 border border-rose-500/30 cursor-pointer'
                : !canSell || submittingType !== null
                ? 'bg-rose-500 opacity-40 shadow-none cursor-not-allowed'
                : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
            }`}
          >
            {submittingType === 'SELL' ? '...' : !isMarketOpen ? 'Set Sell Alarm' : 'SELL'}
          </button>
        </div>
      )}

      <MarketClosedModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        source="trade_panel"
      />
    </form>
  );
}
