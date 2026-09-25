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
import { Search, X } from 'lucide-react';
import ScrollableHorizontal from '@/components/ui/ScrollableHorizontal';
import AppShell, { useRegisterSearchFocus } from '@/components/app/AppShell';
import MarketRow from '@/components/market/MarketRow';
import MarketOverviewBanner from '@/components/market/MarketOverviewBanner';
import StockRow from '@/components/simulator/trade/StockRow';
import StockSkeleton from '@/components/simulator/trade/StockSkeleton';
import TradeModal from '@/components/simulator/trade/TradeModal';
import TradeQuestionnaireModal from '@/components/simulator/trade/TradeQuestionnaireModal';
import { useAuth } from '@/contexts/AuthContext';
import BossTradeBanner from '@/components/boss/BossTradeBanner';
import MarketClosedModal from '@/components/market/MarketClosedModal';
import MarketClosedBanner from '@/components/market/MarketClosedBanner';
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
  const { user, isBoss } = useAuth();
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
  const [marketClosedModalOpen, setMarketClosedModalOpen] = useState(false);
  const [marketClosedModalSource, setMarketClosedModalSource] = useState('trade_banner');

  useRegisterSearchFocus(() => searchInputRef.current?.focus());

  useEffect(() => {
    getUpcomingHolidays().then(setHolidays).catch(() => setHolidays([]));
  }, []);

  const marketOpen = isMarketOpen();

  const handleOpenMarketClosed = useCallback((source: string = 'trade_banner') => {
    setMarketClosedModalSource(source);
    setMarketClosedModalOpen(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    startTransition(() => {
      setSearchQuery(value);
      setVisibleCount(50);
    });
  }, []);

  // Restore trade page state and scroll position when returning from a stock chart page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStr = sessionStorage.getItem('ssbd_trade_scroll_state');
    if (!savedStr) return;

    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    try {
      const saved = JSON.parse(savedStr);
      if (Date.now() - (saved.timestamp || 0) < 4 * 60 * 60 * 1000) {
        if (saved.sector) setSelectedSector(saved.sector);
        if (saved.search) {
          setSearchInput(saved.search);
          setSearchQuery(saved.search);
        }
        if (saved.visibleCount && saved.visibleCount > 50) {
          setVisibleCount(saved.visibleCount);
        }

        const performScroll = () => {
          if (saved.symbol) {
            const el = document.getElementById(`market-row-${saved.symbol}`) || document.getElementById(`market-card-${saved.symbol}`);
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' });
              return true;
            }
          }
          if (saved.scrollY > 0) {
            window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
          }
          return false;
        };

        performScroll();
        requestAnimationFrame(() => performScroll());
        t1 = setTimeout(performScroll, 80);
        t2 = setTimeout(performScroll, 200);
        t3 = setTimeout(performScroll, 450);
      }
    } catch (e) {
      console.warn('Failed to restore trade scroll state:', e);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, []);

  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map((item) => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  const normalizedQuery = searchQuery.trim();
  const rankedSearchResults = useMemo(() => {
    if (!normalizedQuery) return null;
    const matches = searchByNameOrSymbol(normalizedQuery);
    return new Map(matches.map((sym, idx) => [sym, idx]));
  }, [normalizedQuery]);

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


  const filteredStocks = useMemo(() => {
    let all = marketInfo?.stocks || [];
    if (selectedSector !== 'All') all = all.filter((s) => s.sector === selectedSector);
    if (!normalizedQuery || !rankedSearchResults) return all;
    const upper = normalizedQuery.toUpperCase();
    const matched = all.filter((s) => s.symbol.includes(upper) || rankedSearchResults.has(s.symbol));
    return matched.sort((a, b) => {
      const rankA = rankedSearchResults.has(a.symbol) ? rankedSearchResults.get(a.symbol)! : 1000;
      const rankB = rankedSearchResults.has(b.symbol) ? rankedSearchResults.get(b.symbol)! : 1000;
      if (rankA !== rankB) return rankA - rankB;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [marketInfo?.stocks, selectedSector, normalizedQuery, rankedSearchResults]);

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
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
      {/* ── Official Real-time DSE Indices, Breadth & Liquidity Strip ── */}
      <MarketOverviewBanner onSelectStock={(sym) => handleSearchChange(sym)} />

      <div className="px-3.5 sm:px-0 pt-2 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search symbol or company…"
            aria-label="Search DSE stocks"
            className="w-full h-11 pl-9 pr-9 bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 rounded-2xl text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
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
        <div className="pb-3 -mt-1 px-3.5 sm:px-0">
          <ScrollableHorizontal
            scrollAmount={200}
            scrollClassName="gap-2 min-w-0"
            gradientFrom="from-[#F8F9FA] dark:from-[#0B0F17]"
            arrowSize="sm"
            role="tablist"
            ariaLabel="Filter by industry sector"
            clearancePadding="pr-8 sm:pr-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedSector === 'All'}
              onClick={() => handleSectorChange('All')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                selectedSector === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-2xs'
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
                    : 'bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-2xs'
                }`}
              >
                {sector} <span className="opacity-60">{sectorCounts.get(sector)}</span>
              </button>
            ))}
          </ScrollableHorizontal>
        </div>
      )}


      {/* Off-hours Market Schedule banner */}
      {!marketOpen && (
        <MarketClosedBanner
          onOpenModal={() => handleOpenMarketClosed('trade_banner')}
          holidays={holidays}
        />
      )}

      {/* Boss Tier promotion banner — only visible to Bro users */}
      <BossTradeBanner
        isBoss={isBoss}
        uid={user?.uid}
        portfolioLength={simulatorState.portfolio.length}
      />

      {simulatorLoading ? (
        <StockSkeleton count={10} />
      ) : visibleStocks.length === 0 ? (
        <div className="mx-3.5 sm:mx-0 py-16 px-6 rounded-2xl bg-white dark:bg-[#161B22] border border-gray-200/80 dark:border-gray-800 shadow-xs flex flex-col items-center text-center gap-2">
          <Search className="w-8 h-8 text-gray-400 opacity-40 mb-1" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {searchQuery
              ? <>No stocks found matching &ldquo;{searchQuery}&rdquo;{selectedSector !== 'All' && ` in ${selectedSector}`}</>
              : `No stocks found in ${selectedSector}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
            Try searching by official ticker (e.g. GP, SQURPHARMA) or company name.
          </p>
          <div className="flex items-center flex-wrap justify-center gap-2 mt-2">
            {selectedSector !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedSector('All')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
              >
                Search all sectors
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-5 lg:px-6 py-3.5 font-semibold">Symbol</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right">Price (LTP)</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right">Change</th>
                    <th className="hidden lg:table-cell px-5 lg:px-6 py-3.5 font-semibold text-right">Day Range (H/L)</th>
                    <th className="hidden xl:table-cell px-5 lg:px-6 py-3.5 font-semibold text-right">Volume</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-center">Category</th>
                    <th className="px-5 lg:px-6 py-3.5 font-semibold text-right whitespace-nowrap">Action</th>
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
                      onMarketClosedClick={(sym, type) => handleOpenMarketClosed(`trade_row_${type}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div ref={observerRef} className="h-10 w-full flex items-center justify-center p-4 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-800">
                Loading more…
              </div>
            )}
          </div>

          {/* Mobile Standalone Cards with Grey Resting Zones */}
          <div className="md:hidden space-y-3 px-3.5 sm:px-0">
            {visibleStocks.map((stock) => (
              <MarketRow
                key={stock.symbol}
                stock={stock}
                portfolioItem={portfolioBySymbol.get(stock.symbol)}
                marketOpen={marketOpen}
                onTrade={onTrade}
                onMarketClosedClick={(sym, type) => handleOpenMarketClosed(`market_row_${type}`)}
              />
            ))}

            {hasMore && (
              <div ref={observerRef} className="py-3 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-[#161B22]/80 border border-gray-200/60 dark:border-gray-800/60 rounded-xl shadow-xs">
                Loading more…
              </div>
            )}
          </div>
        </>
      )}

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

      <MarketClosedModal
        isOpen={marketClosedModalOpen}
        onClose={() => setMarketClosedModalOpen(false)}
        holidays={holidays}
        source={marketClosedModalSource}
      />

      {IS_TRADE_POLL_ACTIVE && showSurvey && (
        <TradeQuestionnaireModal onSuccess={handleSurveySuccess} />
      )}
    </div>
  );
}
