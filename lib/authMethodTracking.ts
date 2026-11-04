// lib/authMethodTracking.ts
// Client side of the sign-in button tracker (server: app/api/auth/method-event).
//
// trackAuthClick(method) — call when a sign-in attempt starts. Sends a "click"
//   and remembers the method in sessionStorage, which survives OAuth redirects
//   in the same tab.
// reportAuthSuccess(user) — called by AuthContext when a user signs in. Only
//   reports if a click was remembered recently, so restoring a saved session
//   on page load is never counted as a sign-in.
// Everything is fire-and-forget: tracking must never slow down or break sign-in.

import type { User } from 'firebase/auth';
import type { AuthMethod } from '@/lib/authMethods';

const PENDING_KEY = 'stocksimulatorbd_pending_auth_method';
const PENDING_MAX_AGE_MS = 15 * 60 * 1000;

export function trackAuthClick(method: AuthMethod) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ method, at: Date.now() }));
  } catch {}
  try {
    fetch('/api/auth/method-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'click', method }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Remember the method without counting a click (e.g. finishing an email link). */
export function markPendingAuthMethod(method: AuthMethod) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ method, at: Date.now() }));
  } catch {}
}

export function reportAuthSuccess(user: User) {
  let method: string | null = null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    const pending = JSON.parse(raw);
    if (!pending?.at || Date.now() - pending.at > PENDING_MAX_AGE_MS) return;
    method = pending.method;
  } catch {
    return;
  }

  user
    .getIdToken()
    .then((token) =>
      fetch('/api/auth/method-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event: 'success', method }),
        keepalive: true,
      })
    )
    .catch(() => {});
}
