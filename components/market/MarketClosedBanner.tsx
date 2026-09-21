'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Bell, X, CheckCircle2 } from 'lucide-react';
import { getNextMarketOpen, type NextMarketSession } from '@/lib/utils/marketSchedule';

interface MarketClosedBannerProps {
  onOpenModal: () => void;
  holidays?: string[];
}

const STORAGE_KEY = 'ssbd_market_closed_banner_dismissed';
const REMINDER_KEY = 'ssbd_market_reminder_set';

export default function MarketClosedBanner({ onOpenModal, holidays = [] }: MarketClosedBannerProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [hasReminder, setHasReminder] = useState<boolean>(false);

  // Read dismissal state & reminder state on mount
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setIsDismissed(false);
      }
      const reminderSet = sessionStorage.getItem(REMINDER_KEY);
      if (reminderSet === 'true') {
        setHasReminder(true);
      }
    } catch {
      setIsDismissed(false);
    }

    const handleReminderUpdated = () => {
      try {
        const reminderSet = sessionStorage.getItem(REMINDER_KEY);
        setHasReminder(reminderSet === 'true');
      } catch {}
    };

    window.addEventListener('ssbd_reminder_updated', handleReminderUpdated);
    return () => window.removeEventListener('ssbd_reminder_updated', handleReminderUpdated);
  }, []);

  const nextSession: NextMarketSession = useMemo(() => {
    return getNextMarketOpen(new Date(), holidays);
  }, [holidays]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  if (isDismissed) return null;

  if (hasReminder) {
    return (
      <div className="mx-3.5 sm:mx-0 mb-3 px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-emerald-950 dark:text-emerald-100 font-medium truncate">
            <span className="font-bold">Reminder set!</span> We&apos;ll see you when DSE trading opens {nextSession.nextOpenDhakaFormatted}.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="px-2.5 py-1 rounded-xl font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
          >
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1 rounded-lg text-emerald-600/70 hover:text-emerald-900 dark:text-emerald-400/70 dark:hover:text-emerald-200 hover:bg-emerald-500/10 active:scale-90 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3.5 sm:mx-0 mb-3 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-amber-900 dark:text-amber-200 font-medium truncate">
          <span className="font-bold">Market is closed.</span> Resumes {nextSession.nextOpenDhakaFormatted} ({nextSession.relativeTimeFormatted}).
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenModal}
          className="px-2.5 py-1 rounded-xl font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 transition-all flex items-center gap-1 shadow-2xs"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Remind Me</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="p-1 rounded-lg text-amber-600/70 hover:text-amber-900 dark:text-amber-400/70 dark:hover:text-amber-200 hover:bg-amber-500/10 active:scale-90 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
