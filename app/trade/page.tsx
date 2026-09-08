'use client';

// app/trade/page.tsx
// The Market screen: the live DSE board. Holdings now live on their own
// Portfolio tab (app/portfolio/page.tsx), so this screen is the board and
// only the board — search, dense broker-style rows, buy/sell straight from
// the list, and a chart link into each symbol's static page.
import React, { useState, useMemo, useRef, useCallback, useTransition, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSharedSimulator } from '@/contexts/SimulatorContext';
import { useTradeModal } from '@/hooks/useTradeModal';
import { searchByNameOrSymbol } from '@/lib/dseCompanyNames';
import { getUpcomingHolidays } from '@/lib/bangladeshHolidays';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell, { useRegisterSearchFocus } from '@/components/app/AppShell';
import MarketRow from '@/components/market/MarketRow';
import StockRow from '@/components/simulator/trade/StockRow';
import StockSkeleton from '@/components/simulator/trade/StockSkeleton';
import TradeModal from '@/components/simulator/trade/TradeModal';
import TradeQuestionnaireModal from '@/components/simulator/trade/TradeQuestionnaireModal';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const MarketCalendar = dynamic(() => import('@/components/simulator/MarketCalendar'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />,
});

export default function TradePage() {
  return (
    <AppShell redirectPath="/trade" redirectMessage="Please sign in to access the trading simulator">
      <MarketScreen />
    </AppShell>
  );
}

// Active community poll flag: disabled since enough responses were gathered for this poll.
// Feature architecture stays fully wired so future polls can be activated by toggling this flag.
const IS_TRADE_POLL_ACTIVE = false;

function MarketScreen() {
  const { user } = useAuth();
  const {
    marketInfo, simulatorState, loading: simulatorLoading, isMarketOpen,
    executeTrade, transactionStatus, transactionMessage, resetTransaction,
  } = useSharedSimulator();

  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    if (!IS_TRADE_POLL_ACTIVE || !user?.uid) {
      setShowSurvey(false);
      return;
    }

    const cachedKey = `ssbd_trade_survey_done_${user.uid}`;
    if (typeof window !== 'undefined' && localStorage.getItem(cachedKey) === 'true') {
      setShowSurvey(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists() && snap.data()?.tradeSurveyCompletedAt) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(cachedKey, 'true');
          }
          setShowSurvey(false);
        } else {
          setShowSurvey(true);
        }
      },
      (err) => {
        console.warn('Trade survey status listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleSurveySuccess = useCallback(() => {
    if (user?.uid && typeof window !== 'undefined') {
      localStorage.setItem(`ssbd_trade_survey_done_${user.uid}`, 'true');
    }
    setShowSurvey(false);
  }, [user?.uid]);

  const modal = useTradeModal(executeTrade);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [visibleCount, setVisibleCount] = useState(50);
  const [holidays, setHolidays] = useState<string[]>([]);

  useRegisterSearchFocus(() => searchInputRef.current?.focus());

  useEffect(() => {
    getUpcomingHolidays().then(setHolidays).catch(() => setHolidays([]));
  }, []);

  const marketOpen = isMarketOpen();

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    startTransition(() => {
      setSearchQuery(value);
      setVisibleCount(50);
    });
  }, []);

  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map((item) => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  const normalizedQuery = searchQuery.trim();
  const companyNameMatches = useMemo(
    () => (normalizedQuery.length >= 2 ? new Set(searchByNameOrSymbol(normalizedQuery)) : new Set<string>()),
    [normalizedQuery]
  );

  // Sector counts always reflect the full board, not the search-narrowed
  // subset — the tab strip is a top-level facet, so it shouldn't shuffle or
  // shrink while someone is typing a search query.
  const sectorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const stock of marketInfo?.stocks || []) {
      if (stock.sector) counts.set(stock.sector, (counts.get(stock.sector) || 0) + 1);
    }
    return counts;
  }, [marketInfo?.stocks]);

  const sortedSectors = useMemo(
    () => Array.from(sectorCounts.keys()).sort((a, b) => a.localeCompare(b)),
    [sectorCounts]
  );

  const handleSectorChange = useCallback((sector: string) => {
    setSelectedSector(sector);
    setVisibleCount(50);
  }, []);

  // Desktop/laptop has no touch swipe, so the sector strip is otherwise
  // unreachable past the viewport edge with a mouse — these arrows are the
  // only way to get to it there. Hidden on phones (sm:flex) since swipe
  // already works and the strip's own width should carry the arrows'
  // absence gracefully. `hasOverflow` hides the whole pair when everything
  // already fits, so they never sit there doing nothing.
  const sectorScrollRef = useRef<HTMLDivElement>(null);
  const [sectorScroll, setSectorScroll] = useState({ canLeft: false, canRight: false, hasOverflow: false });

  const updateSectorScroll = useCallback(() => {
    const el = sectorScrollRef.current;
    if (!el) return;
    setSectorScroll({
      hasOverflow: el.scrollWidth > el.clientWidth + 1,
      canLeft: el.scrollLeft > 4,
      canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateSectorScroll();
    window.addEventListener('resize', updateSectorScroll);
    return () => window.removeEventListener('resize', updateSectorScroll);
  }, [sortedSectors, updateSectorScroll]);

  const scrollSectors = useCallback((direction: 1 | -1) => {
    sectorScrollRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' });
  }, []);

  const filteredStocks = useMemo(() => {
    let all = marketInfo?.stocks || [];
    if (selectedSector !== 'All') all = all.filter((s) => s.sector === selectedSector);
    if (!normalizedQuery) return all;
    const upper = normalizedQuery.toUpperCase();
    return all.filter((s) => s.symbol.includes(upper) || companyNameMatches.has(s.symbol));
  }, [marketInfo?.stocks, selectedSector, normalizedQuery, companyNameMatches]);

  const visibleStocks = useMemo(() => filteredStocks.slice(0, visibleCount), [filteredStocks, visibleCount]);
  const hasMore = filteredStocks.length > visibleCount;

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) setVisibleCount((prev) => prev + 50);
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
      return () => observer.disconnect();
    },
    [hasMore]
  );

  const onTrade = useCallback(
    (symbol: string, type: 'buy' | 'sell') => modal.openTradeModal(symbol, type, resetTransaction),
    [modal, resetTransaction]
  );

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4">
      <div className="px-4 sm:px-0 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search symbol or company…"
            aria-label="Search DSE stocks"
            className="w-full h-11 pl-9 pr-9 bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isPending && <p className="text-[11px] text-blue-500 font-semibold mt-1">Searching…</p>}
      </div>

      {sortedSectors.length > 0 && (
        <div className="pb-3 -mt-1 flex items-center gap-1 px-4 sm:px-0">
          {sectorScroll.hasOverflow && (
            <button
              type="button"
              onClick={() => scrollSectors(-1)}
              disabled={!sectorScroll.canLeft}
              aria-label="Scroll industries left"
              className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 shadow-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div
            ref={sectorScrollRef}
            onScroll={updateSectorScroll}
            role="tablist"
            aria-label="Filter by industry"
            className="flex gap-2 overflow-x-auto scrollbar-none min-w-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedSector === 'All'}
              onClick={() => handleSectorChange('All')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedSector === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {sortedSectors.map((sector) => (
              <button
                key={sector}
                type="button"
                role="tab"
                aria-selected={selectedSector === sector}
                onClick={() => handleSectorChange(sector)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedSector === sector
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {sector} <span className="opacity-60">{sectorCounts.get(sector)}</span>
              </button>
            ))}
          </div>
          {sectorScroll.hasOverflow && (
            <button
              type="button"
              onClick={() => scrollSectors(1)}
              disabled={!sectorScroll.canRight}
              aria-label="Scroll industries right"
              className="hidden sm:flex shrink-0 w-7 h-7 items-center justify-center rounded-full bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-800 shadow-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-[#1A1F26] border-y sm:border sm:rounded-2xl border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {simulatorLoading ? (
          <StockSkeleton count={10} />
        ) : visibleStocks.length === 0 ? (
          <div className="py-16 px-6 flex flex-col items-center text-center gap-2">
            <Search className="w-8 h-8 opacity-20" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {searchQuery
                ? <>No stocks found matching &ldquo;{searchQuery}&rdquo;{selectedSector !== 'All' && ` in ${selectedSector}`}</>
                : `No stocks found in ${selectedSector}`}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Symbol</th>
                    <th className="px-6 py-4 font-semibold text-right">Price (LTP)</th>
                    <th className="px-6 py-4 font-semibold text-right">Change</th>
                    <th className="px-6 py-4 font-semibold text-center">Category</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleStocks.map((stock) => (
                    <StockRow
                      key={stock.symbol}
                      stock={stock}
                      marketOpen={marketOpen}
                      variant="market"
                      onTrade={onTrade}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {visibleStocks.map((stock) => (
                <MarketRow
                  key={stock.symbol}
                  stock={stock}
                  portfolioItem={portfolioBySymbol.get(stock.symbol)}
                  marketOpen={marketOpen}
                  onTrade={onTrade}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={observerRef} className="h-10 w-full flex items-center justify-center p-4 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                Loading more…
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 sm:px-0 mt-6 mb-4">
        <MarketCalendar holidays={holidays} />
      </div>

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

      {IS_TRADE_POLL_ACTIVE && showSurvey && (
        <TradeQuestionnaireModal onSuccess={handleSurveySuccess} />
      )}
    </div>
  );
}
