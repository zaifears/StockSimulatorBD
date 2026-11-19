// lib/utils/slippage.ts
// Slippage guard for the trade route (docs/live-prices-plan.md §5).
//
// The client sends `quotedPrice`, the price the trader saw. The server STILL
// fills at its own Firestore price; the quote is only compared, never used
// for the fill, so this can't reopen the client-trusted-price hole closed in
// app/api/simulator/trade/route.ts. If the price moved more than the
// tolerance, the trade is refused with the current price so the trader can
// confirm again.
//
// Tolerance: 0.5% of the quoted price, but never less than one DSE tick
// (৳0.10). Below ৳20 a single tick is already more than 0.5% (at ৳3.20 it is
// 3.1%), so a pure 0.5% rule would interrupt every trade in a cheap stock
// whenever it moved at all.

import { toPaisa, fromPaisa } from './money';

export const SLIPPAGE_RATE = 0.005;
export const SLIPPAGE_MIN_PAISA = 10; // one DSE tick, ৳0.10

export interface SlippageCheck {
  ok: boolean;
  /** Allowed move, in taka. */
  tolerance: number;
}

/** Integer-paisa comparison, so floating point can't decide a borderline trade. */
export function checkSlippage(quotedPrice: number, currentPrice: number): SlippageCheck {
  const quoted = toPaisa(quotedPrice);
  const current = toPaisa(currentPrice);
  const tolerancePaisa = Math.max(Math.round(quoted * SLIPPAGE_RATE), SLIPPAGE_MIN_PAISA);
  return { ok: Math.abs(current - quoted) <= tolerancePaisa, tolerance: fromPaisa(tolerancePaisa) };
}

/** A usable quote: a finite positive price under the same sanity ceiling the client uses. */
export function isValidQuote(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1_000_000;
}
