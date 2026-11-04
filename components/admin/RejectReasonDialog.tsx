'use client';

// Admin "why are you rejecting this?" picker, replacing window.prompt on every
// reject button. The chosen reason is emailed to the trader and shown on their
// /coins or /boss request history, so it is a preset list plus an optional
// custom message rather than free text by default.
//
// Usage:
//   const { askReason, rejectDialog } = useRejectReasonDialog();
//   const reason = await askReason({ subtitle: 'Rahim · ৳99 · TrxID ABC' });
//   if (reason === null) return; // cancelled
//   ...render {rejectDialog} once in the component tree.

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { REJECTION_REASONS, MAX_REJECTION_REASON_LENGTH } from '@/lib/rejectionReasons';

const CUSTOM = '__custom__';

interface AskOptions {
  title?: string;
  subtitle?: string;
}

export function useRejectReasonDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AskOptions>({});
  const [selected, setSelected] = useState<string>(REJECTION_REASONS[0]);
  const [custom, setCustom] = useState('');
  const resolverRef = useRef<((value: string | null) => void) | null>(null);

  const close = useCallback((value: string | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const askReason = useCallback((opts: AskOptions = {}) => {
    // A second ask while one is open cancels the first.
    resolverRef.current?.(null);
    setOptions(opts);
    setSelected(REJECTION_REASONS[0]);
    setCustom('');
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const customTrimmed = custom.trim();
  const canConfirm = selected !== CUSTOM || customTrimmed.length > 0;

  const confirm = () => {
    if (!canConfirm) return;
    close(selected === CUSTOM ? customTrimmed : selected);
  };

  const rejectDialog = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={() => close(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-reason-title"
        className="w-full sm:max-w-md bg-white dark:bg-[#1A1F26] rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 id="reject-reason-title" className="text-base font-bold text-gray-900 dark:text-white">
            {options.title || 'Reject request'}
          </h2>
          <button
            type="button"
            onClick={() => close(null)}
            aria-label="Cancel"
            className="p-1 -m-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {options.subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 break-words">{options.subtitle}</p>
        )}
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          The trader gets this reason by email and sees it on their request history.
        </p>

        <fieldset className="space-y-1.5">
          <legend className="sr-only">Rejection reason</legend>
          {[...REJECTION_REASONS, CUSTOM].map((reason) => (
            <label
              key={reason}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer text-sm transition-colors ${
                selected === reason
                  ? 'border-red-400 bg-red-50 text-red-800 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              <input
                type="radio"
                name="reject-reason"
                value={reason}
                checked={selected === reason}
                onChange={() => setSelected(reason)}
                className="accent-red-600"
              />
              <span>{reason === CUSTOM ? 'Other (write a message)' : reason}</span>
            </label>
          ))}
        </fieldset>

        {selected === CUSTOM && (
          <textarea
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={MAX_REJECTION_REASON_LENGTH}
            rows={3}
            placeholder="Explain why this request was rejected"
            className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111418] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => close(null)}
            className="flex-1 min-h-[44px] rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="flex-1 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
          >
            Reject &amp; notify
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { askReason, rejectDialog };
}
