// lib/rejectionReasons.ts
// Preset reasons an admin can pick when rejecting a Boss upgrade or coin
// recharge request. Client-safe (no secrets) — shared by the admin reject
// dialog, the API routes and the trader-facing request history.

export const SUPPORT_WHATSAPP_URL = 'https://wa.me/zaifears';

export const REJECTION_REASONS = [
  'Fund not received',
  'Transaction ID not found or does not match',
  'Amount paid does not match the request',
  'This Transaction ID was already used',
  'Sender number does not match the payment',
] as const;

export const MAX_REJECTION_REASON_LENGTH = 300;

/** Trim and clamp an admin-supplied reason; falls back when empty. */
export function normalizeRejectionReason(raw: unknown, fallback: string): string {
  const text = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!text) return fallback;
  return text.slice(0, MAX_REJECTION_REASON_LENGTH);
}
