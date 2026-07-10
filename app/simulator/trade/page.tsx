'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSimulator } from '@/hooks/useSimulator';
import { useAuth } from '@/contexts/AuthContext';
import { useTradeModal } from '@/hooks/useTradeModal';
import { getUpcomingHolidays } from '@/lib/bangladeshHolidays';
import { searchByNameOrSymbol } from '@/lib/dseCompanyNames';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Activity, Briefcase, Search, ChevronUp } from 'lucide-react';

// Extracted Components
import MarketToolbar from '@/components/simulator/trade/MarketToolbar';
import AccountSummaryCard from '@/components/simulator/trade/AccountSummaryCard';
import MarketRulesCard from '@/components/simulator/trade/MarketRulesCard';
import StockRow from '@/components/simulator/trade/StockRow';
import StockCardMobile from '@/components/simulator/trade/StockCardMobile';
import TradeModal from '@/components/simulator/trade/TradeModal';
import StockSkeleton from '@/components/simulator/trade/StockSkeleton';

const MarketCalendar = dynamic(() => import('@/components/simulator/MarketCalendar'), { ssr: false, loading: () => <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" /> });
const Footer = dynamic(() => import('@/components/shared/Footer'), { ssr: false, loading: () => <div className="h-20" /> });

type TabType = 'market' | 'portfolio';

export default function SimulatorTradePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { marketInfo, simulatorState, loading: simulatorLoading, transactionStatus, transactionMessage, executeTrade, isMarketOpen, resetTransaction, nextUpdateIn } = useSimulator();
  
  const modal = useTradeModal(executeTrade);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [tick, setTick] = useState(0);
  const [holidays, setHolidays] = useState<string[]>([]);
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('market');
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isRedirecting) {
      setIsRedirecting(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', '/simulator/trade');
        sessionStorage.setItem('redirectMessage', 'Please sign in to access the trading simulator');
      }
      router.push('/auth');
    }
  }, [user, authLoading, router, isRedirecting]);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const dataAge = useMemo(() => {
    if (!marketInfo?.lastUpdated) return null;
    const diffMins = Math.max(0, Math.floor((new Date().getTime() - new Date(marketInfo.lastUpdated).getTime()) / 60000));
    return { minutes: diffMins, isStale: diffMins > 5, isWarning: diffMins > 3 && diffMins <= 5 };
  }, [marketInfo?.lastUpdated, tick]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    getUpcomingHolidays().then(setHolidays).catch(() => setHolidays([]));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => { setSearchQuery(searchInput); setVisibleCount(50); });
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const handleTabChange = useCallback((tab: TabType) => {
    startTransition(() => { setActiveTab(tab); setVisibleCount(50); });
  }, []);

  const marketOpen = isMarketOpen();
  const normalizedSearchQuery = useMemo(() => searchQuery.trim(), [searchQuery]);
  const portfolioSymbolsSet = useMemo(() => new Set(simulatorState.portfolio.map(p => p.symbol)), [simulatorState.portfolio]);
  const companyNameMatches = useMemo(() => normalizedSearchQuery && normalizedSearchQuery.length >= 2 ? new Set(searchByNameOrSymbol(normalizedSearchQuery)) : new Set<string>(), [normalizedSearchQuery]);
  const portfolioBySymbol = useMemo(() => new Map(simulatorState.portfolio.map(item => [item.symbol, item])), [simulatorState.portfolio]);
  
  const filteredData = useMemo(() => {
    if (!marketInfo?.stocks) return [];
    if (activeTab === 'market' && !normalizedSearchQuery) return marketInfo.stocks;
    
    let data = marketInfo.stocks;
    if (activeTab === 'portfolio') data = data.filter(s => portfolioSymbolsSet.has(s.symbol));
    if (normalizedSearchQuery) {
      const upperQuery = normalizedSearchQuery.toUpperCase();
      data = data.filter(s => s.symbol.includes(upperQuery) || companyNameMatches.has(s.symbol));
    }
    return data;
  }, [marketInfo?.stocks, activeTab, normalizedSearchQuery, portfolioSymbolsSet]);

  const visibleData = useMemo(() => filteredData.slice(0, visibleCount), [filteredData, visibleCount]);
  const hasMore = filteredData.length > visibleCount;

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount(prev => prev + 50);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [hasMore, visibleData]);

  if (authLoading || isRedirecting || !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center dark:bg-gray-900 gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 text-sm">{authLoading || isRedirecting ? 'Checking authorization...' : 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0E11] text-gray-900 dark:text-gray-100 font-sans pt-20 pb-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dhaka Stock Exchange (DSE) Trading Simulator</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">
            Practice buying and selling DSE stocks with virtual currency. Master trading strategies, learn market mechanics, and build investment confidence—completely risk-free.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4 order-last lg:order-first">
            <MarketToolbar 
               activeTab={activeTab} onTabChange={handleTabChange} marketOpen={marketOpen} 
               nextUpdateIn={nextUpdateIn} searchInput={searchInput} onSearchChange={setSearchInput} 
               searchInputRef={searchInputRef} isPending={isPending} 
            />

            <div className="bg-white dark:bg-[#15191E] rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm min-h-[500px] -mx-4 sm:mx-0">
              
              {simulatorLoading ? (
                <StockSkeleton count={10} />
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <th className="px-5 py-3 font-semibold">Symbol</th>
                          {activeTab === 'portfolio' ? (
                            <>
                              <th className="px-5 py-3 font-semibold text-center">Category</th>
                              <th className="px-5 py-3 font-semibold text-right">Qty</th>
                              <th className="px-5 py-3 font-semibold text-right">Avg Cost</th>
                              <th className="px-5 py-3 font-semibold text-right">LTP</th>
                              <th className="px-5 py-3 font-semibold text-right">Change</th>
                              <th className="px-5 py-3 font-semibold text-right">P&L</th>
                            </>
                          ) : (
                            <>
                              <th className="px-6 py-4 font-semibold text-right">Price (LTP)</th>
                              <th className="px-6 py-4 font-semibold text-right">Change</th>
                              <th className="px-6 py-4 font-semibold text-center">Category</th>
                            </>
                          )}
                          <th className="px-5 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visibleData.length > 0 ? visibleData.map(stock => (
                          <StockRow 
                            key={stock.symbol} stock={stock} 
                            portfolioItem={activeTab === 'portfolio' ? portfolioBySymbol.get(stock.symbol) : undefined}
                            marketOpen={marketOpen} variant={activeTab} onTrade={(sym, type) => modal.openTradeModal(sym, type, resetTransaction)} 
                          />
                        )) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                {activeTab === 'portfolio' ? <Briefcase className="w-8 h-8 opacity-20" /> : <Search className="w-8 h-8 opacity-20" />}
                                <p>{activeTab === 'portfolio' ? 'Your portfolio is empty. Start trading!' : `No stocks found matching "${searchQuery}"`}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {visibleData.length > 0 ? visibleData.map(stock => (
                      <StockCardMobile 
                        key={stock.symbol} stock={stock} 
                        portfolioItem={activeTab === 'portfolio' ? portfolioBySymbol.get(stock.symbol) : undefined}
                        marketOpen={marketOpen} variant={activeTab} onTrade={(sym, type) => modal.openTradeModal(sym, type, resetTransaction)} 
                      />
                    )) : (
                      <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          {activeTab === 'portfolio' ? <Briefcase className="w-8 h-8 opacity-20" /> : <Search className="w-8 h-8 opacity-20" />}
                          <p>{activeTab === 'portfolio' ? 'Your portfolio is empty. Start trading!' : `No stocks found matching "${searchQuery}"`}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Invisible Observer Sentinel Element */}
                  {hasMore && (
                    <div ref={observerTarget} className="h-10 w-full flex items-center justify-center p-4 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/20">
                      Loading more...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 order-first lg:order-last">
            <AccountSummaryCard simulatorState={simulatorState} marketOpen={marketOpen} />
            <MarketCalendar holidays={holidays} />
            <MarketRulesCard />
          </div>
        </div>
      </div>

      {modal.showTradeModal && modal.selectedStock && (
        <TradeModal 
          selectedStock={modal.selectedStock} tradeType={modal.tradeType} setTradeType={modal.setTradeType}
          tradeQuantity={modal.tradeQuantity} setTradeQuantity={modal.setTradeQuantity}
          tradeQuantityInput={modal.tradeQuantityInput} setTradeQuantityInput={modal.setTradeQuantityInput}
          onClose={modal.closeTradeModal} onExecute={modal.handleExecuteModalTrade}
          marketInfo={marketInfo} simulatorState={simulatorState} marketOpen={marketOpen}
          transactionStatus={transactionStatus} transactionMessage={transactionMessage} resetTransaction={resetTransaction}
        />
      )}

      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          aria-label="Scroll to top" title="Scroll to top"
          className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 pb-safe"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}

      <div className="mt-20"><Footer /></div>
    </div>
  );
}