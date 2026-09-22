'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, BarChart2 } from 'lucide-react';
import { DseStock } from '@/lib/dseStocks';
import { searchByNameOrSymbol } from '@/lib/dseCompanyNames';

export default function StockGrid({ initialStocks }: { initialStocks: DseStock[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | null>(null);

  // Restore scroll position and search query when returning from an individual stock page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedStr = sessionStorage.getItem('ssbd_stocks_grid_state');
    if (!savedStr) return;

    let tHighlight: ReturnType<typeof setTimeout> | undefined;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    try {
      const saved = JSON.parse(savedStr);
      // Valid within 4 hours
      if (Date.now() - (saved.timestamp || 0) < 4 * 60 * 60 * 1000) {
        if (saved.searchQuery) {
          setSearchQuery(saved.searchQuery);
        }

        if (saved.symbol) {
          setHighlightedSymbol(saved.symbol);
          tHighlight = setTimeout(() => setHighlightedSymbol(null), 2500);

          const performScroll = () => {
            const el = document.getElementById(`stock-card-${saved.symbol}`);
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' });
              return true;
            }
            if (saved.scrollY > 0) {
              window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
            }
            return false;
          };

          // Execute in multiple phases for iOS Safari layout completion
          performScroll();
          requestAnimationFrame(() => performScroll());
          t1 = setTimeout(performScroll, 60);
          t2 = setTimeout(performScroll, 180);
          t3 = setTimeout(performScroll, 400);
        } else if (saved.scrollY > 0) {
          window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
        }
      }
    } catch (e) {
      console.warn('Failed to restore StockGrid state:', e);
    }

    return () => {
      if (tHighlight) clearTimeout(tHighlight);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, []);

  const handleStockClick = (symbol: string) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('ssbd_last_stock_source', '/stocks');
    sessionStorage.setItem(
      'ssbd_stocks_grid_state',
      JSON.stringify({
        searchQuery,
        scrollY: window.scrollY,
        symbol: symbol.toLowerCase(),
        timestamp: Date.now(),
      })
    );
  };

  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return initialStocks;
    const rankedMatches = searchByNameOrSymbol(q);
    const rankMap = new Map(rankedMatches.map((sym, idx) => [sym, idx]));
    const upper = q.toUpperCase();

    return initialStocks
      .filter((s) => s.symbol.includes(upper) || rankMap.has(s.symbol))
      .sort((a, b) => {
        const rankA = rankMap.has(a.symbol) ? rankMap.get(a.symbol)! : 1000;
        const rankB = rankMap.has(b.symbol) ? rankMap.get(b.symbol)! : 1000;
        if (rankA !== rankB) return rankA - rankB;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [initialStocks, searchQuery]);

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative max-w-lg mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            aria-label="Search stocks by symbol or name" // Added for accessibility
            placeholder="Search symbol or name (e.g. GP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-[#1A1F26] border border-gray-200 dark:border-gray-700 shadow-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg"
          />
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-500" /> 
            Full List ({filteredStocks.length})
          </h2>
        </div>

        {filteredStocks.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#1A1F26] rounded-2xl border border-gray-100 dark:border-gray-800">
            <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900 dark:text-white">No stocks found matching &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try searching by official ticker (e.g. GP, SQURPHARMA) or company name</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredStocks.map((stock) => {
              const isHighlighted = highlightedSymbol === stock.symbol.toLowerCase();
              return (
                <Link
                  id={`stock-card-${stock.symbol.toLowerCase()}`}
                  key={stock.symbol}
                  href={`/stocks/${stock.symbol.toLowerCase()}`}
                  onClick={() => handleStockClick(stock.symbol)}
                  className={`group p-4 bg-white dark:bg-[#1A1F26] rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1 ${
                    isHighlighted
                      ? 'border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/25 dark:ring-blue-400/25 bg-blue-50/60 dark:bg-blue-950/30 shadow-md scale-[1.02]'
                      : 'border-gray-100 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  <div className="font-extrabold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {stock.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {stock.name || 'Company Name'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}