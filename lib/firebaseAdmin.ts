// lib/firebaseAdmin.ts
// Single source of truth for Firebase Admin SDK initialization. Server-only
// routes that need the Admin SDK can either do:
//   import '@/lib/firebaseAdmin'; // for side-effect init
// or import the helpers directly:
//   import { getAdminApp, getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

const DEFAULT_APP_NAME = '[DEFAULT]';

let adminAppInstance: App | null = null;
let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing required Firebase Admin SDK configuration. Check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  return {
    type: 'service_account',
    project_id: projectId,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
    universe_domain: 'googleapis.com',
  };
}

export function getAdminApp(): App {
  if (adminAppInstance) {
    return adminAppInstance;
  }

  const existingApp = getApps().find((app) => app.name === DEFAULT_APP_NAME);
  if (existingApp) {
    adminAppInstance = existingApp;
    return existingApp;
  }

  const serviceAccount = getServiceAccount();

  adminAppInstance = initializeApp({
    credential: cert(serviceAccount as any),
    projectId: serviceAccount.project_id,
  });

  return adminAppInstance;
}

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }
  const app = getAdminApp();
  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}

export function getAdminAuth(): Auth {
  if (adminAuthInstance) {
    return adminAuthInstance;
  }
  const app = getAdminApp();
  adminAuthInstance = getAuth(app);
  return adminAuthInstance;
}

// Side-effect auto-initialization when imported if credentials are present
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    getAdminApp();
  }
} catch {
  // Graceful catch for build steps or environments lacking credentials
}
