'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSimulator } from '@/hooks/useSimulator';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getUpcomingHolidays } from '@/lib/bangladeshHolidays';
import { getCompanyName, searchByNameOrSymbol } from '@/lib/dseCompanyNames';
import { 
  TrendingUp, TrendingDown, Search, Activity, 
  Briefcase, ArrowUpRight, ArrowDownRight, RefreshCw, X, ChevronUp,
  Plus, Minus, AlertCircle, Clock
} from 'lucide-react';

const MarketCalendar = dynamic(() => import('@/components/simulator/MarketCalendar'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />,
});

const Footer = dynamic(() => import('@/components/shared/Footer'), {
  ssr: false,
  loading: () => <div className="h-20" />,
});

type TabType = 'market' | 'portfolio';

// Helper function to get category color and styling
const getCategoryColor = (category?: string) => {
  switch(category) {
    case 'A':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-300',
        badge: 'bg-green-500/10 text-green-700 dark:text-green-300'
      };
    case 'B':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
      };
    case 'N':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      };
    case 'Z':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-300',
        badge: 'bg-red-500/10 text-red-700 dark:text-red-300'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-500 dark:text-gray-400',
        badge: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
      };
  }
};

export default function SimulatorTradePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    marketInfo, simulatorState, loading: simulatorLoading, 
    transactionStatus, transactionMessage, 
    executeTrade, isMarketOpen, resetTransaction 
  } = useSimulator();
  
  const handleBuyTrade = async (symbol: string, quantity: number) => {
    return executeTrade(symbol, 'BUY', quantity);
  };

  const handleSellTrade = async (symbol: string, quantity: number) => {
    return executeTrade(symbol, 'SELL', quantity);
  };
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  useEffect(() => {
    // Wait for auth state to be determined
    if (authLoading) return;
    
    // If not logged in, redirect to auth page
    if (!user && !isRedirecting) {
      setIsRedirecting(true);
      // Store the current path for redirect after login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', '/simulator/trade');
        sessionStorage.setItem('redirectMessage', 'Please sign in to access the trading simulator');
      }
      router.push('/auth');
    }
  }, [user, authLoading, router, isRedirecting]);
  
  // Scroll to top button state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  
  // Periodic tick to keep dataAge fresh (re-renders every 30s)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Stale data indicator - recalculates on tick or when lastUpdated changes
  const dataAge = useMemo(() => {
    if (!marketInfo?.lastUpdated) return null;
    const lastUpdate = new Date(marketInfo.lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    // Use Math.max(0, ...) to prevent negative values from clock skew
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return {
      minutes: diffMins,
      isStale: diffMins > 5,
      isWarning: diffMins > 3 && diffMins <= 5
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketInfo?.lastUpdated, tick]);

  // Track scroll position for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const [holidays, setHolidays] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('market');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<number | ''>(1);
  const [tradeQuantityInput, setTradeQuantityInput] = useState('1');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  // Reset visible count when tab or search changes
  const handleTabChange = useCallback((tab: TabType) => {
    startTransition(() => {
      setActiveTab(tab);
      setVisibleCount(50);
    });
  }, []);

  // Debounce search updates to keep typing responsive on large stock lists.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setSearchQuery(searchInput);
        setVisibleCount(50);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, startTransition]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (tradeQuantityInput === '') {
        startTransition(() => setTradeQuantity(''));
        return;
      }

      const parsed = parseInt(tradeQuantityInput, 10);
      startTransition(() => {
        if (!isNaN(parsed) && parsed >= 0) {
          setTradeQuantity(parsed || '');
        }
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [tradeQuantityInput, startTransition]);

  // Load holidays on component mount
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const upcomingHolidays = await getUpcomingHolidays();
        setHolidays(upcomingHolidays);
      } catch (error) {
        console.error('Failed to load holidays:', error);
        // Continue with empty holidays array if API fails
        setHolidays([]);
      }
    };

    loadHolidays();
  }, []);

  const marketOpen = isMarketOpen();
  const deferredTradeQuantity = useDeferredValue(tradeQuantity);

  const stockBySymbol = useMemo(
    () => new Map((marketInfo?.stocks || []).map(stock => [stock.symbol, stock])),
    [marketInfo?.stocks]
  );

  const portfolioBySymbol = useMemo(
    () => new Map(simulatorState.portfolio.map(item => [item.symbol, item])),
    [simulatorState.portfolio]
  );

  // --- Optimized Filtering Logic with Company Name Search ---
  // Memoize search query for efficient filtering
  const normalizedSearchQuery = useMemo(() => searchQuery.trim(), [searchQuery]);
  
  // Memoize portfolio symbols set for O(1) lookup
  const portfolioSymbolsSet = useMemo(
    () => new Set(simulatorState.portfolio.map(p => p.symbol)),
    [simulatorState.portfolio]
  );
  
  // Get matching symbols from company name search (memoized)
  const companyNameMatches = useMemo(() => {
    if (!normalizedSearchQuery || normalizedSearchQuery.length < 2) return new Set<string>();
    return new Set(searchByNameOrSymbol(normalizedSearchQuery));
  }, [normalizedSearchQuery]);
  
  const filteredData = useMemo(() => {
    if (!marketInfo?.stocks) return [];
    
    // Fast path: if no filters, return all stocks
    if (activeTab === 'market' && !normalizedSearchQuery) {
      return marketInfo.stocks;
    }
    
    // Apply filters in optimal order (most restrictive first)
    let data = marketInfo.stocks;
    
    // Portfolio filter (typically more restrictive)
    if (activeTab === 'portfolio') {
      data = data.filter(s => portfolioSymbolsSet.has(s.symbol));
    }
    
    // Search filter: matches symbol OR company name
    if (normalizedSearchQuery) {
      const upperQuery = normalizedSearchQuery.toUpperCase();
      data = data.filter(s => 
        s.symbol.includes(upperQuery) || companyNameMatches.has(s.symbol)
      );
    }

    return data;
  }, [marketInfo?.stocks, activeTab, normalizedSearchQuery, portfolioSymbolsSet]);

  // Paginate: only render visible items for performance
  const visibleData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);
  const hasMore = filteredData.length > visibleCount;

  const tradeSummary = useMemo(() => {
    const qty = typeof deferredTradeQuantity === 'number' && deferredTradeQuantity > 0 ? deferredTradeQuantity : 0;
    const selectedStockData = selectedStock ? stockBySymbol.get(selectedStock) : undefined;
    const stockPrice = selectedStockData?.ltp || 0;
    const subtotal = stockPrice * qty;
    const commission = Math.round(subtotal * 0.003 * 100) / 100;
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
      qty,
      stockPrice,
      subtotal,
      commission,
      total,
      availableBalance,
      canAfford,
      holdingQty,
      canSellQty,
      shortage,
      canSell,
      isDisabled:
        transactionStatus === 'processing' ||
        !marketOpen ||
        qty <= 0 ||
        (tradeType === 'buy' && !canAfford) ||
        (tradeType === 'sell' && (!canSellQty || !canSell)),
    };
  }, [deferredTradeQuantity, selectedStock, stockBySymbol, tradeType, simulatorState.balance, portfolioBySymbol, transactionStatus, marketOpen]);

  // --- Handlers ---
  const openTradeModal = (symbol: string, type: 'buy' | 'sell') => {
    setSelectedStock(symbol);
    setTradeType(type);
    setTradeQuantity(1);
    setTradeQuantityInput('1');
    resetTransaction();
    setShowTradeModal(true);
  };

  const handleExecuteModalTrade = async () => {
    if (!selectedStock || tradeQuantity === '' || tradeQuantity <= 0) return;
    if (tradeType === 'buy') await handleBuyTrade(selectedStock, tradeQuantity);
    else await handleSellTrade(selectedStock, tradeQuantity);
  };

  // Show loading spinner while checking auth or redirecting
  if (authLoading || isRedirecting || !user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center dark:bg-gray-900 gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isRedirecting ? 'Redirecting to login...' : 'Loading...'}
        </p>
      </div>
    );
  }
  
  // Show loading while simulator data is being fetched
  if (simulatorLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center dark:bg-gray-900 gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading market data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0E11] text-gray-900 dark:text-gray-100 font-sans pt-20">
      {/* Enhanced Schema Markup for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'StockSimulatorBD DSE Stock Market Simulator',
          description: 'Practice buying & selling DSE stocks with real-time data. Zero risk, real learning. Perfect for beginners.',
          url: 'https://www.stocksimulator.tech/simulator',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'BDT',
            description: 'Completely free forever'
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '5',
            ratingCount: '100'
          },
          author: {
            '@type': 'Organization',
            name: 'StockSimulatorBD',
            url: 'https://www.stocksimulator.tech'
          },
          featureList: [
            'Real-time DSE stock data',
            'Virtual trading portfolio',
            'Buy and sell stocks risk-free',
            'Bangladesh market holidays calendar',
            'Live price tracking',
            'Trading history',
            'Portfolio performance tracking'
          ]
        })}
      </script>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dhaka Stock Exchange (DSE) Trading Simulator</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">
            Practice buying and selling DSE stocks with virtual currency. Master trading strategies, learn market mechanics, and build investment confidence—completely risk-free with realistic market data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Main Ticker (8 cols) - Shows second on mobile */}
          <div className="lg:col-span-8 space-y-4 order-last lg:order-first">
            
            {/* Toolbar - Professional Console Layout - Sticky on Mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white/95 dark:bg-[#15191E]/95 backdrop-blur-xl p-3 sm:p-2.5 -mx-4 sm:mx-0 px-4 sm:px-2.5 rounded-none sm:rounded-2xl border-y sm:border border-gray-200 dark:border-gray-800 shadow-md sm:shadow-sm sticky top-[60px] z-40 sm:z-30">
              {/* Top Row on Mobile: Tabs + Status */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Tabs Group */}
                <div className="flex items-center gap-1 sm:gap-2 h-12 sm:h-14 bg-gray-50 dark:bg-gray-900/50 p-1 sm:p-1.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                  {(['market', 'portfolio'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`px-3 sm:px-5 h-full text-xs sm:text-sm font-bold rounded-lg sm:rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2.5 ${
                        activeTab === tab 
                        ? 'bg-white dark:bg-[#1E2329] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      {tab === 'market' ? <Activity className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                      <span className="capitalize hidden sm:inline">{tab}</span>
                    </button>
                  ))}
                </div>

                {/* Market Status Widget */}
                <div className={`flex flex-col justify-center px-3 sm:px-6 h-12 sm:h-14 rounded-xl transition-all border shadow-sm flex-1 sm:flex-none sm:min-w-[170px] ${
                  marketOpen 
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-500/50 shadow-emerald-500/20' 
                    : 'bg-gradient-to-br from-rose-600 to-rose-700 text-white border-rose-500/50 shadow-rose-500/20'
                }`}>
                  <div className="flex items-center gap-1.5 sm:gap-2.5 mb-0.5">
                    <div className={`w-2 h-2 rounded-full ring-2 ring-white/20 flex-shrink-0 ${marketOpen ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/60'}`}></div>
                    <span className="text-xs sm:text-sm font-bold tracking-tight truncate">{marketOpen ? 'OPEN' : 'CLOSED'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-white/90">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/80 flex-shrink-0" />
                    <span className="truncate">{dataAge?.minutes || 0}m ago</span>
                  </div>
                </div>
              </div>

              {/* Search Bar - Full width on mobile */}
              <div className="relative h-10 sm:h-14 w-full sm:w-auto sm:flex-1 sm:max-w-xs sm:min-w-[180px] sm:ml-auto">
                <div 
                  className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 cursor-text"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search companies..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full h-full pl-9 sm:pl-10 pr-3 sm:pr-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-gray-400"
                />
                {isPending && (
                  <div className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-blue-500">
                    Updating...
                  </div>
                )}
              </div>
            </div>

            {/* Data Table - Desktop | Cards - Mobile (Edge-to-edge) */}
            <div className="bg-white dark:bg-[#15191E] rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm min-h-[500px] -mx-4 sm:mx-0">
              
              {/* === PORTFOLIO TAB === */}
              {activeTab === 'portfolio' ? (
                <>
                  {/* Desktop Portfolio Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <th className="px-5 py-3 font-semibold">Symbol</th>
                          <th className="px-5 py-3 font-semibold text-center">Category</th>
                          <th className="px-5 py-3 font-semibold text-right">Qty</th>
                          <th className="px-5 py-3 font-semibold text-right">Avg Cost</th>
                          <th className="px-5 py-3 font-semibold text-right">LTP</th>
                          <th className="px-5 py-3 font-semibold text-right">Change</th>
                          <th className="px-5 py-3 font-semibold text-right">P&L</th>
                          <th className="px-5 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {visibleData.length > 0 ? visibleData.map((stock) => {
                          const isUp = stock.change >= 0;
                          const portfolioItem = portfolioBySymbol.get(stock.symbol);
                          if (!portfolioItem) return null;
                          const avgCost = portfolioItem.averageBuyPrice;
                          const currentValue = stock.ltp * portfolioItem.quantity;
                          const investedValue = avgCost * portfolioItem.quantity;
                          const pnl = currentValue - investedValue;
                          const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
                          const isPnlUp = pnl >= 0;
                          const companyName = getCompanyName(stock.symbol);
                          
                          return (
                            <tr key={stock.symbol} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">{stock.symbol}</span>
                                  {companyName && (
                                    <span className="text-[10px] text-gray-400 truncate max-w-[180px]" title={companyName}>{companyName}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {stock.category ? (
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getCategoryColor(stock.category).badge}`}>
                                    {stock.category}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{portfolioItem.quantity}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <span className="font-mono text-gray-700 dark:text-gray-300">৳{avgCost.toFixed(2)}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">৳{stock.ltp.toFixed(2)}</span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className={`inline-flex flex-col items-end ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  <span className="font-mono font-bold text-xs flex items-center gap-0.5">
                                    {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className={`inline-flex flex-col items-end ${isPnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  <span className="font-mono font-bold text-sm">
                                    {isPnlUp ? '+' : ''}৳{pnl.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] font-mono opacity-80">
                                    {isPnlUp ? '+' : ''}{pnlPercent.toFixed(2)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <Link 
                                    href={`/stocks/${stock.symbol}`}
                                    className="px-3 py-1.5 rounded text-xs font-semibold transition-all bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white"
                                  >
                                    Chart
                                  </Link>
                                  <button 
                                    onClick={() => openTradeModal(stock.symbol, 'buy')}
                                    disabled={!marketOpen}
                                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                      marketOpen 
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white cursor-pointer' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    Buy
                                  </button>
                                  <button 
                                    onClick={() => openTradeModal(stock.symbol, 'sell')}
                                    disabled={!marketOpen}
                                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                      marketOpen 
                                        ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white cursor-pointer' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    Sell
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <Briefcase className="w-8 h-8 opacity-20" />
                                <p>Your portfolio is empty. Start trading!</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Portfolio Cards */}
                  <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {visibleData.length > 0 ? visibleData.map((stock) => {
                      const isUp = stock.change >= 0;
                      const portfolioItem = portfolioBySymbol.get(stock.symbol);
                      if (!portfolioItem) return null;
                      const avgCost = portfolioItem.averageBuyPrice;
                      const currentValue = stock.ltp * portfolioItem.quantity;
                      const investedValue = avgCost * portfolioItem.quantity;
                      const pnl = currentValue - investedValue;
                      const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
                      const isPnlUp = pnl >= 0;
                      const companyName = getCompanyName(stock.symbol);

                      return (
                        <div key={stock.symbol} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          {/* Row 1: Symbol + Category + LTP + Today's change */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-base text-gray-900 dark:text-gray-100">{stock.symbol}</span>
                                {stock.category && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(stock.category).badge}`}>
                                    {stock.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                                  {portfolioItem.quantity} shares
                                </span>
                              </div>
                              {companyName && (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{companyName}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-bold text-base text-gray-900 dark:text-white">৳{stock.ltp.toFixed(2)}</div>
                              <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Row 2: Avg Cost + P&L */}
                          <div className="flex items-center justify-between mb-3 py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                            <div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Avg Cost</span>
                              <div className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">৳{avgCost.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">P&L</span>
                              <div className={`font-mono text-sm font-bold ${isPnlUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isPnlUp ? '+' : ''}৳{pnl.toFixed(2)} 
                                <span className="text-[10px] font-medium ml-1">({isPnlUp ? '+' : ''}{pnlPercent.toFixed(1)}%)</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Row 3: Actions */}
                          <div className="flex gap-2">
                            <Link 
                              href={`/stocks/${stock.symbol}`}
                              className="flex items-center justify-center px-4 py-2 rounded-lg text-sm font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            >
                              Chart
                            </Link>
                            <button 
                              onClick={() => openTradeModal(stock.symbol, 'buy')}
                              disabled={!marketOpen}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                marketOpen 
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Buy
                            </button>
                            <button 
                              onClick={() => openTradeModal(stock.symbol, 'sell')}
                              disabled={!marketOpen}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                                marketOpen 
                                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Briefcase className="w-8 h-8 opacity-20" />
                          <p>Your portfolio is empty. Start trading!</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {hasMore && (
                    <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => setVisibleCount(c => c + 50)} className="px-6 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
                        Show More ({filteredData.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              ) : (
              <>
              {/* === MARKET TAB === */}
              {/* Desktop Table View */}
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
                    {visibleData.length > 0 ? visibleData.map((stock) => {
                      const isUp = stock.change >= 0;
                      const companyName = getCompanyName(stock.symbol);
                      return (
                        <tr 
                          key={stock.symbol} 
                          className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-500 transition-colors">{stock.symbol}</span>
                              {companyName && (
                                <span className="text-[10px] text-gray-400 truncate max-w-[200px]" title={companyName}>
                                  {companyName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                              ৳{stock.ltp.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex flex-col items-end ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                              <span className="font-mono font-bold text-xs flex items-center gap-1">
                                {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              </span>
                              <span className="text-[10px] opacity-70">
                                {isUp ? '+' : ''}৳{stock.change.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {stock.category ? (
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getCategoryColor(stock.category).badge}`}>
                                {stock.category}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link 
                                href={`/stocks/${stock.symbol}`}
                                className="px-3 py-1.5 rounded text-xs font-semibold transition-all bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white"
                              >
                                Chart
                              </Link>
                              <button 
                                onClick={() => openTradeModal(stock.symbol, 'buy')}
                                disabled={!marketOpen}
                                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                  marketOpen 
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white cursor-pointer' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Buy
                              </button>
                              <button 
                                onClick={() => openTradeModal(stock.symbol, 'sell')}
                                disabled={!marketOpen}
                                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                  marketOpen 
                                    ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white cursor-pointer' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p>No stocks found matching &quot;{searchQuery}&quot;</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {visibleData.length > 0 ? visibleData.map((stock) => {
                  const isUp = stock.change >= 0;
                  const companyName = getCompanyName(stock.symbol);
                  
                  return (
                    <div key={stock.symbol} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Top Row: Symbol, Price, Change, Category */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{stock.symbol}</span>
                            {stock.category && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(stock.category).badge}`}>
                                {stock.category}
                              </span>
                            )}
                          </div>
                          {companyName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{companyName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                            ৳{stock.ltp.toFixed(2)}
                          </div>
                          <div className={`flex items-center justify-end gap-1 text-sm font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Row: Action Buttons */}
                      <div className="flex gap-2">
                        <Link 
                          href={`/stocks/${stock.symbol}`}
                          className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold transition-all bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                        >
                          Chart
                        </Link>
                        <button 
                          onClick={() => openTradeModal(stock.symbol, 'buy')}
                          disabled={!marketOpen}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            marketOpen 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Buy
                        </button>
                        <button 
                          onClick={() => openTradeModal(stock.symbol, 'sell')}
                          disabled={!marketOpen}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            marketOpen 
                              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>No stocks found matching &quot;{searchQuery}&quot;</p>
                    </div>
                  </div>
                )}
              </div>
              {hasMore && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => setVisibleCount(c => c + 50)} className="px-6 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors">
                    Show More ({filteredData.length - visibleCount} remaining)
                  </button>
                </div>
              )}
              </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (4 cols) - Shows first on mobile */}
          <div className="lg:col-span-4 space-y-6 order-first lg:order-last">
            
            {/* Account Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-none sm:rounded-xl p-4 sm:p-6 text-white shadow-md sm:shadow-lg relative overflow-hidden -mx-4 sm:mx-0">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              
              {/* Title and Brand */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-blue-100 text-[10px] sm:text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  DSE Terminal
                </h3>
                <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:py-1 rounded-full ${marketOpen ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                  {marketOpen ? '● Live' : '○ Closed'}
                </span>
              </div>

              {/* Net Equity (Total Account Value) */}
              <div className="mb-3 sm:mb-4 flex sm:block items-end justify-between">
                <div>
                  <div className="text-blue-200 text-[10px] uppercase mb-0.5 sm:mb-1">Net Equity</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight">
                    ৳{(simulatorState.balance + simulatorState.totalCurrentValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                {/* On mobile, show Buying Power directly here */}
                <div className="sm:hidden text-right">
                  <div className="text-blue-200 text-[10px] uppercase mb-0.5">Buying Power</div>
                  <div className="font-mono font-semibold text-lg text-emerald-300">
                    ৳{simulatorState.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
              
              {/* Key Stats Grid */}
              <div className="hidden sm:grid grid-cols-2 gap-3 pt-4 border-t border-white/20 mb-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-200 text-[10px] uppercase">Buying Power</div>
                  <div className="font-mono font-semibold text-lg">৳{simulatorState.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-200 text-[10px] uppercase">Total Invested</div>
                  <div className="font-mono font-semibold text-lg">৳{simulatorState.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-200 text-[10px] uppercase">Portfolio Value</div>
                  <div className="font-mono font-semibold text-lg">৳{simulatorState.totalCurrentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-200 text-[10px] uppercase">Total Return</div>
                  <div className={`font-mono font-semibold text-lg flex items-center gap-1 ${simulatorState.totalGainLoss >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {simulatorState.totalGainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {simulatorState.gainLossPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Gain/Loss Breakdown */}
              {(() => {
                const realized = simulatorState.realizedGainLoss || 0;
                const unrealized = simulatorState.totalGainLoss;
                const net = realized + unrealized;
                return (
                  <div className="hidden sm:block space-y-2 mb-4">
                    <div className="bg-white/10 rounded-lg px-3 py-2.5 flex justify-between items-center">
                      <span className="text-blue-200 text-[10px] uppercase">Realized P&L</span>
                      <span className={`font-mono font-bold text-sm ${realized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {realized >= 0 ? '+' : ''}৳{realized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white/10 rounded-lg px-3 py-2.5 flex justify-between items-center">
                      <span className="text-blue-200 text-[10px] uppercase">Unrealized P&L</span>
                      <span className={`font-mono font-bold text-sm ${unrealized >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {unrealized >= 0 ? '+' : ''}৳{unrealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-white/15 rounded-lg px-3 py-2.5 flex justify-between items-center border border-white/10">
                      <span className="text-white text-[10px] uppercase font-semibold">Net Gain/Loss</span>
                      <span className={`font-mono font-bold text-base flex items-center gap-1 ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {net >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {net >= 0 ? '+' : ''}৳{Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <p className="text-blue-200 text-[10px] mb-4">*Simulated with Coins (1 Coin = 1 BDT, virtual currency for educational purposes)</p>
              
              {/* Add Credit Button */}
              <button
                onClick={() => router.push('/coins')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-sm transition-all duration-200 border border-white/30 hover:border-white/50"
              >
                <span>+</span>
                <span>Add Credit</span>
              </button>
            </div>

            {/* Market Calendar Widget */}
            <MarketCalendar holidays={holidays} />

            {/* Quick Tips */}
            <div className="bg-white dark:bg-[#15191E] rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Market Rules
              </h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                  Trading hours: 10:00 AM - 2:15 PM (Sun-Thu).
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <span><strong>0.3% Commission</strong> charged on all buy/sell orders.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                  <span><strong>T+1 Rule:</strong> Cannot sell shares on same day of purchase.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                  Prices delayed by 1-5 mins for free tier.
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Modern Trade Modal */}
      {showTradeModal && selectedStock && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`${
            transactionStatus === 'success'
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
              : transactionStatus === 'error'
              ? 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/50'
              : tradeType === 'buy'
              ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
              : 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-800/50'
          } w-full max-w-md rounded-t-[32px] sm:rounded-2xl shadow-2xl shadow-black/50 border-t sm:border transform transition-all overflow-hidden flex flex-col mt-auto sm:mt-0 pb-0 sm:pb-0 max-h-[90vh] sm:max-h-none`}>
            
            {/* Drag Handle for Mobile */}
            <div className="w-full flex justify-center pt-4 pb-2 sm:hidden cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/80 rounded-full"></div>
            </div>

            {/* Transaction Result View */}
            {(transactionStatus === 'success' || transactionStatus === 'error') ? (
              <div className="p-5 sm:p-6 text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  transactionStatus === 'success' 
                    ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                    : 'bg-red-100 dark:bg-red-900/40'
                }`}>
                  {transactionStatus === 'success' 
                    ? <ArrowUpRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    : <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  }
                </div>
                <h3 className={`text-base font-bold mb-1 ${
                  transactionStatus === 'success' 
                    ? 'text-emerald-700 dark:text-emerald-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {transactionStatus === 'success' ? 'Order Executed' : 'Order Failed'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  {transactionMessage}
                </p>
                <button
                  onClick={() => { resetTransaction(); setShowTradeModal(false); }}
                  className={`w-full py-2.5 rounded-xl text-white font-bold text-sm transition-all ${
                    transactionStatus === 'success'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Modal Header - Compact */}
                <div className={`px-4 sm:px-5 py-3 flex justify-between items-center border-b ${
                  tradeType === 'buy'
                    ? 'bg-emerald-500/20 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-rose-500/20 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className={`text-base font-bold ${
                        tradeType === 'buy' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                      }`}>{selectedStock}</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        ৳{tradeSummary.stockPrice.toFixed(2)}
                      </p>
                    </div>
                    {/* Inline balance/holdings badge */}
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
                  <button 
                    onClick={() => setShowTradeModal(false)}
                    aria-label="Close modal"
                    title="Close"
                    className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Type Selector */}
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900/30 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setTradeType('buy')}
                      className={`py-2 text-sm font-bold rounded-md transition-all ${
                        tradeType === 'buy' 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeType('sell')}
                      className={`py-2 text-sm font-bold rounded-md transition-all ${
                        tradeType === 'sell' 
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* T+1 Warning (sell only, compact) */}
                  {tradeType === 'sell' && (() => {
                    const holding = selectedStock ? portfolioBySymbol.get(selectedStock) : undefined;
                    const canSell = !holding || (new Date(holding.purchaseDate).toDateString() !== new Date().toDateString());
                    if (canSell) return null;
                    return (
                      <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">Cannot sell on same day (T+1 Rule)</p>
                      </div>
                    );
                  })()}

                  {/* Quantity Input - Compact */}
                  <div>
                    <label htmlFor="trade-quantity" className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Quantity</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const currentQty = typeof tradeQuantity === 'number' ? tradeQuantity : 1;
                          const nextQty = Math.max(1, currentQty - 1);
                          setTradeQuantity(nextQty);
                          setTradeQuantityInput(String(nextQty));
                        }}
                        disabled={tradeQuantity !== '' && tradeQuantity <= 1}
                        aria-label="Decrease quantity"
                        title="Decrease quantity"
                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        <Minus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                      
                      <input 
                        id="trade-quantity"
                        aria-label="Trade quantity"
                        title="Trade quantity"
                        type="number" 
                        min="1"
                        value={tradeQuantityInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') return setTradeQuantityInput('');
                          const normalized = raw.replace(/[^0-9]/g, '');
                          setTradeQuantityInput(normalized);
                        }}
                        onBlur={() => {
                          if (tradeQuantity === '' || tradeQuantity <= 0) {
                            setTradeQuantity(1);
                            setTradeQuantityInput('1');
                          }
                        }}
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-center text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      
                      <button
                        onClick={() => {
                          const nextQty = (typeof tradeQuantity === 'number' && tradeQuantity > 0 ? tradeQuantity : 0) + 1;
                          setTradeQuantity(nextQty);
                          setTradeQuantityInput(String(nextQty));
                        }}
                        aria-label="Increase quantity"
                        title="Increase quantity"
                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      >
                        <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>

                  {/* Cost Breakdown - Compact */}
                  {(
                      <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">৳{tradeSummary.stockPrice.toFixed(2)} × {tradeSummary.qty}</span>
                          <span className="font-mono text-gray-900 dark:text-white">
                            ৳{tradeSummary.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Commission (0.3%)</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400">
                            {tradeType === 'buy' ? '+' : '-'}৳{tradeSummary.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {tradeType === 'buy' ? 'Total Cost' : 'You Receive'}
                          </span>
                          <span className={`text-base font-bold font-mono ${
                            tradeType === 'buy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            ৳{tradeSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Warnings */}
                        {tradeType === 'buy' && !tradeSummary.canAfford && tradeSummary.shortage > 0 && (
                          <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800/50">
                            Insufficient balance. Need ৳{tradeSummary.shortage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.
                          </div>
                        )}
                        
                        {tradeType === 'sell' && !tradeSummary.canSellQty && tradeSummary.qty > 0 && (
                          <div className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-200 dark:border-red-800/50">
                            You only have {tradeSummary.holdingQty} shares available.
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Submit Button - Fixed at Bottom */}
                <div className="px-4 sm:px-5 py-4 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/20 pb-8 sm:pb-3">
                  {(
                      <button
                        onClick={handleExecuteModalTrade}
                        disabled={tradeSummary.isDisabled}
                        className={`w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${
                          !marketOpen ? 'bg-gray-400 cursor-not-allowed' :
                          tradeSummary.isDisabled ? 'bg-gray-400 cursor-not-allowed opacity-60' :
                          tradeType === 'buy' 
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/30' 
                          : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 shadow-rose-500/30'
                        }`}
                      >
                        {transactionStatus === 'processing' 
                          ? <RefreshCw className="w-4 h-4 animate-spin" /> 
                          : tradeType === 'buy' ? 'Confirm Buy' : 'Confirm Sell'
                        }
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ChevronUp className="w-6 h-6" aria-hidden="true" />
        </button>
      )}

      <div className="mt-20">
        <Footer />
      </div>
    </div>
  );
}
