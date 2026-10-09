'use client';

// components/shared/UserNoticeModal.tsx
// Production-ready, generic Once-Per-User modal component supporting:
// 1. Announcements: Tracks who clicked "Okay" or any link in the content.
// 2. Images: Displays promotional poster/banner and tracks who clicked the cross (X) or "Continue" to trade.
// 3. Polls: Interactive community polls with star rating and multi-choice submission tracking.
//
// Frequency & Non-blocking Rules:
// - Trade is NEVER blocked: users can always dismiss via X cross, backdrop, or "Continue to Trade".
// - Shows at most once per login session if unfinished.
// - Once the user has FINISHED what was needed (clicked CTA/link or submitted poll), it is marked
//   permanently in localStorage + Firestore users/{uid}.noticesSeen and NEVER shown again.
// - Fully responsive on both mobile and desktop with zero layout shift and touch-friendly targets.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Star,
  ArrowRight,
  ExternalLink,
  Loader2,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getFirestore, getDoc } from 'firebase/firestore';
import { fetchWithFreshToken } from '@/lib/utils/fetchWithToken';
import { VALID_DOMAIN_CHOICES } from '@/lib/surveyConstants';

export type NoticeVariant = 'announcement' | 'alert' | 'image' | 'questionnaire';
export type NoticeAlertType = 'info' | 'warning' | 'success' | 'amber';

export interface QuestionnaireOption {
  id: string;
  labelEn: string;
  labelBn: string;
}

export interface QuestionnaireConfig {
  ratingQuestion?: {
    titleEn: string;
    titleBn: string;
    maxStars?: number;
  };
  choiceQuestion?: {
    titleEn: string;
    titleBn: string;
    noteEn?: string;
    noteBn?: string;
    options: QuestionnaireOption[] | readonly QuestionnaireOption[];
  };
  endpoint?: string;
  submitButtonText?: { en: string; bn: string };
  defaultLang?: 'en' | 'bn';
}

export interface CopyBoxConfig {
  url: string;
  label?: string;
  educationalNote?: string;
  buttonText?: string;
}

export interface UserNoticeModalProps {
  /** Unique campaign ID used to track once-per-user delivery */
  campaignId: string;
  /** Modal presentation style */
  variant?: NoticeVariant;
  /** Global master switch (e.g. from environment variable or feature flag) */
  isActive?: boolean;
  /** Whether the user can close the modal without taking action. Defaults to true (Trade is never blocked) */
  dismissible?: boolean;

  /** Title (can be a plain string or bilingual object) */
  title: string | { en: string; bn: string };
  /** Description or body content (can include links) */
  description?: string | { en: string; bn: string } | React.ReactNode;
  /** Optional badge text displayed above the title */
  badge?: string | { en: string; bn: string };

  /** Image banner URL (for 'image' or 'announcement' variants) */
  imageUrl?: string;
  imageAlt?: string;

  /** Visual accent for alert variant */
  alertType?: NoticeAlertType;

  /** Brand icon override (e.g. 'facebook' for official Facebook branding) */
  iconType?: 'default' | 'facebook';

  /** Interactive link copy box with educational note */
  copyBox?: CopyBoxConfig;

  /** Primary Call-to-Action button text (e.g. "Okay", "Upgrade", "Learn More") */
  ctaText?: string | { en: string; bn: string };
  /** Primary Call-to-Action target link */
  ctaLink?: string;
  /** Whether CTA link opens in a new tab */
  ctaOpenInNewTab?: boolean;
  /** Optional callback fired when CTA is clicked */
  onCtaClick?: () => void;

  /** Secondary dismiss button label (defaults to 'Continue to Trade') */
  dismissText?: string | { en: string; bn: string };

  /** Configuration for questionnaire variant */
  questionnaire?: QuestionnaireConfig;

  /** Callbacks */
  onSuccess?: () => void;
  onDismiss?: () => void;

  /** Controlled visibility override (optional) */
  isOpen?: boolean;
}

export default function UserNoticeModal({
  campaignId,
  variant = 'announcement',
  isActive = true,
  dismissible = true,
  title,
  description,
  badge,
  imageUrl,
  imageAlt = 'Notice banner',
  alertType = 'info',
  iconType = 'default',
  copyBox,
  ctaText,
  ctaLink,
  ctaOpenInNewTab = false,
  onCtaClick,
  dismissText,
  questionnaire,
  onSuccess,
  onDismiss,
  isOpen: controlledIsOpen,
}: UserNoticeModalProps) {
  const { user } = useAuth();
  const uid = user?.uid;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<'en' | 'bn'>(questionnaire?.defaultLang || 'en');
  const [copied, setCopied] = useState(false);

  // Questionnaire state
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impressionLoggedRef = useRef(false);

  // Storage keys:
  // - permanentKey: set when user FINISHED what was needed (clicked link/CTA or submitted poll) -> NEVER AGAIN
  // - sessionKey: set when user dismissed/closed with cross to continue -> suppressed for active login session
  const permanentKey = `ssbd_notice_done_${campaignId}_${uid || 'guest'}`;
  const sessionKey = `ssbd_notice_session_${campaignId}_${uid || 'guest'}`;

  // Helper to send telemetry beacons to /api/analytics/notice-event
  const sendTelemetry = useCallback(
    async (action: 'impression' | 'click' | 'dismiss' | 'submit' | 'copy', metadata?: Record<string, any>) => {
      try {
        const idToken = user ? await user.getIdToken().catch(() => null) : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

        fetch('/api/analytics/notice-event', {
          method: 'POST',
          headers,
          keepalive: true,
          body: JSON.stringify({
            campaignId,
            action,
            metadata: {
              variant,
              lang,
              ...metadata,
            },
          }),
        }).catch(() => {});
      } catch {
        // Analytics failure should never block UI
      }
    },
    [campaignId, variant, lang, user]
  );

  const dismissedRef = useRef(false);

  // Check if this notice is permanently finished or dismissed for the current session
  const isSuppressed = useCallback(() => {
    if (typeof window === 'undefined') return true;
    if (dismissedRef.current) return true;

    // Check permanent completion across user-specific and generic keys
    if (
      localStorage.getItem(permanentKey) === 'true' ||
      localStorage.getItem(`ssbd_notice_done_${campaignId}`) === 'true' ||
      localStorage.getItem(`ssbd_notice_done_${campaignId}_guest`) === 'true'
    ) {
      return true;
    }

    // Check session dismissal across user-specific and generic keys
    if (
      sessionStorage.getItem(sessionKey) === 'true' ||
      sessionStorage.getItem(`ssbd_notice_session_${campaignId}`) === 'true' ||
      sessionStorage.getItem(`ssbd_notice_session_${campaignId}_guest`) === 'true'
    ) {
      return true;
    }

    return false;
  }, [campaignId, permanentKey, sessionKey]);

  // Mark permanently finished in localStorage (never again)
  const markCompletedPermanently = useCallback(() => {
    dismissedRef.current = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem(permanentKey, 'true');
      localStorage.setItem(`ssbd_notice_done_${campaignId}`, 'true');
    }
    setVisible(false);
  }, [permanentKey, campaignId]);

  // Mark dismissed for this session only (will show once next login if unfinished)
  const markDismissedForSession = useCallback(() => {
    dismissedRef.current = true;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, 'true');
      sessionStorage.setItem(`ssbd_notice_session_${campaignId}`, 'true');
      sessionStorage.setItem(`ssbd_notice_session_${campaignId}_guest`, 'true');
    }
    setVisible(false);
  }, [sessionKey, campaignId]);

  // Copy link handler with clipboard copy, UI feedback, and telemetry tracking
  const handleCopyLink = useCallback(
    (url: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
      sendTelemetry('copy', {
        label: 'Copy Facebook Page Link',
        href: url,
      });
      // Mark permanently completed in localStorage once user interacted with copy action
      markCompletedPermanently();
    },
    [sendTelemetry, markCompletedPermanently]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Self-managed once-per-login and permanent completion lifecycle
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setVisible(controlledIsOpen);
      return;
    }

    if (!isActive || isSuppressed()) {
      setVisible(false);
      return;
    }

    let isCancelled = false;

    const checkEligibility = async () => {
      // 1. If user is logged in, do a one-shot fetch of Firestore profile
      if (uid) {
        try {
          const userRef = doc(getFirestore(), 'users', uid);
          const snap = await getDoc(userRef);
          if (isCancelled || isSuppressed()) return;

          if (snap.exists()) {
            const data = snap.data();
            const finishedInProfile = Boolean(
              data?.noticesSeen?.[campaignId] ||
              (campaignId === 'domain_survey' && data?.tradeSurveyCompletedAt)
            );

            if (finishedInProfile) {
              markCompletedPermanently();
              return;
            }
          }
        } catch (err) {
          console.warn('Notice user check error:', err);
        }
      }

      if (isCancelled || isSuppressed()) return;

      // 2. User hasn't finished: display after smooth 700ms entrance delay
      const timer = setTimeout(() => {
        if (!isCancelled && !isSuppressed()) {
          setVisible(true);
        }
      }, 700);

      return () => clearTimeout(timer);
    };

    checkEligibility();

    return () => {
      isCancelled = true;
    };
  }, [isActive, campaignId, uid, controlledIsOpen, isSuppressed, markCompletedPermanently]);

  // Log impression once when shown
  useEffect(() => {
    if (visible && !impressionLoggedRef.current) {
      impressionLoggedRef.current = true;
      sendTelemetry('impression');
    }
  }, [visible, sendTelemetry]);

  // Handle cross (X) or "Continue to Trade" dismissal
  const handleCrossDismiss = useCallback(() => {
    if (!dismissible) return;
    dismissedRef.current = true;
    setVisible(false);
    markDismissedForSession();
    sendTelemetry('dismiss', {
      reason: 'cross_clicked_to_continue',
      variant,
      label: 'Cross (X) / Continue to Trade',
    });
    if (onDismiss) onDismiss();
  }, [dismissible, markDismissedForSession, sendTelemetry, variant, onDismiss]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!visible || !dismissible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCrossDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, dismissible, handleCrossDismiss]);

  // Handle CTA click ("Okay", link, or primary action)
  const handleCtaClick = useCallback(
    (label: string, href?: string) => {
      // User did what was needed: mark completed permanently so it NEVER appears again!
      dismissedRef.current = true;
      markCompletedPermanently();
      sendTelemetry('click', {
        source: 'cta_button',
        label,
        href: href || ctaLink || undefined,
      });
      if (onCtaClick) onCtaClick();
      if (onSuccess) onSuccess();
    },
    [markCompletedPermanently, sendTelemetry, ctaLink, onCtaClick, onSuccess]
  );

  // Intercept any link clicks inside the announcement body
  const handleContentClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    dismissedRef.current = true;
    const href = target.getAttribute('href');
    const label = (target.textContent || '').trim().slice(0, 60);

    // Track which link was clicked
    sendTelemetry('click', {
      source: 'content_link',
      label: label || 'In-body Link',
      href: href || undefined,
    });

    // Mark as completed permanently!
    markCompletedPermanently();
  };

  // Questionnaire submission
  const handleQuestionnaireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const activeRating = rating || 0;
    const choice = selectedChoice;

    if (!activeRating || !choice) return;

    setSubmitting(true);
    setError(null);

    try {
      const endpoint = questionnaire?.endpoint || '/api/survey/trade-questionnaire';
      const res = await fetchWithFreshToken(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradingExperience: activeRating,
          domainChoice: choice,
          campaignId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit response. Please try again.');
      }

      // Mark permanently completed!
      markCompletedPermanently();
      const matchedOption = (questionnaire?.choiceQuestion?.options || VALID_DOMAIN_CHOICES).find(
        (opt) => opt.id === choice
      );
      sendTelemetry('submit', {
        rating: activeRating,
        choice,
        choiceLabel: matchedOption?.labelEn,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Notice questionnaire submit error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (!mounted || !visible) return null;

  // Resolve localized text helpers
  const getText = (val?: string | { en: string; bn: string } | null): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val[lang] || val.en || '';
  };

  const titleText = getText(title);
  const badgeText = getText(badge);
  const ctaBtnText = getText(ctaText) || (variant === 'announcement' ? 'Okay' : '');
  const dismissBtnText = getText(dismissText) || (lang === 'bn' ? 'ট্রেডিং-এ যান' : 'Continue to Trade');

  const getAlertIcon = () => {
    switch (alertType) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'amber':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      case 'info':
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getRatingLabel = (score: number) => {
    if (score === 0) return { en: 'Select your rating', bn: 'রেটিং নির্বাচন করুন' };
    if (score <= 2) return { en: 'Beginner / Just starting out', bn: '১-২: সম্পূর্ণ নতুন / শুরু করেছি মাত্র' };
    if (score <= 4) return { en: 'Basic / Learning the ropes', bn: '৩-৪: প্রাথমিক ধারণা আছে / শিখছি' };
    if (score <= 7) return { en: 'Intermediate / Active learner', bn: '৫-৭: মাঝারি অভিজ্ঞতা / নিয়মিত চর্চা করছি' };
    if (score <= 9) return { en: 'Experienced / Active trader', bn: '৮-৯: বেশ অভিজ্ঞ / নিয়মিত ট্রেড করি' };
    return { en: 'Expert / Professional trader', bn: '১০: পেশাদার / বহু বছরের অভিজ্ঞতা' };
  };

  const activeRating = hoveredRating || rating || 0;
  const choiceOptions = questionnaire?.choiceQuestion?.options || VALID_DOMAIN_CHOICES;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-notice-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) {
          handleCrossDismiss();
        }
      }}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-xl md:max-w-2xl bg-white dark:bg-[#11161F] border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[86vh] animate-in fade-in zoom-in-95 duration-200 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-gray-800/80 bg-white/95 dark:bg-[#11161F]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            {iconType === 'facebook' ? (
              <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                {variant === 'questionnaire' ? (
                  <HelpCircle className="w-4 h-4" />
                ) : variant === 'alert' ? (
                  getAlertIcon()
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-500" />
                )}
              </div>
            )}
            {badgeText && (
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                iconType === 'facebook'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-[#1877F2] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              }`}>
                {badgeText}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Accessible Cross (X) Close button: minimum 40px touch area */}
            {dismissible && (
              <button
                type="button"
                onClick={handleCrossDismiss}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer active:scale-95"
                aria-label="Close modal and continue to trade"
                title="Continue to Trade"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body (Optimized for zero-scroll on mobile and desktop) */}
        <div
          className="px-4 py-3.5 sm:px-6 sm:py-4 text-gray-900 dark:text-gray-100 flex-1 overflow-visible"
          onClickCapture={handleContentClickCapture}
        >
          {/* CASE B: Image variant poster */}
          {imageUrl && (
            <div className="relative w-full h-40 sm:h-52 rounded-xl overflow-hidden mb-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-xs">
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                className="object-cover transition-transform duration-300 hover:scale-102"
                sizes="(max-width: 640px) 100vw, 512px"
                priority
              />
            </div>
          )}

          {/* Title - Styled with official Facebook brand blue #1877F2 when iconType is facebook */}
          <h2
            id="user-notice-title"
            className={`text-base sm:text-xl font-extrabold tracking-tight mb-2 leading-snug ${
              iconType === 'facebook' ? 'text-[#1877F2]' : 'text-gray-900 dark:text-white'
            }`}
          >
            {titleText}
          </h2>

          {/* Description */}
          {description && (
            <div className="text-xs sm:text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed mb-2 prose dark:prose-invert max-w-none">
              {typeof description === 'string'
                ? description
                : typeof description === 'object' && description !== null && 'en' in description
                ? getText(description as { en: string; bn: string })
                : (description as React.ReactNode)}
            </div>
          )}

          {/* Interactive Copy Box (Zero-scroll tight layout) */}
          {copyBox && (
            <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-[#141B26] border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
              {copyBox.educationalNote && (
                <p className="text-[11px] sm:text-xs text-blue-950 dark:text-blue-200 font-medium mb-2 leading-snug">
                  {copyBox.educationalNote}
                </p>
              )}
              {copyBox.label && (
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  {copyBox.label}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-[#0D121B] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-mono text-blue-600 dark:text-blue-400 select-all truncate">
                  {copyBox.url}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyLink(copyBox.url)}
                  className={`h-8 sm:h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-blue-500/20'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copyBox.buttonText || 'Copy Link'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* CASE C: Poll / Questionnaire Form */}
          {variant === 'questionnaire' && (
            <form onSubmit={handleQuestionnaireSubmit} className="space-y-4">
              {/* Question 1: Rating Stars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold">1</span>
                    {questionnaire?.ratingQuestion
                      ? lang === 'bn'
                        ? questionnaire.ratingQuestion.titleBn
                        : questionnaire.ratingQuestion.titleEn
                      : 'Your trading experience'}
                  </label>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    {activeRating > 0 ? `${activeRating}/10` : 'Rate 1–10'}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {getRatingLabel(activeRating).en}
                </p>

                {/* 10 Stars Container */}
                <div
                  className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-[#181F2A] border border-gray-200 dark:border-gray-800 rounded-xl"
                  onMouseLeave={() => setHoveredRating(null)}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((starNum) => {
                    const isFilled = starNum <= activeRating;
                    const isSelected = starNum === rating;

                    return (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => setRating(starNum)}
                        onMouseEnter={() => setHoveredRating(starNum)}
                        className="p-1 sm:p-1.5 focus:outline-none transition-transform hover:scale-125 active:scale-95 touch-manipulation cursor-pointer"
                        aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                              : 'text-gray-300 dark:text-gray-600 hover:text-amber-300'
                          } ${isSelected ? 'scale-110' : ''}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Options */}
              <div className="space-y-2.5 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                <label className="text-xs sm:text-sm font-bold flex items-start gap-1.5 text-gray-800 dark:text-gray-200 leading-snug">
                  <span className="flex items-center justify-center w-5 h-5 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold mt-0.5">2</span>
                  <span>
                    {questionnaire?.choiceQuestion
                      ? lang === 'bn'
                        ? questionnaire.choiceQuestion.titleBn
                        : questionnaire.choiceQuestion.titleEn
                      : 'Community input on project domain & continuity:'}
                  </span>
                </label>

                {/* Options list */}
                <div className="space-y-2 ml-1 sm:ml-6">
                  {choiceOptions.map((option, idx) => {
                    const isSelected = selectedChoice === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedChoice(option.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-semibold shadow-xs'
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#151B24] text-gray-700 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                              : 'border-gray-400 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900" />}
                        </div>
                        <div className="flex-1 leading-relaxed">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white mr-1.5">{idx + 1}.</span>
                            {option.labelEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!rating || !selectedChoice || submitting}
                  className={`w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer ${
                    !rating || !selectedChoice || submitting
                      ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {questionnaire?.submitButtonText
                          ? getText(questionnaire.submitButtonText)
                          : 'Submit & Continue Trading'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sticky Action Footer (for Announcement / Image / Alert) - Compact side-by-side buttons */}
        {variant !== 'questionnaire' && (
          <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/80 dark:bg-[#161B24]/80 flex flex-row items-center justify-end gap-2">
            {/* Dismiss / Continue to Trade */}
            {dismissible && (
              <button
                type="button"
                onClick={handleCrossDismiss}
                className="flex-1 sm:flex-initial h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors text-center cursor-pointer active:scale-95"
              >
                {dismissBtnText}
              </button>
            )}

            {/* Primary Action Button (Visit Facebook Page / Okay) */}
            {ctaBtnText && (
              ctaLink ? (
                <Link
                  href={ctaLink}
                  target={ctaOpenInNewTab ? '_blank' : undefined}
                  rel={ctaOpenInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={() => handleCtaClick(ctaBtnText, ctaLink)}
                  className={`flex-1 sm:flex-initial h-9 sm:h-10 inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white active:scale-95 transition-all text-center cursor-pointer ${
                    iconType === 'facebook'
                      ? 'bg-[#1877F2] hover:bg-[#166fe5] shadow-xs'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                  }`}
                >
                  {iconType === 'facebook' && (
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  <span>{ctaBtnText}</span>
                  {ctaOpenInNewTab ? <ExternalLink className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCtaClick(ctaBtnText)}
                  className={`flex-1 sm:flex-initial h-9 sm:h-10 inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white active:scale-95 transition-all text-center cursor-pointer ${
                    iconType === 'facebook'
                      ? 'bg-[#1877F2] hover:bg-[#166fe5] shadow-xs'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                  }`}
                >
                  <span>{ctaBtnText}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
