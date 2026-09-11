'use client';

// app/portfolio/page.tsx
// The Portfolio screen: holdings, order history, and account overview — the
// broker-app surface that lets a user see what they actually own without
// digging through a market table filtered by "in portfolio".
import React, { useMemo, useState } from 'react';
import AppShell from '@/components/app/AppShell';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { useTradeModal } from '@/hooks/useTradeModal';
import { useTradeHistory } from '@/hooks/useTradeHistory';
import { getPortfolioTotals, getPortfolioInsights } from '@/lib/utils/portfolio';
import PortfolioSummary from '@/components/portfolio/PortfolioSummary';
import PortfolioInsights from '@/components/portfolio/PortfolioInsights';
import BossBadge from '@/components/ui/BossBadge';
import HoldingRow from '@/components/portfolio/HoldingRow';
import TradeModal from '@/components/simulator/trade/TradeModal';
import { Briefcase, BarChart3, Receipt, ArrowUpRight, ArrowDownRight, Crown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type ViewTab = 'holdings' | 'insights' | 'orders';

export default function PortfolioPage() {
  return (
    <AppShell redirectPath="/portfolio" redirectMessage="Please sign in to view your portfolio">
      <PortfolioScreen />
    </AppShell>
  );
}

function PortfolioScreen() {
  const { marketInfo, simulatorState, isMarketOpen, executeTrade, transactionStatus, transactionMessage, resetTransaction } =
    useSharedSimulator();
  const modal = useTradeModal(executeTrade);
  const [tab, setTab] = useState<ViewTab>('holdings');
  const marketOpen = isMarketOpen();

  const stockBySymbol = useMemo(
    () => new Map((marketInfo?.stocks || []).map((s) => [s.symbol, s])),
    [marketInfo?.stocks]
  );

  const totals = useMemo(
    () => getPortfolioTotals(simulatorState.portfolio, marketInfo?.stocks || []),
    [simulatorState.portfolio, marketInfo?.stocks]
  );

  // Loaded once here rather than inside OrdersList, since the Insights tab
  // also needs it (lifetime commission) — one listener instead of two.
  const { isBoss } = useAuth();
  const { trades, loading: tradesLoading, error: tradesError } = useTradeHistory();
  const insights = useMemo(
    () => (isBoss ? getPortfolioInsights(totals, simulatorState.realizedGainLoss || 0, trades) : null),
    [isBoss, totals, simulatorState.realizedGainLoss, trades]
  );

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4">
      <div className="px-4 sm:px-0 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">Portfolio</h1>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          {simulatorState.portfolio.length} holding{simulatorState.portfolio.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="px-0 sm:px-0 mb-4">
        <PortfolioSummary totals={totals} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-0 mb-2">
        <TabButton active={tab === 'holdings'} onClick={() => setTab('holdings')} icon={Briefcase} label="Holdings" />
        <TabButton
          active={tab === 'insights'}
          onClick={() => setTab('insights')}
          icon={BarChart3}
          label="Insights"
          badge={<BossBadge size="xs" interactive={false} />}
        />
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={Receipt} label="Orders" />
      </div>

      {tab === 'holdings' && (
        <HoldingsList
          portfolio={simulatorState.portfolio}
          stockBySymbol={stockBySymbol}
          marketOpen={marketOpen}
          onTrade={(sym, type) => modal.openTradeModal(sym, type, resetTransaction)}
        />
      )}
      {tab === 'insights' && (
        <div className="px-4 sm:px-0">
          <PortfolioInsights insights={insights} isBoss={isBoss} />
        </div>
      )}
      {tab === 'orders' && <OrdersList trades={trades} loading={tradesLoading} error={tradesError} isBoss={isBoss} />}

      {modal.showTradeModal && modal.selectedStock && (
        <TradeModal
          selectedStock={modal.selectedStock}
          tradeType={modal.tradeType}
          setTradeType={modal.setTradeType}
          tradeQuantity={modal.tradeQuantity}
          setTradeQuantity={modal.setTradeQuantity}
          tradeQuantityInput={modal.tradeQuantityInput}
          setTradeQuantityInput={modal.setTradeQuantityInput}
          onClose={modal.closeTradeModal}
          onExecute={modal.handleExecuteModalTrade}
          marketInfo={marketInfo}
          simulatorState={simulatorState}
          marketOpen={marketOpen}
          transactionStatus={transactionStatus}
          transactionMessage={transactionMessage}
          resetTransaction={resetTransaction}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Briefcase;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {badge}
    </button>
  );
}

function HoldingsList({
  portfolio,
  stockBySymbol,
  marketOpen,
  onTrade,
}: {
  portfolio: import('@/hooks/useSimulator').PortfolioItem[];
  stockBySymbol: Map<string, import('@/hooks/useSimulator').Stock>;
  marketOpen: boolean;
  onTrade: (symbol: string, type: 'buy' | 'sell') => void;
}) {
  const totals = useMemo(
    () => getPortfolioTotals(portfolio, Array.from(stockBySymbol.values())),
    [portfolio, stockBySymbol]
  );

  if (portfolio.length === 0) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 py-16 px-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your portfolio is empty</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Buy your first DSE stock to see it appear here with live price, P&L, and settlement status.
          </p>
          <Link
            href="/trade/order"
            className="mt-1 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors active:scale-95"
          >
            Place an order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
      {totals.holdings.map((holding) => (
        <HoldingRow
          key={holding.symbol}
          holding={holding}
          marketOpen={marketOpen}
          onTrade={onTrade}
          lastClose={stockBySymbol.get(holding.symbol)?.ycp}
        />
      ))}
    </div>
  );
}

function OrdersList({
  trades,
  loading,
  error,
  isBoss,
}: {
  trades: import('@/hooks/useTradeHistory').TradeRecord[];
  loading: boolean;
  error: string | null;
  isBoss: boolean;
}) {
  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 py-10 px-6 text-center text-sm text-gray-400 dark:text-gray-500">
          {error}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 py-16 px-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No orders yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Every buy and sell you execute will show up here with price, commission, and timestamp.
          </p>
        </div>
      </div>
    );
  }

  const visibleTrades = isBoss ? trades : trades.slice(0, 10);
  const hiddenCount = !isBoss && trades.length > 10 ? trades.length - 10 : 0;

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {visibleTrades.map((t) => {
          const isBuy = t.type === 'BUY';
          const when = new Date(t.timestamp);
          return (
            <div key={t.id} className="px-4 py-3 flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isBuy ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                }`}
              >
                {isBuy ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{t.symbol}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      isBuy ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {t.type}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                  {when.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}{' '}
                  {when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                  {t.quantity} @ {t.price.toFixed(2)}
                </div>
                <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                  ৳{t.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })}

        {isBoss && (
          <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-black/20 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <Crown className="w-3.5 h-3.5 fill-current" /> Boss Tier: Lifetime Audit Active
            </span>
            <span className="font-mono text-[11px]">{trades.length} total orders</span>
          </div>
        )}
      </div>

      {hiddenCount > 0 && (
        <div className="mx-4 sm:mx-0 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="font-bold text-xs text-gray-900 dark:text-white">
                Bro Tier shows last 10 orders ({hiddenCount} older order{hiddenCount === 1 ? '' : 's'} hidden)
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Upgrade to Boss Tier to unlock your unlimited lifetime trading ledger and audit past fills.
              </p>
            </div>
          </div>
          <Link
            href="/boss"
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-extrabold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all"
          >
            Unlock All Orders (৳20)
          </Link>
        </div>
      )}
    </div>
  );
}
