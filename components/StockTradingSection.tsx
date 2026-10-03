'use client';

import { useState, useEffect } from 'react';
import { useSimulator } from '@/hooks/useSimulator';
import { useAuth } from '@/contexts/AuthContext';
import TradeExecutionPanel from '@/components/simulator/TradeExecutionPanel';

interface StockTradingSectionProps {
  symbol: string;
  fallbackPrice: number;
}

export default function StockTradingSection({ symbol, fallbackPrice }: StockTradingSectionProps) {
  const { user } = useAuth();
  const { 
    executeTrade, 
    simulatorState, 
    marketInfo, 
    isMarketOpen, 
    transactionStatus, 
    transactionMessage, 
    resetTransaction 
  } = useSimulator();

  const [clientPrice, setClientPrice] = useState<number>(fallbackPrice);

  useEffect(() => {
    if (fallbackPrice > 0) {
      setClientPrice(fallbackPrice);
    }
  }, [fallbackPrice]);

  // Extract the live polled price if available, otherwise use client/fallback price
  const liveStock = marketInfo?.stocks?.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
  const resolvedPrice = liveStock && liveStock.ltp > 0 ? liveStock.ltp : (clientPrice > 0 ? clientPrice : fallbackPrice);

  // If price is still 0 (e.g. unauthenticated session on static ISR page), fetch latest day-end price from chart endpoint
  useEffect(() => {
    if (resolvedPrice > 0 || user) return;
    let isMounted = true;
    fetch(`/api/chart-data?symbol=${encodeURIComponent(symbol)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const lastCandle = data[data.length - 1];
          if (lastCandle && typeof lastCandle.close === 'number' && lastCandle.close > 0) {
            setClientPrice(lastCandle.close);
          }
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [symbol, resolvedPrice, user]);

  // Before live data arrives, don't block on a signal we don't have yet;
  // once we have it, a stock with zero trades today (ltp 0) has no live
  // price and trading must be disabled — this mirrors the same gate used
  // on the main trade page and the server-side check in
  // app/api/simulator/trade/route.ts.
  const isTraded = liveStock ? liveStock.traded !== false : true;
  const lastClose = liveStock?.ycp;

  // Extract user holdings for this asset
  const portfolioItem = simulatorState.portfolio.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  const currentHoldings = portfolioItem ? portfolioItem.quantity : 0;

  return (
    <div className="space-y-4">
      <TradeExecutionPanel
        symbol={symbol}
        currentPrice={resolvedPrice}
        isTraded={isTraded}
        lastClose={lastClose}
        availableBalance={simulatorState.balance}
        currentHoldings={currentHoldings}
        isMarketOpen={isMarketOpen()}
        isAuthenticated={!!user} // Tells the panel if the user is logged in
        onExecute={(type, qty) => executeTrade(symbol, type, qty)}
      />

      {/* ── Transaction Notification HUD ── */}
      {transactionStatus !== 'idle' && (
        <div className={`p-4 rounded-xl border text-sm transition-all shadow-sm ${
          transactionStatus === 'success' ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' :
          transactionStatus === 'error' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
          'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 animate-pulse'
        }`}>
          <div className="flex justify-between items-start">
            <p className="font-medium leading-relaxed pr-4">{transactionMessage}</p>
            {transactionStatus !== 'processing' && (
              <button 
                onClick={resetTransaction}
                className="text-xs uppercase tracking-wider font-bold opacity-70 hover:opacity-100 transition-opacity"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}