'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollableHorizontalProps {
  children: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  scrollAmount?: number;
  gradientFrom?: string;
  showOn?: 'all' | 'mobile-only';
  arrowSize?: 'xs' | 'sm' | 'md';
  as?: 'div' | 'dl' | 'nav';
  role?: string;
  ariaLabel?: string;
  clearancePadding?: string;
}

/**
 * Impeccable horizontal scrolling wrapper that renders smooth, tactile left/right
 * scroll affordance arrows with edge gradient fades on mobile and constrained viewports.
 *
 * Automatically monitors scroll position and content resize to show/hide arrows
 * only when overflow exists.
 */
export default function ScrollableHorizontal({
  children,
  className = '',
  scrollClassName = '',
  scrollAmount = 180,
  gradientFrom = 'from-[#F8F9FA] dark:from-[#0B0F17]',
  showOn = 'all',
  arrowSize = 'sm',
  as = 'div',
  role,
  ariaLabel,
  clearancePadding = 'pr-8 sm:pr-0',
}: ScrollableHorizontalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  const handleScroll = useCallback(
    (direction: 'left' | 'right') => {
      const el = containerRef.current;
      if (!el) return;
      const offset = direction === 'left' ? -scrollAmount : scrollAmount;
      el.scrollBy({ left: offset, behavior: 'smooth' });
    },
    [scrollAmount]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();

    const onResize = () => checkScroll();
    window.addEventListener('resize', onResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => checkScroll());
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver?.observe(child));
    }

    const t1 = setTimeout(checkScroll, 80);
    const t2 = setTimeout(checkScroll, 250);

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkScroll]);

  const buttonSizeClass = {
    xs: 'w-5 h-5 min-w-[20px] min-h-[20px]',
    sm: 'w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] min-h-[24px]',
    md: 'w-7 h-7 sm:w-8 sm:h-8 min-w-[28px] min-h-[28px]',
  }[arrowSize];

  const iconSizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    md: 'w-4 h-4',
  }[arrowSize];

  const visibilityClass = showOn === 'mobile-only' ? 'sm:hidden' : '';
  const Component = as as 'div';

  return (
    <div className={`relative ${className}`}>
      {/* Left Scroll Arrow with Smooth Gradient Fade */}
      {canScrollLeft && (
        <div
          className={`${visibilityClass} absolute left-0 top-0 bottom-0 z-20 flex items-center pl-0.5 pr-4 bg-gradient-to-r ${gradientFrom} to-transparent pointer-events-none transition-opacity duration-200`}
        >
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="Scroll left"
            className={`pointer-events-auto ${buttonSizeClass} rounded-full bg-white dark:bg-[#16202D] border border-gray-200/90 dark:border-gray-700/90 shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all`}
          >
            <ChevronLeft className={iconSizeClass} />
          </button>
        </div>
      )}

      {/* Horizontally Scrollable Content */}
      <Component
        ref={containerRef as React.RefObject<HTMLDivElement>}
        onScroll={checkScroll}
        role={role}
        aria-label={ariaLabel}
        className={`flex items-center overflow-x-auto scrollbar-none scroll-smooth ${clearancePadding} ${scrollClassName}`}
      >
        {children}
      </Component>

      {/* Right Scroll Arrow with Smooth Gradient Fade */}
      {canScrollRight && (
        <div
          className={`${visibilityClass} absolute right-0 top-0 bottom-0 z-20 flex items-center pr-0.5 pl-4 bg-gradient-to-l ${gradientFrom} to-transparent pointer-events-none transition-opacity duration-200`}
        >
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="Scroll right"
            className={`pointer-events-auto ${buttonSizeClass} rounded-full bg-white dark:bg-[#16202D] border border-gray-200/90 dark:border-gray-700/90 shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition-all animate-pulse`}
          >
            <ChevronRight className={iconSizeClass} />
          </button>
        </div>
      )}
    </div>
  );
}
