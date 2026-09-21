// lib/firebaseSeoAdmin.ts
// Single source of truth for the dedicated SEO Firebase Project Admin SDK initialization.
// This project is completely isolated from the production trading and user database.
// All SEO crawls, GSC caches, AI observations, audit logs, and migration states
// are stored strictly in this secondary Firestore instance.

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const SEO_APP_NAME = 'seo-intelligence';

let seoDbInstance: Firestore | null = null;
let seoAppInstance: App | null = null;

export function getSeoApp(): App {
  if (seoAppInstance) {
    return seoAppInstance;
  }

  const existingApp = getApps().find((app) => app.name === SEO_APP_NAME);
  if (existingApp) {
    seoAppInstance = existingApp;
    return existingApp;
  }

  const projectId = process.env.SEO_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.SEO_FIREBASE_CLIENT_EMAIL;
  // Handle newline escape characters properly for multiline private keys
  const privateKey = process.env.SEO_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing required SEO Firebase Admin SDK configuration. ' +
        'Check environment variables: SEO_FIREBASE_PROJECT_ID, SEO_FIREBASE_CLIENT_EMAIL, SEO_FIREBASE_PRIVATE_KEY'
    );
  }

  const prodProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId && prodProjectId && projectId === prodProjectId) {
    throw new Error(
      `FATAL: SEO_FIREBASE_PROJECT_ID ("${projectId}") matches production FIREBASE_PROJECT_ID. ` +
        'SEO intelligence data MUST be hosted in an isolated secondary Firebase project to protect production user and trading state.'
    );
  }

  seoAppInstance = initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    },
    SEO_APP_NAME
  );

  return seoAppInstance;
}

export function getSeoDb(): Firestore {
  if (seoDbInstance) {
    return seoDbInstance;
  }

  const app = getSeoApp();
  seoDbInstance = getFirestore(app);
  seoDbInstance.settings({ ignoreUndefinedProperties: true });
  return seoDbInstance;
}

/**
 * Health check to verify secondary Firebase project connectivity
 */
export async function checkSeoDbHealth(): Promise<{ ok: boolean; projectId?: string; error?: string }> {
  try {
    const db = getSeoDb();
    // Test read a lightweight config doc
    await db.collection('seo_config').doc('health').get();
    return {
      ok: true,
      projectId: process.env.SEO_FIREBASE_PROJECT_ID,
    };
  } catch (err: any) {
    return {
      ok: false,
      projectId: process.env.SEO_FIREBASE_PROJECT_ID,
      error: err?.message || 'Failed to connect to SEO Firestore',
    };
  }
}
