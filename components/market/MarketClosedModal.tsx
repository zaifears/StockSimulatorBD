'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Clock,
  Bell,
  Calendar,
  Download,
  ExternalLink,
  CheckCircle2,
  Repeat,
  Info,
} from 'lucide-react';
import {
  getNextMarketOpen,
  createGoogleCalendarUrl,
  generateIcsContent,
  downloadIcsFile,
  type NextMarketSession,
} from '@/lib/utils/marketSchedule';
import { useAuth } from '@/contexts/AuthContext';

interface MarketClosedModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays?: string[];
  source?: string; // e.g. 'trade_banner', 'trade_row_buy', 'market_strip'
}

export default function MarketClosedModal({
  isOpen,
  onClose,
  holidays = [],
  source = 'unknown',
}: MarketClosedModalProps) {
  const { user } = useAuth();
  // Default to At Market Open (10:00 AM)
  const [leadMinutes, setLeadMinutes] = useState<0 | 15>(0);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [pendingGCalReturn, setPendingGCalReturn] = useState<boolean>(false);
  const gcalOpenedAtRef = useRef<number>(0);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setPendingGCalReturn(false);
      gcalOpenedAtRef.current = 0;
    }
  }, [isOpen]);

  // Compute next market open info
  const nextSession: NextMarketSession = useMemo(() => {
    return getNextMarketOpen(new Date(), holidays);
  }, [holidays, isOpen]);

  // Handle escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Detect when user returns from Google Calendar tab/app
  useEffect(() => {
    if (!pendingGCalReturn) return;

    const checkReturn = () => {
      // Require at least 800ms so transient blur/focus on initial open doesn't fire immediately
      if (Date.now() - gcalOpenedAtRef.current > 800) {
        setIsConfirmed(true);
        setPendingGCalReturn(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkReturn();
      }
    };

    const handleWindowFocus = () => {
      checkReturn();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingGCalReturn]);

  // Send lightweight analytics beacon
  const trackReminder = useCallback(
    async (type: 'google_calendar' | 'apple_ics' | 'weekly_ics', isRecurring: boolean = false) => {
      try {
        const idToken = user ? await user.getIdToken().catch(() => null) : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

        fetch('/api/analytics/market-reminder', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type,
            source,
            leadMinutes,
            isRecurring,
            nextOpenDhaka: nextSession.nextOpenDhakaFormatted,
          }),
        }).catch(() => {});
      } catch {
        // Analytics failure should never block UX
      }
    },
    [user, source, leadMinutes, nextSession.nextOpenDhakaFormatted]
  );

  const handleGoogleCalendar = useCallback(() => {
    const url = createGoogleCalendarUrl({
      nextOpenUtc: nextSession.nextOpenUtc,
      nextCloseUtc: nextSession.nextCloseUtc,
      leadMinutes,
      isRecurring: false,
    });
    trackReminder('google_calendar', false);
    gcalOpenedAtRef.current = Date.now();
    setPendingGCalReturn(true);

    try {
      sessionStorage.setItem('ssbd_market_reminder_set', 'true');
      window.dispatchEvent(new Event('ssbd_reminder_updated'));
    } catch {
      // Ignore storage errors
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [nextSession, leadMinutes, trackReminder]);

  const handleAppleIcs = useCallback(() => {
    const content = generateIcsContent({
      nextOpenUtc: nextSession.nextOpenUtc,
      nextCloseUtc: nextSession.nextCloseUtc,
      leadMinutes,
      isRecurring: false,
    });
    trackReminder('apple_ics', false);
    downloadIcsFile(content, 'dse-market-open.ics');
    setIsConfirmed(true);
    setCopiedStatus('Calendar invite downloaded!');

    try {
      sessionStorage.setItem('ssbd_market_reminder_set', 'true');
      window.dispatchEvent(new Event('ssbd_reminder_updated'));
    } catch {
      // Ignore storage errors
    }

    setTimeout(() => setCopiedStatus(null), 4000);
  }, [nextSession, leadMinutes, trackReminder]);

  const handleWeeklyRecurringIcs = useCallback(() => {
    const content = generateIcsContent({
      nextOpenUtc: nextSession.nextOpenUtc,
      nextCloseUtc: nextSession.nextCloseUtc,
      leadMinutes,
      isRecurring: true,
    });
    trackReminder('weekly_ics', true);
    downloadIcsFile(content, 'dse-weekly-trading-schedule.ics');
    setIsConfirmed(true);
    setCopiedStatus('Weekly schedule downloaded!');

    try {
      sessionStorage.setItem('ssbd_market_reminder_set', 'true');
      window.dispatchEvent(new Event('ssbd_reminder_updated'));
    } catch {
      // Ignore storage errors
    }

    setTimeout(() => setCopiedStatus(null), 4000);
  }, [nextSession, leadMinutes, trackReminder]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="market-closed-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#161B22] border-t sm:border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 sm:zoom-in-95 duration-200 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 dark:border-gray-800/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="market-closed-title"
                className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight"
              >
                DSE Market is Closed
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Trading hours: Sunday to Thursday, 10:00 AM – 2:15 PM (Dhaka Time)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center active:scale-95 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Next Session Highlight Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#0E1520] border border-gray-200/70 dark:border-gray-800/70 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                Next Trading Session
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {nextSession.relativeTimeFormatted}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              {nextSession.nextOpenDhakaFormatted}
            </div>
          </div>

          {/* Timing Selector - Default: At market open (10:00 AM) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1.5">
              Remind me:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeadMinutes(0)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  leadMinutes === 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                At market open (10:00 AM)
              </button>
              <button
                type="button"
                onClick={() => setLeadMinutes(15)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  leadMinutes === 15
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                15 min before (9:45 AM)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleGoogleCalendar}
              className={`w-full h-12 px-4 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-between shadow-md ${
                isConfirmed
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-600/20'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {isConfirmed
                    ? 'Re-open in Google Calendar'
                    : 'Add to Google Calendar'}
                </span>
              </span>
              <ExternalLink className="w-4 h-4 opacity-70" />
            </button>

            {/* Explanatory Redirect Note */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                You will be redirected to Google Calendar — just click <strong>&quot;Save&quot;</strong> in the next screen.
              </span>
            </div>

            <button
              type="button"
              onClick={handleAppleIcs}
              className="w-full h-12 px-4 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white active:scale-[0.98] transition-all flex items-center justify-between border border-gray-200/80 dark:border-gray-700/80"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Apple / Outlook Calendar (.ics)</span>
              </span>
              <Download className="w-4 h-4 opacity-70" />
            </button>
          </div>

          {/* Pending Google Calendar Notification */}
          {pendingGCalReturn && !isConfirmed && (
            <div className="py-2.5 px-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs font-medium text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">Google Calendar opened in new tab…</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmed(true);
                  setPendingGCalReturn(false);
                }}
                className="underline text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-bold shrink-0 text-[11px]"
              >
                I clicked Save
              </button>
            </div>
          )}

          {/* Confirmed Status Card & Thank You Banner */}
          {isConfirmed && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-teal-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                      Reminder Confirmed!
                    </h4>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Saved
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800/85 dark:text-emerald-200/85 mt-1 leading-relaxed">
                    Thank you for setting a reminder! We look forward to seeing you when DSE trading begins at <strong className="text-emerald-950 dark:text-white">{nextSession.nextOpenDhakaFormatted}</strong>.
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-xs"
                >
                  Done · Return to Simulator
                </button>
              </div>
            </div>
          )}

          {/* Status Feedback Toast */}
          {copiedStatus && (
            <div className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{copiedStatus}</span>
            </div>
          )}

          {/* Recurring Option */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 text-center">
            <button
              type="button"
              onClick={handleWeeklyRecurringIcs}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Want this every day? Download Sun–Thu Schedule (.ics)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
