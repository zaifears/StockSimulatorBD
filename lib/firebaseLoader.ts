// lib/firebaseLoader.ts — loads the Firebase client SDK on demand.
//
// lib/firebase.ts pulls in firebase/app + firebase/auth + firebase/firestore
// (~138 KB gzipped) and, on mobile/Safari, Google's auth iframe. Anything that
// imports it statically puts all of that on the first load of every page,
// including for visitors who are not signed in. This module has no runtime
// Firebase import of its own, so it is cheap to import from shared components:
// call loadFirebase() where Firebase is actually needed.
//
// The session hint below only decides WHEN to load the SDK. It is never used
// for anything security-related: the server verifies ID tokens on every call.

import type { Unsubscribe } from 'firebase/firestore';

type FirebaseModule = typeof import('./firebase');

/** Set while a signInWithRedirect is in flight (see lib/firebase.ts). */
export const OAUTH_REDIRECT_KEY = 'stocksimulatorbd_oauth_redirect';
/** Written by AuthContext whenever a user is signed in; removed on logout. */
export const USER_CACHE_KEY = 'stocksimulatorbd_user_cache';
/** Lets EmailVerificationBanner say "check your inbox" after sign-up. */
export const VERIFICATION_SENT_KEY = 'stocksimulatorbd_verification_sent_at';

let firebasePromise: Promise<FirebaseModule> | null = null;
let firebaseLoaded = false;
const loadedListeners = new Set<() => void>();

/** Loads (once) and returns lib/firebase. Client-side only. */
export function loadFirebase(): Promise<FirebaseModule> {
  if (!firebasePromise) {
    firebasePromise = import('./firebase').then((m) => {
      m.ensureFirebase();
      return m;
    }).catch((err) => {
      firebasePromise = null; // allow a retry after a failed chunk load
      throw err;
    });
  }
  return firebasePromise;
}

/** Called by lib/firebase.ts once it has initialised Firebase (ensureFirebase). */
export function markFirebaseLoaded(): void {
  if (firebaseLoaded) return;
  firebaseLoaded = true;
  loadedListeners.forEach((cb) => cb());
  loadedListeners.clear();
}

/**
 * Runs cb once Firebase has been initialised: right away if it already has,
 * otherwise as soon as any page or component initialises it (ensureFirebase()
 * or loadFirebase()). Merely evaluating lib/firebase, as Next.js does when it
 * prefetches a route, does not count. Returns a function that cancels the wait.
 */
export function onFirebaseLoaded(cb: () => void): () => void {
  if (firebaseLoaded) {
    cb();
    return () => {};
  }
  loadedListeners.add(cb);
  return () => { loadedListeners.delete(cb); };
}

/**
 * True when this browser may hold a Firebase session, so the SDK should load
 * straight away. False only when we can positively see there is none.
 *
 * lib/firebase.ts persists auth in localStorage (browserLocalPersistence), so
 * a signed-in browser always has Firebase's own `firebase:authUser:<apiKey>:*`
 * key there. USER_CACHE_KEY is a second signal written by AuthContext. If
 * localStorage cannot be read we cannot tell, so we say yes.
 */
export function hasFirebaseSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(OAUTH_REDIRECT_KEY)) return true;
    if (localStorage.getItem(USER_CACHE_KEY)) return true;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (apiKey && localStorage.getItem(`firebase:authUser:${apiKey}:[DEFAULT]`)) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Slower second check for when hasFirebaseSessionHint() says no: looks for a
 * session in Firebase's IndexedDB store without loading the SDK. Sessions
 * from before 4.1.11 (when localStorage persistence was switched on) and
 * from browsers where Firebase fell back to IndexedDB live only there.
 * Takes a few milliseconds; resolves false when nothing is found or on error.
 */
export async function hasIndexedDbSession(): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined' || !apiKey) return false;
  const DB_NAME = 'firebaseLocalStorageDb';
  const STORE = 'firebaseLocalStorage';
  try {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      if (!dbs.some((d) => d.name === DB_NAME)) return false;
    }
    return await new Promise<boolean>((resolve) => {
      const req = indexedDB.open(DB_NAME);
      // The database does not exist: abort so we do not create an empty one.
      req.onupgradeneeded = () => req.transaction?.abort();
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
      req.onsuccess = () => {
        const db = req.result;
        try {
          if (!db.objectStoreNames.contains(STORE)) { db.close(); resolve(false); return; }
          const get = db.transaction(STORE, 'readonly').objectStore(STORE).get(`firebase:authUser:${apiKey}:[DEFAULT]`);
          get.onsuccess = () => { db.close(); resolve(!!get.result); };
          get.onerror = () => { db.close(); resolve(false); };
        } catch {
          db.close();
          resolve(false);
        }
      };
    });
  } catch {
    return false;
  }
}

/** True for a localStorage key that holds a Firebase auth session. */
export function isFirebaseAuthStorageKey(key: string | null): boolean {
  return !!key && key.startsWith('firebase:authUser:');
}

/**
 * For useEffect: starts an async subscription (e.g. a Firestore onSnapshot
 * that first has to load the SDK) and returns a cleanup that works whether
 * the subscription has started yet or not.
 */
export function subscribeWhenReady(start: () => Promise<Unsubscribe | void>): () => void {
  let cancelled = false;
  let unsubscribe: Unsubscribe | void;
  start()
    .then((unsub) => {
      if (cancelled) unsub?.();
      else unsubscribe = unsub;
    })
    .catch((err) => console.warn('Firebase subscription failed to start:', err));
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
