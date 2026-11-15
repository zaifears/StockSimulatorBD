// lib/passwordReset.ts — browser side of "forgot password" / "set a password".
// Asks app/api/auth/password-reset to email a link to /auth/reset. If the
// server cannot send (Resend not configured or down), Firebase's built-in
// reset email is used instead, so a reset is always possible.

import { loadFirebase } from '@/lib/firebaseLoader';

export interface PasswordResetRequest {
  /** Ignored when idToken is given: the server uses the token's email. */
  email: string;
  recaptchaToken?: string | null;
  /** Signed-in caller: proves identity, replaces reCAPTCHA. */
  idToken?: string | null;
}

/**
 * Resolves when the request was accepted. Deliberately says nothing about
 * whether the address has an account. Throws an Error with a message fit to
 * show the user (invalid email, rate limit, failed security check).
 */
export async function requestPasswordReset({ email, recaptchaToken, idToken }: PasswordResetRequest): Promise<void> {
  const address = email.trim().toLowerCase();
  let data: any = null;
  let status = 0;
  try {
    const res = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ email: address, recaptchaToken: recaptchaToken || undefined }),
    });
    status = res.status;
    data = await res.json().catch(() => null);
  } catch {
    // Network failure reaching our server: try Firebase directly below.
  }

  if (data?.ok) return;
  if (data && !data.fallback) {
    throw new Error(data.error || 'Could not send the reset email. Please try again.');
  }
  if (!data && status >= 400 && status < 500) {
    throw new Error('Could not send the reset email. Please try again.');
  }

  // Fallback: Firebase's own email (lands on Firebase's reset page).
  const fb = await loadFirebase();
  try {
    await fb.sendPasswordResetEmail(fb.auth, address);
  } catch (err: any) {
    const code = String(err?.code || '');
    // Never reveal whether the account exists.
    if (code.includes('user-not-found')) return;
    if (code.includes('too-many-requests')) {
      throw new Error('Too many reset requests. Please wait a while and try again.');
    }
    if (code.includes('network-request-failed')) {
      throw new Error('Network problem. Check your connection and try again.');
    }
    throw new Error('Could not send the reset email. Please try again.');
  }
}
