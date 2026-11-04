// lib/rejectionEmail.ts
// Tells a trader by email that their Boss upgrade or coin recharge request was
// rejected, with the admin's reason and a WhatsApp link to dispute it.
// Server-only: needs RESEND_API_KEY. Never throws — the rejection itself has
// already been saved, so a mail outage must not turn into an API error.

import { Resend } from 'resend';
import { getAuth } from 'firebase-admin/auth';
import { SUPPORT_WHATSAPP_URL } from '@/lib/rejectionReasons';
import { absoluteUrl } from '@/lib/siteUrl';

export interface RejectionEmailInput {
  to: string;
  userName?: string;
  kind: 'boss' | 'recharge';
  amountBdt?: number;
  /** Boss plan name, e.g. "1 Month" */
  planName?: string;
  /** Coins the recharge would have credited */
  coins?: number;
  trxId?: string;
  reason: string;
}

export interface RejectionEmailResult {
  sent: boolean;
  error?: string;
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function isPlausibleEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Thrown inside a reject transaction to return a specific HTTP status. */
export class RejectError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const EMAIL_TIMEOUT_MS = 8000;

/**
 * Send the rejection email to the trader's Firebase Auth email. Deliberately
 * NOT the request doc's `userEmail`: the trader's browser writes that field,
 * so trusting it would let anyone make us email an arbitrary address.
 * Never throws.
 */
export async function notifyRejection(
  userId: unknown,
  details: Omit<RejectionEmailInput, 'to'>
): Promise<RejectionEmailResult> {
  try {
    if (typeof userId !== 'string' || !userId) return { sent: false, error: 'Request has no userId' };
    const authUser = await getAuth().getUser(userId);
    const to = authUser.email || '';
    if (!isPlausibleEmail(to)) return { sent: false, error: 'No email on this account' };
    const result = await Promise.race([
      sendRejectionEmail({ ...details, userName: details.userName || authUser.displayName || undefined, to }),
      new Promise<RejectionEmailResult>((resolve) =>
        setTimeout(() => resolve({ sent: false, error: 'Email provider timed out' }), EMAIL_TIMEOUT_MS)
      ),
    ]);
    if (!result.sent) console.warn(`⚠️ Rejection email not sent to ${userId}: ${result.error}`);
    return result;
  } catch (error: any) {
    console.warn('⚠️ Rejection email failed:', error);
    return { sent: false, error: error?.message || 'Unknown error' };
  }
}

export async function sendRejectionEmail(input: RejectionEmailInput): Promise<RejectionEmailResult> {
  if (!process.env.RESEND_API_KEY) return { sent: false, error: 'RESEND_API_KEY not configured' };
  if (!isPlausibleEmail(input.to)) return { sent: false, error: 'No valid email for this user' };

  const isBoss = input.kind === 'boss';
  const what = isBoss ? 'Boss Tier upgrade' : 'coin recharge';
  const historyUrl = absoluteUrl(isBoss ? '/boss' : '/coins');
  // Client-written field: keep it short so it can't carry a pitch or a URL-length payload.
  const name = input.userName?.replace(/\s+/g, ' ').trim().slice(0, 40) || 'Trader';

  const rows: [string, string][] = [];
  if (isBoss && input.planName) rows.push(['Plan', input.planName]);
  if (typeof input.amountBdt === 'number') rows.push(['Amount', `৳${input.amountBdt.toLocaleString('en-US')}`]);
  if (!isBoss && typeof input.coins === 'number') rows.push(['Coins', input.coins.toLocaleString('en-US')]);
  if (input.trxId) rows.push(['Transaction ID', input.trxId]);

  const detailRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;color:#111827;font-size:13px;font-family:${label === 'Transaction ID' ? 'monospace' : 'inherit'}">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e5e7eb">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;color:#dc2626;text-transform:uppercase">Request not approved</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827">Your ${escapeHtml(what)} request was rejected</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">Hi ${escapeHtml(name)}, we reviewed your ${escapeHtml(what)} request and could not approve it.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;margin:0 0 16px">
        <p style="margin:0 0 2px;font-size:12px;color:#991b1b;font-weight:700">Reason</p>
        <p style="margin:0;font-size:14px;color:#7f1d1d">${escapeHtml(input.reason)}</p>
      </div>
      ${detailRows ? `<table style="width:100%;border-collapse:collapse;margin:0 0 16px">${detailRows}</table>` : ''}
      <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">If you think we made a mistake, please message us on WhatsApp with your Transaction ID and a screenshot of the payment, and we will check it again.</p>
      <a href="${SUPPORT_WHATSAPP_URL}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">Message us on WhatsApp</a>
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280">Or open <a href="${SUPPORT_WHATSAPP_URL}" style="color:#16a34a">${SUPPORT_WHATSAPP_URL}</a>. You can also see this request on <a href="${historyUrl}" style="color:#2563eb">your ${isBoss ? 'Boss' : 'Coins'} page</a>.</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#9ca3af;margin:16px 0 0">StockSimulatorBD · Practice trading on the Dhaka Stock Exchange</p>
  </div>
</body></html>`;

  const text = [
    `Hi ${name},`,
    '',
    `Your ${what} request was rejected.`,
    `Reason: ${input.reason}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `If you think we made a mistake, message us on WhatsApp with your Transaction ID: ${SUPPORT_WHATSAPP_URL}`,
    `See your requests: ${historyUrl}`,
  ].join('\n');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'StockSimulatorBD <hello@shahoriar.bd>',
      to: input.to.trim(),
      replyTo: process.env.ADMIN_EMAIL || 'hello@shahoriar.bd',
      subject: `Your ${what} request was rejected`,
      html,
      text,
    });
    if (response.error) return { sent: false, error: response.error.message };
    return { sent: true };
  } catch (error: any) {
    return { sent: false, error: error?.message || 'Unknown Resend error' };
  }
}
