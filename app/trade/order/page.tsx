'use client';

// app/trade/order/page.tsx
// Dedicated order-entry screen — the destination of the app shell's raised
// centre tab. Broker apps put order entry on its own screen rather than a
// modal so it survives a refresh, is linkable (?symbol=GP&type=sell), and
// gives the quote and quantity room to breathe instead of squeezing into an
// overlay. Trades are still market orders at the live LTP — this simulator
// has no limit-order book — so the "rate" field is a read-only quote, not an
// editable price like a real order ticket's would be.
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Minus, Plus, Search, X, ChevronDown, ChevronLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import AppShell from '@/components/app/AppShell';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { searchByNameOrSymbol, getCompanyName } from '@/lib/dseCompanyNames';
import { getSaleableQuantity, estimateOrder } from '@/lib/utils/portfolio';
import NotTradedInfo from '@/components/simulator/trade/NotTradedInfo';

export default function OrderPage() {
  return (
    <AppShell redirectPath="/trade/order" redirectMessage="Please sign in to place an order">
      <Suspense fallback={null}>
        <OrderScreen />
      </Suspense>
    </AppShell>
  );
}

function OrderScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    marketInfo, simulatorState, isMarketOpen,
    executeTrade, transactionStatus, transactionMessage, resetTransaction,
  } = useSharedSimulator();

  const marketOpen = isMarketOpen();
  const stocks = marketInfo?.stocks || [];
  const stockBySymbol = useMemo(() => new Map(stocks.map((s) => [s.symbol, s])), [stocks]);
  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map((item) => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>(
    searchParams.get('type') === 'sell' ? 'SELL' : 'BUY'
  );
  const [symbol, setSymbol] = useState(searchParams.get('symbol')?.toUpperCase() || '');
  const [symbolQuery, setSymbolQuery] = useState('');
  const [showPicker, setShowPicker] = useState(!symbol);
  const [quantityInput, setQuantityInput] = useState('1');

  // A symbol arriving via URL after the board has loaded (e.g. deep link
  // opened before market data resolved) should still populate the picker.
  useEffect(() => {
    const urlSymbol = searchParams.get('symbol')?.toUpperCase();
    if (urlSymbol && urlSymbol !== symbol) setSymbol(urlSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const stock = symbol ? stockBySymbol.get(symbol) : undefined;
  const holding = symbol ? portfolioBySymbol.get(symbol) : undefined;
  const companyName = symbol ? getCompanyName(symbol) : null;
  const isTraded = stock ? stock.traded !== false : false;
  const quantity = Math.max(0, parseInt(quantityInput, 10) || 0);

  const matches = useMemo(() => {
    const q = symbolQuery.trim();
    if (q.length < 1) return stocks.slice(0, 30);
    const upper = q.toUpperCase();
    const nameMatches = q.length >= 2 ? new Set(searchByNameOrSymbol(q)) : new Set<string>();
    return stocks.filter((s) => s.symbol.includes(upper) || nameMatches.has(s.symbol)).slice(0, 30);
  }, [symbolQuery, stocks]);

  const saleable = holding ? getSaleableQuantity(holding) : 0;
  const locked = holding ? holding.quantity - saleable : 0;
  const price = stock?.ltp || 0;
  const estimate = useMemo(() => estimateOrder(orderType, quantity, price), [orderType, quantity, price]);

  const availableBalance = simulatorState.balance;
  const canAfford = orderType === 'BUY' ? estimate.net <= availableBalance + 0.01 : true;
  const hasEnoughShares = orderType === 'SELL' ? quantity <= saleable : true;

  const blockReason = !marketOpen
    ? 'Market is closed'
    : !symbol
      ? 'Pick a stock to trade'
      : !isTraded
        ? 'This stock has not traded today'
        : quantity <= 0
          ? 'Enter a quantity'
          : orderType === 'BUY' && !canAfford
            ? `Insufficient balance — need ৳${estimate.net.toFixed(2)}`
            : orderType === 'SELL' && !hasEnoughShares
              ? saleable === 0 && holding
                ? 'All shares locked until tomorrow (T+1)'
                : `Only ${saleable} share${saleable === 1 ? '' : 's'} eligible to sell`
              : undefined;

  const canSubmit = !blockReason && transactionStatus !== 'processing';

  const selectSymbol = useCallback(
    (sym: string) => {
      setSymbol(sym);
      setShowPicker(false);
      setSymbolQuery('');
      resetTransaction();
      router.replace(`/trade/order?symbol=${sym}&type=${orderType.toLowerCase()}`, { scroll: false });
    },
    [orderType, resetTransaction, router]
  );

  const adjustQuantity = (delta: number) => {
    setQuantityInput((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) + delta)));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !symbol) return;
    await executeTrade(symbol, orderType, quantity);
  };

  // Reset the quantity for the next order once one settles — but the
  // success/error banner itself is left alone here. It used to auto-hide on
  // a 1.8s timer, which was often shorter than the time it actually took the
  // trade to round-trip and the message to render, so the banner could
  // disappear before it had ever been read. It now stays until the user
  // does something that implies they're done with it (changing the symbol
  // or BUY/SELL both already call resetTransaction — see selectSymbol and
  // the order-type toggle above).
  useEffect(() => {
    if (transactionStatus === 'success') setQuantityInput('1');
  }, [transactionStatus]);

  return (
    <div className="max-w-xl mx-auto px-4 pt-3 pb-6">
      {/* Top Header with Back Button */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/trade');
            }
          }}
          aria-label="Go back"
          className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-[#1C293A] active:scale-90 transition-all shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Place Order</h1>
      </div>

      {/* BUY / SELL segmented toggle */}
      <div className="flex bg-gray-200/70 dark:bg-[#1C293A] p-1 rounded-xl mb-4">
        {(['BUY', 'SELL'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setOrderType(t);
              resetTransaction();
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-extrabold tracking-wide transition-all ${
              orderType === t
                ? t === 'BUY'
                  ? 'bg-[#0AA892] text-white shadow-sm'
                  : 'bg-[#E54D4C] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Symbol selector card */}
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl mb-3 text-left shadow-xs active:scale-[0.99] transition-all group"
      >
        {symbol ? (
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Selected Stock</div>
            <div className="font-black text-lg text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {symbol}
              {stock?.category && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {stock.category}
                </span>
              )}
            </div>
            {companyName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{companyName}</div>}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900 dark:text-white">Choose a Stock to Trade</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Tap to search 400+ DSE securities</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
          <span>{symbol ? 'Change' : 'Search'}</span>
          <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-y-0.5 transition-transform" />
        </div>
      </button>

      {/* Quote card */}
      {symbol && stock && (
        <div className="bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 mb-3 shadow-xs">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Order Rate (LTP)
              </div>
              {isTraded ? (
                <div className="font-mono font-extrabold text-2xl text-gray-900 dark:text-white tabular-nums">
                  ৳{price.toFixed(2)}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 dark:text-gray-500 mt-1">
                  Not traded today
                  <NotTradedInfo lastClose={stock.ycp} />
                </div>
              )}
            </div>
            {isTraded && (
              <span
                className={`font-mono text-xs sm:text-sm font-bold px-2 py-1 rounded-lg text-white tabular-nums ${
                  stock.change >= 0
                    ? 'bg-[#0AA892]'
                    : 'bg-[#E54D4C]'
                }`}
              >
                {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-gray-100 dark:border-gray-800">
            <QuoteFigure label="High" value={stock.high ? stock.high.toFixed(2) : '—'} />
            <QuoteFigure label="Low" value={stock.low ? stock.low.toFixed(2) : '—'} />
            <QuoteFigure label="Prev Close" value={(stock.ycp || 0).toFixed(2)} />
          </dl>

          {orderType === 'SELL' && holding && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">You hold {holding.quantity} shares</span>
              <span className={`font-mono font-bold ${locked > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {saleable} saleable{locked > 0 ? ` (${locked} locked)` : ''}
              </span>
            </div>
          )}
          {orderType === 'SELL' && !holding && (
            <p className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
              You don&apos;t own any {symbol} shares.
            </p>
          )}
        </div>
      )}

      {/* Quantity */}
      <div className="bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 mb-3 shadow-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
          Order Quantity
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => adjustQuantity(-1)}
            aria-label="Decrease quantity"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#1C293A] dark:hover:bg-[#24354A] text-gray-700 dark:text-gray-200 active:scale-95 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value.replace(/[^0-9]/g, ''))}
            className="flex-1 h-11 text-center font-mono font-bold text-lg bg-gray-50/80 dark:bg-[#111823] border border-gray-200/80 dark:border-gray-800 rounded-xl tabular-nums focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            aria-label="Order quantity"
          />
          <button
            type="button"
            onClick={() => adjustQuantity(1)}
            aria-label="Increase quantity"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#1C293A] dark:hover:bg-[#24354A] text-gray-700 dark:text-gray-200 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {orderType === 'SELL' && saleable > 0 && (
          <button
            type="button"
            onClick={() => setQuantityInput(String(saleable))}
            className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sell all {saleable}
          </button>
        )}
      </div>

      {/* Order summary */}
      {symbol && quantity > 0 && (
        <div className="bg-white dark:bg-[#16202D] border border-gray-200/80 dark:border-gray-800 rounded-xl p-4 mb-3 space-y-2 shadow-xs">
          <SummaryLine label="Gross value" value={`৳${estimate.gross.toFixed(2)}`} />
          <SummaryLine label="Commission (0.4%)" value={`৳${estimate.commission.toFixed(2)}`} />
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <SummaryLine
              label={orderType === 'BUY' ? 'Total payable' : 'Net proceeds'}
              value={`৳${estimate.net.toFixed(2)}`}
              bold
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1">
            <span>Buying power</span>
            <span className="font-mono">৳{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Status */}
      {transactionStatus === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0AA892]/10 text-[#0AA892] dark:text-[#2DD4BF] text-sm font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {transactionMessage}
        </div>
      )}
      {transactionStatus === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#E54D4C]/10 text-[#E54D4C] dark:text-[#F87171] text-sm font-semibold mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {transactionMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        title={blockReason}
        className={`w-full py-3.5 rounded-xl text-white font-extrabold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm ${
          orderType === 'BUY'
            ? 'bg-[#0AA892] hover:bg-[#088A78] disabled:bg-gray-200 dark:disabled:bg-gray-800'
            : 'bg-[#E54D4C] hover:bg-[#D43D3C] disabled:bg-gray-200 dark:disabled:bg-gray-800'
        } disabled:text-gray-400 dark:disabled:text-gray-500`}
      >
        {transactionStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
        {orderType} {symbol || 'STOCK'}
      </button>
      {blockReason && (
        <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-2">{blockReason}</p>
      )}

      {showPicker && (
        <SymbolPicker
          query={symbolQuery}
          onQueryChange={setSymbolQuery}
          matches={matches}
          onSelect={selectSymbol}
          onClose={() => setShowPicker(false)}
          hasExistingSymbol={!!symbol}
        />
      )}
    </div>
  );
}

function QuoteFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="font-mono font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{value}</dd>
    </div>
  );
}

function SummaryLine({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <span className={`font-mono tabular-nums ${bold ? 'font-extrabold text-base text-gray-900 dark:text-white' : 'text-sm font-semibold text-gray-700 dark:text-gray-300'}`}>
        {value}
      </span>
    </div>
  );
}

function SymbolPicker({
  query,
  onQueryChange,
  matches,
  onSelect,
  onClose,
  hasExistingSymbol,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  matches: import('@/hooks/useSimulator').Stock[];
  onSelect: (symbol: string) => void;
  onClose: () => void;
  hasExistingSymbol: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Deferred rather than a plain `autoFocus`: this overlay opens immediately
  // on landing here from the bottom nav's ORDER button (showPicker defaults
  // to true when no symbol is pre-selected), i.e. mid client-side-navigation.
  // Focusing synchronously on mount pops the mobile keyboard while the route
  // transition and this fixed overlay's own layout are still settling,
  // which on some mobile browsers renders the search bar cut off at the top
  // until the viewport resize catches up. Waiting a frame lets layout
  // stabilize first.
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const handleBack = () => {
    if (hasExistingSymbol) {
      onClose();
    } else {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/trade');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-[#0B0E11]">
      {/* Top Search Header Bar with iPhone-friendly Back Button on the left */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0E1520]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80 px-3 sm:px-4 py-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          {/* Back button on the left of search box */}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-all shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Search bar container */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search symbol or company…"
              className="w-full h-11 pl-10 pr-9 bg-gray-100 dark:bg-[#16202D] border border-transparent focus:border-blue-500/50 dark:focus:border-blue-500/50 rounded-xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:opacity-80 active:scale-90 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={hasExistingSymbol ? onClose : handleBack}
            className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1.5 shrink-0 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Stock list with rich metrics and category badges */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/80 bg-white dark:bg-[#0B0E11] max-w-xl mx-auto w-full pb-safe">
        {matches.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300">No stocks found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try searching by DSE symbol or company name</p>
          </div>
        ) : (
          matches.map((s) => {
            const name = getCompanyName(s.symbol);
            const isTraded = s.traded !== false;
            const changePositive = s.change >= 0;
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => onSelect(s.symbol)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#16202D] active:bg-gray-100 dark:active:bg-[#1A2634] transition-colors"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white tracking-tight">
                      {s.symbol}
                    </span>
                    {s.category && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {s.category}
                      </span>
                    )}
                  </div>
                  {name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                      {name}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  {isTraded ? (
                    <>
                      <div className="font-mono font-bold text-sm sm:text-base text-gray-900 dark:text-white tabular-nums">
                        ৳{s.ltp.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block font-mono text-[11px] font-bold px-1.5 py-0.5 rounded text-white tabular-nums mt-0.5 ${
                          changePositive ? 'bg-[#0AA892]' : 'bg-[#E54D4C]'
                        }`}
                      >
                        {changePositive ? '+' : ''}
                        {(s.changePercent || 0).toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                      Not traded
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
