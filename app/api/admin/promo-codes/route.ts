// app/api/admin/promo-codes/route.ts
// Admin-only generation and disabling of promo_codes/{CODE} documents.
// Redemption is a separate, non-admin route: app/api/simulator/promo-redeem.
//
// firestore.rules gives admins read access to this collection directly (so
// the admin panel can list codes with a plain onSnapshot, same pattern as
// RechargeList.tsx), but zero write access to anyone — every code is
// created or disabled through this route via the Admin SDK.

import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAdminAccess } from '@/lib/utils/adminVerification';

// Ensure Firebase Admin is initialized with full credentials
import '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Safety valves — generous enough for real distribution batches, tight
// enough that a typo (an extra zero) can't silently mint an absurd amount
// of currency or spam thousands of documents in one call.
const MAX_AMOUNT_PER_CODE = 1_000_000;
const MAX_QUANTITY_PER_BATCH = 200;

// No 0/O/1/I/L — a code is read off a screen and typed back in, so the
// charset avoids characters that are easy to misread or mistype.
const CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARSET[randomInt(CODE_CHARSET.length)];
  }
  return out;
}

function normalizeCustomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body || {};

    const db = getFirestore();

    if (action === 'generate') {
      const rewardType = body.rewardType === 'boss' ? 'boss' : 'coins';
      const quantity = Number(body.quantity) || 1;
      const expiresInDays = body.expiresInDays != null ? Number(body.expiresInDays) : null;
      const customCode: string | undefined = body.customCode;

      let amount = 0;
      let bossDays: number | null = null;

      if (rewardType === 'boss') {
        bossDays = Math.floor(Number(body.bossDays || 31));
        if (!Number.isFinite(bossDays) || bossDays <= 0 || bossDays > 365) {
          return NextResponse.json(
            { success: false, error: 'Boss duration must be between 1 and 365 days' },
            { status: 400 }
          );
        }
      } else {
        amount = Math.floor(Number(body.amount));
        if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT_PER_CODE) {
          return NextResponse.json(
            { success: false, error: `Amount must be between 1 and ${MAX_AMOUNT_PER_CODE.toLocaleString()}` },
            { status: 400 }
          );
        }
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_BATCH) {
        return NextResponse.json(
          { success: false, error: `Quantity must be between 1 and ${MAX_QUANTITY_PER_BATCH}` },
          { status: 400 }
        );
      }
      if (expiresInDays != null && (!Number.isFinite(expiresInDays) || expiresInDays <= 0)) {
        return NextResponse.json({ success: false, error: 'Expiry must be a positive number of days' }, { status: 400 });
      }
      if (customCode != null && quantity !== 1) {
        return NextResponse.json({ success: false, error: 'A custom code can only be generated one at a time' }, { status: 400 });
      }

      const expiresAt = expiresInDays != null ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null;
      const nowIso = new Date().toISOString();

      const codes: string[] = [];
      if (customCode != null) {
        const normalized = normalizeCustomCode(customCode);
        if (!normalized) {
          return NextResponse.json(
            { success: false, error: 'Custom code must be 4-32 characters: letters, numbers, or hyphens' },
            { status: 400 }
          );
        }
        const existing = await db.doc(`promo_codes/${normalized}`).get();
        if (existing.exists) {
          return NextResponse.json({ success: false, error: `Code ${normalized} already exists` }, { status: 409 });
        }
        codes.push(normalized);
      } else {
        // Collision odds with an 8-char, 31-symbol charset are astronomically
        // low, but this is currency-bearing, so check rather than assume.
        const seen = new Set<string>();
        while (seen.size < quantity) {
          const candidate = generateCode();
          if (seen.has(candidate)) continue;
          const existing = await db.doc(`promo_codes/${candidate}`).get();
          if (!existing.exists) seen.add(candidate);
        }
        codes.push(...seen);
      }

      const batch = db.batch();
      for (const code of codes) {
        batch.set(db.doc(`promo_codes/${code}`), {
          code,
          rewardType,
          amount,
          bossDays,
          status: 'active',
          redeemed: false,
          redeemedBy: null,
          redeemedAt: null,
          expiresAt,
          createdBy: adminCheck.uid,
          createdAt: nowIso,
        });
      }
      await batch.commit();

      console.log(
        `[admin/promo-codes] ✓ ${adminCheck.uid} generated ${codes.length} ${rewardType} code(s) (reward: ${
          rewardType === 'boss' ? `${bossDays} days` : `৳${amount.toLocaleString()}`
        })`
      );

      return NextResponse.json({ success: true, codes, rewardType, amount, bossDays });
    }

    if (action === 'disable') {
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!code) {
        return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
      }

      const ref = db.doc(`promo_codes/${code}`);
      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists) throw new Error('Code not found');
        const status = snap.data()?.status;
        if (status === 'used') throw new Error('This code has already been redeemed and cannot be disabled');
        if (status === 'disabled') return; // already in the desired state
        transaction.update(ref, { status: 'disabled' });
      });

      return NextResponse.json({ success: true, message: `${code} disabled` });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Must be 'generate' or 'disable'" }, { status: 400 });
  } catch (error: any) {
    console.error('[admin/promo-codes] Failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Request failed' }, { status: 500 });
  }
}
