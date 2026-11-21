'use client';

// components/notices/SupportNotice.tsx
// Campaign support_boss_coins_v1: an honest ask for support. The platform is
// free but costs about $60 a year to keep online, so it asks traders to try
// Boss (৳20 / 31 days) or buy coins (from ৳20). Shown on /trade at most once
// every 7 days per trader (counted from when they last closed it or tapped a
// button); traders on Boss never see it (they already support it).
// Styles: SupportNotice.module.css. Delivery and tracking: useOnceNotice.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOnceNotice } from './useOnceNotice';
import styles from './SupportNotice.module.css';

export const SUPPORT_CAMPAIGN_ID = 'support_boss_coins_v1';

export type Lang = 'bn' | 'en';

const COPY: Record<Lang, {
  title: string;
  text: string;
  priceUnit: string;
  boss: string;
  coins: string;
  later: string;
  close: string;
}> = {
  bn: {
    title: 'আপনার ২০ টাকাও গুরুত্বপূর্ণ',
    text: 'StockSimulatorBD ফ্রি, আর ফ্রিই থাকবে। কিন্তু প্ল্যাটফর্মটা চালু রাখতে বছরে প্রায় ৬০ ডলার খরচ হয়। যদি আপনি এই সিমুলেটর থেকে উপকৃত হয়ে থাকেন তাহলে Boss অথবা কয়েন কেনার অনুরোধ রইলো।',
    priceUnit: 'মাসে Boss, বা ৳২০ থেকে কয়েন',
    boss: 'Boss নিন',
    coins: 'কয়েন কিনুন',
    later: 'পরে দেখব',
    close: 'বন্ধ করুন',
  },
  en: {
    title: 'Your 20 taka matters too',
    text: 'StockSimulatorBD is free and will stay free. But keeping it online costs about $60 a year. If this simulator has been useful to you, I would be grateful if you would consider Boss or some coins.',
    priceUnit: 'a month for Boss, or coins from ৳20',
    boss: 'Get Boss',
    coins: 'Buy coins',
    later: 'Maybe later',
    close: 'Close',
  },
};

const PRICE: Record<Lang, string> = { bn: '৳২০', en: '৳20' };

export default function SupportNotice() {
  const { loading, isBoss } = useAuth();
  const { visible, close } = useOnceNotice(SUPPORT_CAMPAIGN_ID, {
    enabled: !loading && !isBoss,
    repeatAfterDays: 7,
  });
  const [lang, setLang] = useState<Lang>('bn');
  const cardRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => close('dismiss', { lang }), [close, lang]);
  // The keyboard handler reads the latest dismiss through a ref, so switching
  // language doesn't tear down and re-run the focus and scroll lock below.
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  // Focus into the dialog, lock page scroll, Escape closes, Tab stays inside.
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    card?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissRef.current();
        return;
      }
      if (e.key !== 'Tab' || !card) return;
      const focusable = card.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <SupportNoticeView
      ref={cardRef}
      lang={lang}
      onLang={setLang}
      onDismiss={dismiss}
      onChoose={(target) => close('click', { target, lang })}
    />,
    document.body
  );
}

export interface SupportNoticeViewProps {
  lang: Lang;
  onLang: (lang: Lang) => void;
  onDismiss: () => void;
  onChoose: (target: 'boss' | 'coins') => void;
}

/** The pop-up's markup alone, with no delivery logic (used by the preview too). */
export const SupportNoticeView = React.forwardRef<HTMLDivElement, SupportNoticeViewProps>(
  function SupportNoticeView({ lang, onLang, onDismiss, onChoose }, ref) {
    const t = COPY[lang];
    return (
        <div
          className={styles.root}
          onClick={(e) => {
            if (e.target === e.currentTarget) onDismiss();
          }}
        >
          <div
            ref={ref}
            className={styles.card}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-notice-title"
            aria-describedby="support-notice-text"
            tabIndex={-1}
            lang={lang}
          >
            <div className={styles.media}>
              <Image
                src="/admin/spongebob-begging.webp"
                alt={lang === 'bn' ? 'হাত জোড় করে অনুরোধ করছে স্পঞ্জবব' : 'SpongeBob begging with his hands clasped'}
                fill
                sizes="(min-width: 640px) 284px, 100vw"
                priority
              />
            </div>

            <div className={styles.body}>
              <div className={styles.topbar}>
                <div className={styles.lang} role="group" aria-label="Language">
                  <button
                    type="button"
                    className={styles.langBtn}
                    aria-pressed={lang === 'bn'}
                    onClick={() => onLang('bn')}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    className={styles.langBtn}
                    aria-pressed={lang === 'en'}
                    onClick={() => onLang('en')}
                  >
                    English
                  </button>
                </div>
                <button type="button" className={styles.close} onClick={onDismiss} aria-label={t.close}>
                  <X width={18} height={18} aria-hidden="true" />
                </button>
              </div>

              <h2 id="support-notice-title" className={styles.title}>
                {t.title}
              </h2>
              <p id="support-notice-text" className={styles.text}>
                {t.text}
              </p>

              <p className={styles.price}>
                <span className={styles.priceFigure}>{PRICE[lang]}</span>
                <span>{t.priceUnit}</span>
              </p>

              <div className={styles.actions}>
                <Link
                  href="/boss"
                  className={styles.primary}
                  onClick={() => onChoose('boss')}
                >
                  {t.boss}
                </Link>
                <Link
                  href="/coins"
                  className={styles.secondary}
                  onClick={() => onChoose('coins')}
                >
                  {t.coins}
                </Link>
              </div>

              <button type="button" className={styles.later} onClick={onDismiss}>
                {t.later}
              </button>
            </div>
          </div>
        </div>
    );
  }
);
