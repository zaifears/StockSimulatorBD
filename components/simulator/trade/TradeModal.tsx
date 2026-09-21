import React, { useMemo, useDeferredValue, useEffect, useState } from 'react';
import {
  X,
  Minus,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Bell,
} from 'lucide-react';
import type { MarketInfo, SimulatorState } from '@/hooks/useSimulator';
import { getCompanyName } from '@/lib/dseCompanyNames';
import NotTradedInfo from './NotTradedInfo';
import { useAuth } from '@/contexts/AuthContext';
import BossPostTradeNudge, { incrementTradeCount } from '@/components/boss/BossPostTradeNudge';
import MarketClosedModal from '@/components/market/MarketClosedModal';

interface Props {
  selectedStock: string;
  tradeType: 'buy' | 'sell';
  setTradeType: (type: 'buy' | 'sell') => void;
  tradeQuantity: number | '';
  setTradeQuantity: (val: number | '') => void;
  tradeQuantityInput: string;
  setTradeQuantityInput: (val: string) => void;
  onClose: () => void;
  onExecute: () => void;
  marketInfo: MarketInfo | null;
  simulatorState: SimulatorState;
  marketOpen: boolean;
  transactionStatus: 'idle' | 'processing' | 'success' | 'error';
  transactionMessage: string;
  resetTransaction: () => void;
}

export default function TradeModal({
  selectedStock,
  tradeType,
  setTradeType,
  tradeQuantity,
  setTradeQuantity,
  tradeQuantityInput,
  setTradeQuantityInput,
  onClose,
  onExecute,
  marketInfo,
  simulatorState,
  marketOpen,
  transactionStatus,
  transactionMessage,
  resetTransaction,
}: Props) {
  const deferredTradeQuantity = useDeferredValue(tradeQuantity);
  const COMMISSION_RATE = 0.004;
  const { isBoss, user } = useAuth();
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const stockBySymbol = useMemo(
    () => new Map((marketInfo?.stocks || []).map((stock) => [stock.symbol, stock])),
    [marketInfo?.stocks]
  );
  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map((item) => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  const selectedStockData = selectedStock ? stockBySymbol.get(selectedStock) : undefined;
  const companyName = selectedStock ? getCompanyName(selectedStock) : null;
  const stockCategory = selectedStockData?.category;
  const stockChange = selectedStockData?.change ?? 0;
  const stockChangePercent = selectedStockData?.changePercent ?? 0;
  const changePositive = stockChange >= 0;

  const tradeSummary = useMemo(() => {
    const qty = typeof deferredTradeQuantity === 'number' && deferredTradeQuantity > 0 ? deferredTradeQuantity : 0;
    const isTraded = selectedStockData ? selectedStockData.traded !== false : true;
    const lastClose = selectedStockData?.ycp;
    const stockPrice = selectedStockData?.ltp || 0;
    const subtotal = stockPrice * qty;
    const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
    const total = Math.round((tradeType === 'buy' ? subtotal + commission : subtotal - commission) * 100) / 100;
    const availableBalance = Math.round(simulatorState.balance * 100) / 100;
    const canAfford = total <= availableBalance + 0.01;
    const holding = selectedStock ? portfolioBySymbol.get(selectedStock) : undefined;
    const holdingQty = holding?.quantity || 0;
    const shortage = Math.max(0, Math.round((total - availableBalance) * 100) / 100);

    // Shares bought today aren't sellable yet (T+1 rule). Mirrors the
    // per-lot eligibility check in app/api/simulator/trade/route.ts —
    // falls back to the whole holding as one lot for pre-lots portfolios.
    const bdOpts = { timeZone: 'Asia/Dhaka' } as const;
    const todayStr = new Date().toLocaleDateString('en-CA', bdOpts);
    const lots = holding
      ? holding.lots && holding.lots.length > 0
        ? holding.lots
        : [{ quantity: holding.quantity, purchaseDate: holding.purchaseDate }]
      : [];
    const sellableQty = lots.reduce((sum, lot) => {
      const lotDateStr = new Date(lot.purchaseDate).toLocaleDateString('en-CA', bdOpts);
      return lotDateStr === todayStr ? sum : sum + lot.quantity;
    }, 0);
    const hasT1Restriction = holdingQty > 0 && sellableQty < holdingQty;
    const notEnoughOwned = qty > holdingQty;
    const canSellQty = qty <= sellableQty;

    return {
      qty,
      stockPrice,
      subtotal,
      commission,
      total,
      availableBalance,
      canAfford,
      holdingQty,
      sellableQty,
      canSellQty,
      shortage,
      hasT1Restriction,
      notEnoughOwned,
      isTraded,
      lastClose,
      isDisabled:
        transactionStatus === 'processing' ||
        (marketOpen && !isTraded) ||
        qty <= 0 ||
        (tradeType === 'buy' && !canAfford) ||
        (tradeType === 'sell' && !canSellQty),
    };
  }, [
    deferredTradeQuantity,
    selectedStock,
    selectedStockData,
    tradeType,
    simulatorState.balance,
    portfolioBySymbol,
    transactionStatus,
    marketOpen,
  ]);

  // Haptic feedback effect
  React.useEffect(() => {
    if (transactionStatus === 'success' || transactionStatus === 'error') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(transactionStatus === 'success' ? [50] : [50, 100, 50]);
      }
    }
  }, [transactionStatus]);

  // Track whether a trade just completed successfully (drives nudge visibility).
  // incrementTradeCount is called here — synchronously before the nudge reads localStorage.
  const tradeJustCompleted = transactionStatus === 'success';
  useEffect(() => {
    if (transactionStatus === 'success' && !isBoss && user?.uid) {
      incrementTradeCount(user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionStatus]);

  // Prevent internal clicks from closing the modal
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  // Backdrop tap closes the sheet — but NOT while a trade is in flight or
  // its result is still showing.
  const handleBackdropClick = () => {
    if (transactionStatus === 'processing' || transactionStatus === 'success' || transactionStatus === 'error') return;
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketOpen) {
      setShowCalendarModal(true);
      return;
    }
    if (!tradeSummary.isDisabled) {
      onExecute();
    }
  };

  const adjustQuantity = (delta: number) => {
    const current = typeof tradeQuantity === 'number' && tradeQuantity > 0 ? tradeQuantity : 1;
    const next = Math.max(1, current + delta);
    setTradeQuantity(next);
    setTradeQuantityInput(String(next));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setTradeQuantityInput(raw);
    if (raw === '') {
      setTradeQuantity('');
    } else {
      setTradeQuantity(parseInt(raw, 10) || 1);
    }
  };

  const handleQuantityBlur = () => {
    if (tradeQuantity === '' || tradeQuantity <= 0) {
      setTradeQuantity(1);
      setTradeQuantityInput('1');
    }
  };

  const maxAffordableShares = useMemo(() => {
    if (!tradeSummary.stockPrice || tradeSummary.stockPrice <= 0) return 0;
    return Math.max(0, Math.floor(tradeSummary.availableBalance / (tradeSummary.stockPrice * (1 + COMMISSION_RATE))));
  }, [tradeSummary.availableBalance, tradeSummary.stockPrice]);

  const handleMaxAffordable = () => {
    if (maxAffordableShares > 0) {
      setTradeQuantity(maxAffordableShares);
      setTradeQuantityInput(String(maxAffordableShares));
    }
  };

  const handleSellFraction = (fraction: number) => {
    if (tradeSummary.sellableQty > 0) {
      const shares = Math.max(1, Math.floor(tradeSummary.sellableQty * fraction));
      setTradeQuantity(shares);
      setTradeQuantityInput(String(shares));
    }
  };

  const tradeWebMcpSchema = {
    tools: [
      {
        name: "execute_paper_trade",
        description: `Execute a buy or sell order for ${selectedStock} on the simulated market.`,
        parameters: {
          type: "object",
          properties: {
            trade_action: {
              type: "string",
              enum: ["buy", "sell"],
              description: "Whether to buy or sell the stock."
            },
            quantity: {
              type: "integer",
              minimum: 1,
              description: "The number of shares to trade."
            }
          },
          required: ["trade_action", "quantity"]
        }
      }
    ]
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-x-hidden"
      onClick={handleBackdropClick}
    >
      {/* WebMCP Schema Injection */}
      <script type="application/webmcp+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tradeWebMcpSchema) }} />

      <div
        onClick={stopPropagation}
        className="w-full max-w-full sm:max-w-lg bg-white dark:bg-[#16202D] rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/60 border-t sm:border border-gray-200/80 dark:border-gray-800/80 overflow-hidden flex flex-col mt-auto sm:mt-0 max-h-[92vh] sm:max-h-none transition-all"
      >
        {/* Sleek Top Indicator Strip */}
        <div
          className={`h-1 w-full transition-colors duration-200 ${
            transactionStatus === 'success'
              ? 'bg-[#0AA892]'
              : transactionStatus === 'error'
              ? 'bg-[#E54D4C]'
              : tradeType === 'buy'
              ? 'bg-[#0AA892]'
              : 'bg-[#E54D4C]'
          }`}
        />

        {/* Mobile Grab Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/80 rounded-full" />
        </div>

        {transactionStatus === 'success' || transactionStatus === 'error' ? (
          /* ── Result Receipt State ── */
          <div className="p-6 sm:p-7 text-center pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
            <div
              className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${
                transactionStatus === 'success'
                  ? 'bg-[#0AA892]/10 text-[#0AA892]'
                  : 'bg-[#E54D4C]/10 text-[#E54D4C]'
              }`}
            >
              {transactionStatus === 'success' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <AlertCircle className="w-8 h-8" />
              )}
            </div>

            <div>
              <h3
                className={`text-lg sm:text-xl font-black ${
                  transactionStatus === 'success' ? 'text-[#0AA892]' : 'text-[#E54D4C]'
                }`}
              >
                {transactionStatus === 'success' ? 'Order Executed' : 'Order Failed'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {transactionMessage}
              </p>
            </div>

            {transactionStatus === 'success' && (
              <div className="bg-gray-50 dark:bg-[#0E1520] p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 text-xs text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Security</span>
                  <span className="font-extrabold text-gray-900 dark:text-white">{selectedStock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Action</span>
                  <span
                    className={`font-black uppercase ${
                      tradeType === 'buy' ? 'text-[#0AA892]' : 'text-[#E54D4C]'
                    }`}
                  >
                    {tradeType}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Executed Quantity</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {tradeSummary.qty} shares
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200/60 dark:border-gray-800/60">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Total Settlement</span>
                  <span className="font-mono font-black text-sm text-gray-900 dark:text-white">
                    ৳{tradeSummary.total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Boss milestone nudge — only shown to Bro users at trade #3/#5/#10 */}
            <BossPostTradeNudge isBoss={isBoss} uid={user?.uid} tradeJustCompleted={tradeJustCompleted} />

            <button
              type="button"
              onClick={() => {
                resetTransaction();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/20"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Main Order Sheet ── */
          <form onSubmit={handleFormSubmit} className="flex flex-col">
            {/* Header: Symbol, Company Name, Live LTP & Close Button */}
            <div className="px-5 pt-2 pb-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    {selectedStock}
                  </h3>
                  {stockCategory && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {stockCategory}
                    </span>
                  )}
                </div>
                {companyName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                    {companyName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono font-extrabold text-base sm:text-lg text-gray-900 dark:text-white tabular-nums">
                    ৳{tradeSummary.stockPrice.toFixed(2)}
                  </div>
                  {tradeSummary.isTraded && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded text-white tabular-nums mt-0.5 ${
                        changePositive ? 'bg-[#0AA892]' : 'bg-[#E54D4C]'
                      }`}
                    >
                      {changePositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {changePositive ? '+' : ''}{(stockChangePercent || 0).toFixed(2)}%
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1E293B] dark:hover:bg-[#2A374A] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center justify-center active:scale-90 transition-all shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto overflow-x-hidden max-w-full">
              {/* Hidden semantic input for AI tools */}
              <input type="hidden" name="trade_action" value={tradeType} />

              {/* BUY / SELL Segmented Pill Switch */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-[#0E1520] rounded-2xl border border-gray-200/60 dark:border-gray-800/80 w-full max-w-full">
                <button
                  type="button"
                  onClick={() => setTradeType('buy')}
                  className={`py-2.5 text-sm font-black rounded-xl transition-all ${
                    tradeType === 'buy'
                      ? 'bg-[#0AA892] text-white shadow-md shadow-[#0AA892]/25 active:scale-98'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-bold'
                  }`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('sell')}
                  className={`py-2.5 text-sm font-black rounded-xl transition-all ${
                    tradeType === 'sell'
                      ? 'bg-[#E54D4C] text-white shadow-md shadow-[#E54D4C]/25 active:scale-98'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-bold'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Context Bar: Cash Available or Holdings */}
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#0E1520]/60 border border-gray-200/50 dark:border-gray-800/50 text-xs w-full max-w-full min-w-0">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium shrink-0">
                  {tradeType === 'buy' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-[#0AA892]" />
                      Buying Power
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-3.5 h-3.5 text-[#E54D4C]" />
                      Portfolio Position
                    </>
                  )}
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums truncate text-right">
                  {tradeType === 'buy'
                    ? `৳${tradeSummary.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${tradeSummary.holdingQty.toLocaleString()} shares (${tradeSummary.sellableQty} saleable)`}
                </span>
              </div>

              {/* Market Warning Banners */}
              {!tradeSummary.isTraded && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-2 text-xs w-full max-w-full">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-300 flex-1 font-medium">
                    This stock has not traded today. Trading is unavailable.
                  </p>
                  <NotTradedInfo lastClose={tradeSummary.lastClose} />
                </div>
              )}

              {tradeType === 'sell' && tradeSummary.hasT1Restriction && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-2 text-xs w-full max-w-full">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-300 font-medium">
                    {tradeSummary.sellableQty > 0
                      ? `${tradeSummary.holdingQty - tradeSummary.sellableQty} of ${tradeSummary.holdingQty} shares were bought today and locked until tomorrow (T+1 Rule).`
                      : 'All owned shares were bought today and locked until tomorrow (T+1 Rule).'}
                  </p>
                </div>
              )}

              {/* Tactile Quantity Card with Stepper and Quick Presets */}
              <div className="bg-gray-50/80 dark:bg-[#0E1520]/80 rounded-2xl p-3.5 sm:p-4 border border-gray-200/80 dark:border-gray-800/80 space-y-3 w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <span>Order Quantity</span>
                  <span className="font-mono lowercase text-gray-400 dark:text-gray-500">lots of 1</span>
                </div>

                {/* High-Contrast Zero-Overflow Stepper */}
                <div className="flex items-stretch justify-between bg-white dark:bg-[#151D28] border border-gray-300 dark:border-gray-700/80 rounded-2xl p-1.5 shadow-sm w-full max-w-full">
                  <button
                    type="button"
                    onClick={() => adjustQuantity(-1)}
                    disabled={tradeQuantity !== '' && tradeQuantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#223042] dark:hover:bg-[#2D3F56] border border-gray-300/80 dark:border-gray-600/70 shadow-xs flex items-center justify-center text-gray-900 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all shrink-0"
                  >
                    <Minus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <div className="flex-1 min-w-0 px-2 flex items-center justify-center">
                    <input
                      id="trade-quantity"
                      name="quantity"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tradeQuantityInput}
                      onChange={handleQuantityChange}
                      onBlur={handleQuantityBlur}
                      className="w-full min-w-0 bg-transparent text-center font-mono font-black text-2xl sm:text-3xl text-gray-900 dark:text-white tabular-nums outline-none border-0 focus:ring-0 p-0 shadow-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustQuantity(1)}
                    aria-label="Increase quantity"
                    className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#223042] dark:hover:bg-[#2D3F56] border border-gray-300/80 dark:border-gray-600/70 shadow-xs flex items-center justify-center text-gray-900 dark:text-white active:scale-90 transition-all shrink-0"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Quick Preset Buttons (4-column grid never wraps or overflows) */}
                <div className="grid grid-cols-4 gap-1.5 pt-1 w-full max-w-full">
                  {tradeType === 'buy' ? (
                    <>
                      {[10, 50, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => adjustQuantity(step)}
                          className="w-full min-w-0 py-2 rounded-lg text-xs font-bold bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 active:scale-95 transition-all shadow-2xs truncate"
                        >
                          +{step}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleMaxAffordable}
                        disabled={maxAffordableShares <= 0}
                        className="w-full min-w-0 py-2 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-40 shadow-2xs truncate"
                      >
                        Max
                      </button>
                    </>
                  ) : (
                    <>
                      {[
                        { label: '25%', frac: 0.25 },
                        { label: '50%', frac: 0.5 },
                        { label: '75%', frac: 0.75 },
                        { label: 'All', frac: 1 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={tradeSummary.sellableQty <= 0}
                          onClick={() => handleSellFraction(preset.frac)}
                          className="w-full min-w-0 py-2 rounded-lg text-xs font-bold bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-700/80 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 active:scale-95 transition-all disabled:opacity-40 shadow-2xs truncate"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="bg-gray-50/70 dark:bg-[#0E1520]/70 rounded-2xl p-3.5 space-y-2 border border-gray-200/60 dark:border-gray-800/60 text-xs">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span>
                    Gross Value ({tradeSummary.qty} × ৳{tradeSummary.stockPrice.toFixed(2)})
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                    ৳{tradeSummary.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span>Broker Commission (0.4%)</span>
                  <span className="font-mono font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                    {tradeType === 'buy' ? '+' : '-'}৳{tradeSummary.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/70 dark:border-gray-800/70 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    {tradeType === 'buy' ? 'Total Payable' : 'Net Proceeds'}
                  </span>
                  <span
                    className={`font-mono text-lg font-black tabular-nums ${
                      tradeType === 'buy' ? 'text-[#0AA892]' : 'text-[#E54D4C]'
                    }`}
                  >
                    ৳{tradeSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Block Error Notices */}
              {tradeType === 'buy' && !tradeSummary.canAfford && tradeSummary.shortage > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40 font-medium">
                  Insufficient funds. Short by ৳
                  {tradeSummary.shortage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                </div>
              )}
              {tradeType === 'sell' && !tradeSummary.canSellQty && tradeSummary.qty > 0 && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40 font-medium">
                  {tradeSummary.notEnoughOwned
                    ? `You only own ${tradeSummary.holdingQty} shares.`
                    : `Only ${tradeSummary.sellableQty} shares are eligible to sell today (T+1 Rule).`}
                </div>
              )}
            </div>

            {/* Bottom Action CTA with iPhone Safe-Area Margin */}
            <div className="px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-gray-100 dark:border-gray-800/80 bg-white/50 dark:bg-[#16202D]/50">
              <button
                type="submit"
                disabled={marketOpen && tradeSummary.isDisabled}
                className={`w-full h-13 py-3.5 rounded-2xl text-white font-black text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                  !marketOpen
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/25 cursor-pointer'
                    : tradeSummary.isDisabled
                    ? 'bg-gray-300 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                    : tradeType === 'buy'
                    ? 'bg-[#0AA892] hover:bg-[#088A78] shadow-[#0AA892]/25'
                    : 'bg-[#E54D4C] hover:bg-[#D43D3C] shadow-[#E54D4C]/25'
                }`}
              >
                {transactionStatus === 'processing' && <RefreshCw className="w-4 h-4 animate-spin" />}
                {!marketOpen ? (
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4" />
                    <span>Market Closed · Set Reminder</span>
                  </span>
                ) : tradeType === 'buy' ? (
                  'Confirm Buy'
                ) : (
                  'Confirm Sell'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <MarketClosedModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        source={`trade_modal_${tradeType}`}
      />
    </div>
  );
}