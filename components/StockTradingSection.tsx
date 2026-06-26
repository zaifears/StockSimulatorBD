'use client';

import { useSimulator } from '@/hooks/useSimulator';
import TradeExecutionPanel from '@/components/simulator/TradeExecutionPanel';

interface StockTradingSectionProps {
  symbol: string;
  fallbackPrice: number;
}

export default function StockTradingSection({ symbol, fallbackPrice }: StockTradingSectionProps) {
  const { executeTrade, simulatorState, marketInfo, loading, transactionStatus, transactionMessage, resetTransaction } = useSimulator();

  // Extract the live polled price if available, otherwise use the server-side fallback price
  const liveStock = marketInfo?.stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
  const currentPrice = liveStock && liveStock.ltp > 0 ? liveStock.ltp : fallbackPrice;

  // Extract user holdings for this asset
  const portfolioItem = simulatorState.portfolio.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  const currentHoldings = portfolioItem ? portfolioItem.quantity : 0;

  return (
    <div className="space-y-4">
      <TradeExecutionPanel
        symbol={symbol}
        currentPrice={currentPrice}
        availableBalance={simulatorState.balance}
        currentHoldings={currentHoldings}
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