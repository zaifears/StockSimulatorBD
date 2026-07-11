import React, { useMemo, useDeferredValue } from 'react';
import { X, Minus, Plus, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { MarketInfo, SimulatorState } from '@/hooks/useSimulator';

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
  selectedStock, tradeType, setTradeType, tradeQuantity, setTradeQuantity, tradeQuantityInput, setTradeQuantityInput,
  onClose, onExecute, marketInfo, simulatorState, marketOpen, transactionStatus, transactionMessage, resetTransaction
}: Props) {
  const deferredTradeQuantity = useDeferredValue(tradeQuantity);
  const COMMISSION_RATE = 0.004;

  const stockBySymbol = useMemo(() => new Map((marketInfo?.stocks || []).map(stock => [stock.symbol, stock])), [marketInfo?.stocks]);
  const portfolioBySymbol = useMemo(() => new Map(simulatorState.portfolio.map(item => [item.symbol, item])), [simulatorState.portfolio]);

  const tradeSummary = useMemo(() => {
    const qty = typeof deferredTradeQuantity === 'number' && deferredTradeQuantity > 0 ? deferredTradeQuantity : 0;
    const selectedStockData = selectedStock ? stockBySymbol.get(selectedStock) : undefined;
    const stockPrice = selectedStockData?.ltp || 0;
    const subtotal = stockPrice * qty;
    const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
    const total = Math.round((tradeType === 'buy' ? subtotal + commission : subtotal - commission) * 100) / 100;
    const availableBalance = Math.round(simulatorState.balance * 100) / 100;
    const canAfford = total <= availableBalance + 0.01;
    const holding = selectedStock ? portfolioBySymbol.get(selectedStock) : undefined;
    const holdingQty = holding?.quantity || 0;
    const canSellQty = qty <= holdingQty;
    const shortage = Math.max(0, Math.round((total - availableBalance) * 100) / 100);
    const canSell = !holding || (() => {
      if (!holding.purchaseDate) return true;
      const bdOpts = { timeZone: 'Asia/Dhaka' } as const;
      const purchaseStr = new Date(holding.purchaseDate).toLocaleDateString('en-CA', bdOpts);
      const todayStr = new Date().toLocaleDateString('en-CA', bdOpts);
      return purchaseStr !== todayStr;
    })();

    return {
      qty, stockPrice, subtotal, commission, total, availableBalance, canAfford, holdingQty, canSellQty, shortage, canSell,
      isDisabled: transactionStatus === 'processing' || !marketOpen || qty <= 0 || (tradeType === 'buy' && !canAfford) || (tradeType === 'sell' && (!canSellQty || !canSell)),
    };
  }, [deferredTradeQuantity, selectedStock, stockBySymbol, tradeType, simulatorState.balance, portfolioBySymbol, transactionStatus, marketOpen]);

  // Haptic feedback effect
  React.useEffect(() => {
    if (transactionStatus === 'success' || transactionStatus === 'error') {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(transactionStatus === 'success' ? [50] : [50, 100, 50]);
      }
    }
  }, [transactionStatus]);

  // Prevent internal clicks from closing the modal
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeSummary.isDisabled) {
      onExecute();
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      
      {/* WebMCP Schema Injection */}
      <script 
        type="application/webmcp+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tradeWebMcpSchema) }}
      />
      <div onClick={stopPropagation} className={`${
        transactionStatus === 'success' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
        : transactionStatus === 'error' ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/50'
        : tradeType === 'buy' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
        : 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/50'
      } w-full max-w-md rounded-t-[32px] sm:rounded-2xl shadow-2xl shadow-black/50 border-t sm:border transform transition-all overflow-hidden flex flex-col mt-auto sm:mt-0 pb-0 sm:pb-0 max-h-[90vh] sm:max-h-none`}>
        
        <div className="w-full flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/80 rounded-full"></div>
        </div>

        {(transactionStatus === 'success' || transactionStatus === 'error') ? (
          <div className="p-5 sm:p-6 text-center pb-safe">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${transactionStatus === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
              {transactionStatus === 'success' ? <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />}
            </div>
            <h3 className={`text-base font-bold mb-1 ${transactionStatus === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {transactionStatus === 'success' ? 'Order Executed' : 'Order Failed'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{transactionMessage}</p>
            <button onClick={() => { resetTransaction(); onClose(); }} className={`w-full py-2.5 rounded-xl text-white font-bold text-sm transition-all ${transactionStatus === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit}>
            <div className={`px-4 sm:px-5 py-3 flex justify-between items-center border-b ${tradeType === 'buy' ? 'bg-emerald-500/20 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-500/20 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800/50'}`}>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className={`text-base font-bold ${tradeType === 'buy' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{selectedStock}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">৳{tradeSummary.stockPrice.toFixed(2)}</p>
                </div>
                {tradeType === 'buy' ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                    Balance: ৳{simulatorState.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                    Holding: {tradeSummary.holdingQty.toLocaleString()} shares
                  </span>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close modal" title="Close" className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors flex-shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              
              {/* Hidden semantic input for AI agent to interact with the Buy/Sell state */}
              <input type="hidden" name="trade_action" value={tradeType} />

              <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900/30 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setTradeType('buy')} className={`py-2 text-sm font-bold rounded-md transition-all ${tradeType === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Buy</button>
                <button type="button" onClick={() => setTradeType('sell')} className={`py-2 text-sm font-bold rounded-md transition-all ${tradeType === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>Sell</button>
              </div>

              {tradeType === 'sell' && !tradeSummary.canSell && (
                <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">Cannot sell on same day (T+1 Rule)</p>
                </div>
              )}

              <div>
                <label htmlFor="trade-quantity" className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Decrease quantity" onClick={() => { const nextQty = Math.max(1, (typeof tradeQuantity === 'number' ? tradeQuantity : 1) - 1); setTradeQuantity(nextQty); setTradeQuantityInput(String(nextQty)); }} disabled={tradeQuantity !== '' && tradeQuantity <= 1} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 flex-shrink-0">
                    <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <input 
                    id="trade-quantity" 
                    name="quantity"
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    value={tradeQuantityInput}
                    onChange={(e) => { const raw = e.target.value; if (raw === '') return setTradeQuantityInput(''); setTradeQuantityInput(raw.replace(/[^0-9]/g, '')); }}
                    onBlur={() => { if (tradeQuantity === '' || tradeQuantity <= 0) { setTradeQuantity(1); setTradeQuantityInput('1'); } }}
                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-center text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button type="button" aria-label="Increase quantity" onClick={() => { const nextQty = (typeof tradeQuantity === 'number' && tradeQuantity > 0 ? tradeQuantity : 0) + 1; setTradeQuantity(nextQty); setTradeQuantityInput(String(nextQty)); }} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 flex-shrink-0">
                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">৳{tradeSummary.stockPrice.toFixed(2)} × {tradeSummary.qty}</span>
                  <span className="font-mono text-gray-900 dark:text-white">৳{tradeSummary.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Commission (0.4%)</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">{tradeType === 'buy' ? '+' : '-'}৳{tradeSummary.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{tradeType === 'buy' ? 'Total Cost' : 'You Receive'}</span>
                  <span className={`text-base font-bold font-mono ${tradeType === 'buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>৳{tradeSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {tradeType === 'buy' && !tradeSummary.canAfford && tradeSummary.shortage > 0 && <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800/50">Insufficient balance. Need ৳{tradeSummary.shortage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.</div>}
                {tradeType === 'sell' && !tradeSummary.canSellQty && tradeSummary.qty > 0 && <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800/50">You only have {tradeSummary.holdingQty} shares available.</div>}
              </div>
            </div>

            <div className="px-4 sm:px-5 py-4 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/20 pb-safe pb-8 sm:pb-3">
              <button type="submit" disabled={tradeSummary.isDisabled} className={`w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${!marketOpen ? 'bg-gray-400 cursor-not-allowed' : tradeSummary.isDisabled ? 'bg-gray-400 cursor-not-allowed opacity-60' : tradeType === 'buy' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 shadow-rose-500/30'}`}>
                {transactionStatus === 'processing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : tradeType === 'buy' ? 'Confirm Buy' : 'Confirm Sell'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}