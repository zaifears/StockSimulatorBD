'use client';

// components/stocks/StockBackButton.tsx
// Prominent, mobile-optimized back button for individual stock pages (/stocks/[symbol]).
// Safely returns user to their previous list (DSE Stock Directory, Trade Market, or Portfolio)
// while preserving their exact scroll position and filters.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface StockBackButtonProps {
  symbol?: string;
  className?: string;
}

export default function StockBackButton({ symbol, className = '' }: StockBackButtonProps) {
  const router = useRouter();
  const [backDestination, setBackDestination] = useState<'stocks' | 'trade' | 'portfolio' | 'default'>('stocks');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect where user came from using sessionStorage or document.referrer
    const storedSource = sessionStorage.getItem('ssbd_last_stock_source');
    const referrer = document.referrer || '';

    if (storedSource === '/trade' || referrer.includes('/trade')) {
      setBackDestination('trade');
    } else if (storedSource === '/portfolio' || referrer.includes('/portfolio')) {
      setBackDestination('portfolio');
    } else {
      setBackDestination('stocks');
    }

    // Track scroll to display mobile floating pill when user scrolls down
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getLabel = () => {
    switch (backDestination) {
      case 'trade':
        return 'Back to Trading Floor';
      case 'portfolio':
        return 'Back to Portfolio';
      case 'stocks':
      default:
        return 'Back to Stock List';
    }
  };

  const handleBack = () => {
    if (typeof window === 'undefined') return;

    // If history is available from the same host, use native history back to preserve cache & position
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
      return;
    }

    // Fallback: check stored source or default route
    const storedSource = sessionStorage.getItem('ssbd_last_stock_source');
    if (storedSource && storedSource !== window.location.pathname) {
      router.push(storedSource);
    } else if (backDestination === 'trade') {
      router.push('/trade');
    } else {
      router.push('/stocks');
    }
  };

  const label = getLabel();

  return (
    <>
      {/* Primary Top Bar Back Button (Above breadcrumb / header) */}
      <div className={`flex items-center justify-between gap-3 mb-4 ${className}`}>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/90 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-xs border border-gray-200/70 dark:border-gray-700/70 min-h-[44px]"
          aria-label={label}
        >
          <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{label}</span>
        </button>

        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium hidden xs:inline">
          Preserves your exact spot
        </span>
      </div>

      {/* iPhone Floating Quick-Back Pill (Appears when scrolled down on mobile) */}
      {isScrolled && (
        <aside
          aria-label="Quick back to previous list"
          className="sm:hidden fixed top-20 left-3.5 z-40 animate-fade-in pointer-events-auto"
        >
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 dark:bg-[#131926]/95 text-gray-900 dark:text-white font-bold text-xs shadow-xl border border-blue-500/30 dark:border-blue-400/30 backdrop-blur-md active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{label}</span>
          </button>
        </aside>
      )}
    </>
  );
}
