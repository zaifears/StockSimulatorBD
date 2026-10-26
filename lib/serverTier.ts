// lib/serverTier.ts
// Server-side tier management and automatic downgrade functions using Firebase Admin SDK.
// NEVER import this file in client components.

import type { Firestore } from 'firebase-admin/firestore';
import { isBossExpired, parseBossUntilMs } from './tier';

/**
 * Scans all Firestore user documents that have accountTier === 'Boss'.
 * If their bossUntil timestamp has passed (bossUntil > 0 && bossUntil <= now),
 * automatically batch-downgrades their accountTier to 'Bro'.
 * 
 * Safe, idempotent, and chunked in batches of 400 (under Firestore's 500 limit).
 * Returns the number of downgraded users.
 */
export async function autoDowngradeExpiredBossUsers(db: Firestore): Promise<number> {
  try {
    const nowMs = Date.now();
    const bossSnap = await db.collection('users').where('accountTier', '==', 'Boss').get();
    if (bossSnap.empty) return 0;

    const expiredDocs = bossSnap.docs.filter((doc) => {
      const data = doc.data();
      return isBossExpired(data, nowMs);
    });

    if (expiredDocs.length === 0) return 0;

    let downgradedCount = 0;
    const chunkSize = 400;

    for (let i = 0; i < expiredDocs.length; i += chunkSize) {
      const chunk = expiredDocs.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const doc of chunk) {
        batch.update(doc.ref, {
          accountTier: 'Bro',
          lastDowngradedAt: new Date(nowMs).toISOString(),
        });
        downgradedCount++;
      }

      await batch.commit();
    }

    if (downgradedCount > 0) {
      console.log(`[Tier Manager] 🔄 Auto-downgraded ${downgradedCount} expired Boss user(s) to Bro tier.`);
    }

    return downgradedCount;
  } catch (error) {
    console.error('[Tier Manager] ❌ Error during autoDowngradeExpiredBossUsers:', error);
    return 0;
  }
}

/**
 * Checks a single user's document data. If expired and still marked as 'Boss',
 * immediately downgrades them to 'Bro' in Firestore.
 */
export async function autoDowngradeUserIfExpired(
  db: Firestore,
  uid: string,
  userData: any
): Promise<boolean> {
  try {
    if (userData?.accountTier === 'Boss' && isBossExpired(userData)) {
      await db.collection('users').doc(uid).update({
        accountTier: 'Bro',
        lastDowngradedAt: new Date().toISOString(),
      });
      console.log(`[Tier Manager] 🔄 Auto-downgraded single user ${uid} to Bro tier.`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Tier Manager] ❌ Error downgrading user ${uid}:`, error);
    return false;
  }
}
