'use client';

// components/notices/useOnceNotice.ts
// Delivery and tracking for custom pop-ups, the same contract UserNoticeModal
// uses so /admin/survey reads both the same way:
//   - skipped while the trader closed it recently: localStorage
//     `ssbd_notice_done_{id}_{uid}` holds when (ms), and the profile's
//     noticesSeen.{id} holds when on any device (ISO, written by the server)
//   - "recently" = forever by default, or `repeatAfterDays` days
//   - shown after a short delay; an `impression` is sent once per showing
//   - close('click' | 'dismiss') records the time: telemetry goes to the
//     notice-event route (VPS first, Next route as fallback), which overwrites
//     users/{uid}.noticesSeen.{id} with now
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

type NoticeAction = 'impression' | 'click' | 'dismiss';

const SHOW_DELAY_MS = 700;

// Storage can throw (Safari private mode, blocked or full storage, some in-app
// browsers). It must never stop the pop-up from closing, so every access is guarded.
function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered on this device; the server's noticesSeen still is.
  }
}
const DAY_MS = 86_400_000;

/** Was it closed recently enough to stay hidden? `closedAt` is ms or an ISO string. */
function stillHidden(closedAt: unknown, repeatAfterDays: number | null): boolean {
  if (closedAt == null || closedAt === '') return false;
  if (repeatAfterDays == null) return true; // once ever
  const t = typeof closedAt === 'number' ? closedAt : Date.parse(String(closedAt));
  if (!Number.isFinite(t)) return false; // unreadable (e.g. an old 'true'): show it again
  return Date.now() - t < repeatAfterDays * DAY_MS;
}

export function useOnceNotice(
  campaignId: string,
  { enabled = true, repeatAfterDays = null }: { enabled?: boolean; repeatAfterDays?: number | null } = {}
) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [visible, setVisible] = useState(false);
  const doneRef = useRef(false);
  const impressionSentRef = useRef(false);
  const storageKey = `ssbd_notice_done_${campaignId}_${uid || 'guest'}`;

  const send = useCallback(
    async (action: NoticeAction, metadata?: Record<string, unknown>) => {
      try {
        const { postVpsAnalyticsWithFallback } = await import('@/lib/vpsClient');
        const idToken = user ? await user.getIdToken().catch(() => null) : null;
        postVpsAnalyticsWithFallback(
          '/api/analytics/notice-event',
          '/api/analytics/notice-event',
          { campaignId, action, idToken: idToken || undefined, metadata: metadata || {} },
          { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} }
        );
      } catch {
        // Tracking never blocks the UI.
      }
    },
    [campaignId, user]
  );

  useEffect(() => {
    if (!enabled) {
      // e.g. the account turned out to be Boss after the pop-up opened.
      setVisible(false);
      return;
    }
    if (!uid || doneRef.current) return;
    const local = readStore(storageKey);
    if (stillHidden(local && /^\d+$/.test(local) ? Number(local) : local, repeatAfterDays)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const snap = await getDoc(doc(getFirestore(), 'users', uid));
        const seenAt = snap.exists() ? snap.data()?.noticesSeen?.[campaignId] : null;
        if (stillHidden(seenAt, repeatAfterDays)) {
          const t = Date.parse(String(seenAt));
          writeStore(storageKey, String(Number.isFinite(t) ? t : Date.now()));
          return;
        }
      } catch {
        // Unreadable profile: fall through and show it; the server dedupes.
      }
      if (cancelled) return;
      timer = setTimeout(() => {
        if (!cancelled && !doneRef.current) setVisible(true);
      }, SHOW_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, uid, campaignId, storageKey, repeatAfterDays]);

  useEffect(() => {
    if (visible && !impressionSentRef.current) {
      impressionSentRef.current = true;
      send('impression');
    }
  }, [visible, send]);

  const close = useCallback(
    (action: 'click' | 'dismiss', metadata?: Record<string, unknown>) => {
      // Hide first: nothing after this line can keep the pop-up on screen.
      doneRef.current = true;
      setVisible(false);
      writeStore(storageKey, String(Date.now()));
      void send(action, metadata);
    },
    [send, storageKey]
  );

  return { visible, close };
}
