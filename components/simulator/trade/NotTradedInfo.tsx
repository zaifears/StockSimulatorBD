'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

interface Props {
  /** Yesterday's closing price, if known — shown so "not traded" doesn't read as "worthless". */
  lastClose?: number;
  className?: string;
}

/**
 * Small (i) affordance explaining why a stock has no live price today.
 * Portaled to document.body so table stacking contexts and opacity layers
 * never bleed through or paint over the popover.
 */
export default function NotTradedInfo({ lastClose, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = 280;
    const padding = 12;

    // Horizontal position: align right edge of popover with right edge of button, clamped to screen
    let left = rect.right - width;
    if (left < padding) {
      left = Math.max(padding, rect.left);
    }
    if (left + width > window.innerWidth - padding) {
      left = window.innerWidth - width - padding;
    }

    // Vertical position: if space below, show below button; otherwise flip above
    const estimatedHeight = 310;
    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - padding && rect.top - estimatedHeight - 8 > padding) {
      top = rect.top - estimatedHeight - 8;
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open, updatePosition]);

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label="Why isn't this stock trading today?"
        aria-expanded={open}
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60 cursor-pointer"
      >
        <Info className="h-2.5 w-2.5" strokeWidth={3} />
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={popoverRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '280px',
            zIndex: 9999,
          }}
          onClick={(event) => event.stopPropagation()}
          className="rounded-2xl border border-amber-300/80 bg-white p-3.5 text-left shadow-2xl dark:border-amber-700/60 dark:bg-[#161B22] animate-in fade-in zoom-in-95 duration-150 select-text"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Not traded today
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded cursor-pointer"
              aria-label="Close tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="mb-2 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
            No shares have changed hands yet today, so there is no live price to trade at. This
            can happen for a few reasons:
          </p>
          <ul className="mb-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
            <li>Trading has been suspended by DSE or BSEC</li>
            <li>Halted for a corporate announcement or corporate action</li>
            <li>The stock has hit its daily circuit breaker / price limit</li>
            <li>The DSE is closed today — outside trading hours, a holiday, or an extraordinary closure</li>
            <li>The company is in its record date / book-closure period (dividend, rights issue, or bonus shares)</li>
          </ul>
          <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800/80 pt-2">
            This doesn&apos;t mean the stock is worthless
            {typeof lastClose === 'number' && lastClose > 0
              ? ` — its last known closing price was ৳${lastClose.toFixed(2)}.`
              : '.'}{' '}
            Trading is disabled until it trades again.
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}
