#!/usr/bin/env node

/**
 * One-off cleanup: removes the legacy `coins` field from every `users/{uid}`
 * document in Firestore. That field belonged to the old, unused
 * users.coins gating currency (see AGENTS.md's "One currency" section) —
 * the app's only real currency now is `simulator/state.balance`, which this
 * script never touches.
 *
 * Before deleting anything, it writes a backup of every {uid, coins} pair it
 * is about to remove to scripts/legacy-coins-backup-<timestamp>.json, so the
 * removal is reversible if needed.
 *
 * Usage:
 *   node scripts/remove-legacy-coins-field.js           # dry run (default)
 *   node scripts/remove-legacy-coins-field.js --apply    # actually deletes
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 400; // stay under Firestore's 500-writes-per-batch limit

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE — this will delete the `coins` field for real.' : '🟡 DRY RUN — no writes will happen. Pass --apply to actually delete.');

  const usersSnap = await db.collection('users').get();
  const affected = usersSnap.docs.filter((doc) => Object.prototype.hasOwnProperty.call(doc.data(), 'coins'));

  console.log(`Scanned ${usersSnap.size} user documents. Found ${affected.length} with a legacy 'coins' field.`);

  if (affected.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  const backup = affected.map((doc) => ({ uid: doc.id, coins: doc.data().coins }));
  const backupPath = path.join(__dirname, `legacy-coins-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${backupPath}`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to delete the field for these users.');
    process.exit(0);
  }

  let processed = 0;
  for (let i = 0; i < affected.length; i += BATCH_SIZE) {
    const chunk = affected.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, { coins: FieldValue.delete() });
    }
    await batch.commit();
    processed += chunk.length;
    console.log(`Deleted 'coins' field for ${processed}/${affected.length} users`);
  }

  console.log('\n✅ Done. Legacy coins field removed from all affected user documents.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
