// lib/passwordResetEmail.ts
// The "reset your password" email. Server-only: needs RESEND_API_KEY.
// Sent by app/api/auth/password-reset/route.ts.

import { Resend } from 'resend';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface PasswordResetEmailInput {
  to: string;
  /** Link to /auth/reset carrying the one-time code. */
  resetUrl: string;
  /**
   * False when the account has only ever signed in with Google/GitHub/
   * Facebook, so the link adds a password instead of replacing one.
   */
  hasPassword: boolean;
  /** e.g. "Google" — named in the email when hasPassword is false. */
  socialProvider?: string;
}

const EMAIL_TIMEOUT_MS = 8000;

/** Never throws. Resolves true when Resend accepted the email. */
export async function sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const action = input.hasPassword ? 'Reset your password' : 'Set a password';
  const intro = input.hasPassword
    ? 'We got a request to reset the password for your StockSimulatorBD account.'
    : `We got a request to set a password for your StockSimulatorBD account. You currently sign in with ${input.socialProvider || 'a social account'}; that keeps working, and the password gives you a second way in.`;
  const url = escapeHtml(input.resetUrl);

  const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb">
      <h1 style="margin:0 0 12px;font-size:20px;color:#111827">${action}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(intro)}</p>
      <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:12px">${action}</a>
      <p style="margin:20px 0 0;font-size:13px;color:#374151;line-height:1.6">The link works once and expires in 1 hour. After you save the new password you will be signed out on every device and asked to sign in again.</p>
      <p style="margin:12px 0 0;font-size:13px;color:#374151;line-height:1.6">If you did not ask for this, ignore this email. Your account stays as it is.</p>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;line-height:1.6;word-break:break-all">Button not working? Copy this link into your browser:<br>${url}</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin:16px 0 0">StockSimulatorBD. Practice trading on the Dhaka Stock Exchange.</p>
  </div>
</body></html>`;

  const text = [
    intro,
    '',
    `${action}: ${input.resetUrl}`,
    '',
    'The link works once and expires in 1 hour. After you save the new password you will be signed out on every device and asked to sign in again.',
    'If you did not ask for this, ignore this email. Your account stays as it is.',
  ].join('\n');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const send = resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'StockSimulatorBD <hello@shahoriar.bd>',
      to: input.to.trim(),
      replyTo: process.env.ADMIN_EMAIL || 'hello@shahoriar.bd',
      subject: `${action} | StockSimulatorBD`,
      html,
      text,
    });
    const result = await Promise.race([
      send,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), EMAIL_TIMEOUT_MS)),
    ]);
    if (!result || result.error) {
      console.warn('⚠️ Password reset email not sent:', result?.error || 'timed out');
      return false;
    }
    return true;
  } catch (error) {
    console.warn('⚠️ Password reset email failed:', error);
    return false;
  }
}
