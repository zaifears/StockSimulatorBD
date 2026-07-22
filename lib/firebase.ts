// lib/firebase.ts - CLIENT-SIDE Firebase with auto coin generation

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    GithubAuthProvider,
    onAuthStateChanged, 
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    isSignInWithEmailLink, 
    signInWithEmailLink,
    sendSignInLinkToEmail,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

export interface UserProfile {
    name?: string;
    age?: number;
    status?: 'School' | 'College' | 'University' | 'Job' | 'Other';
    email?: string;
    phone?: string;
    coins?: number;
}

interface SignUpProfileData {
    name: string;
    age: number | null;
    status: string;
    phone?: string;
    email: string;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Enhanced error checking - only throw in browser, not during build
if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
    console.error('🔥 Firebase configuration missing!');
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')));
}

// Safe initialization
let app: any;
let auth: any;
let db: any;
let googleProvider: any;
let githubProvider: any;

if (firebaseConfig.apiKey) {
  try {
    const apps = getApps();
    if (apps.length === 0) {
      // No apps initialized, create the default one
      app = initializeApp(firebaseConfig);
    } else {
      // Check if default app exists, if not create it
      app = apps.find(a => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Initialize providers after app is ready
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    githubProvider = new GithubAuthProvider();
    githubProvider.addScope('user:email');
    githubProvider.setCustomParameters({
      allow_signup: 'true'
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  // Fallback - create dummy objects to prevent crashes
  console.warn('Firebase not initialized - missing API key');
}

export const getActionCodeSettings = () => ({
    url: `${window.location.origin}/auth`,
    handleCodeInApp: true,
});

// 🎯 Social login result: Create user doc if needed
// Welcome bonus is handled centrally by AuthContext.grantWelcomeBonus() via onAuthStateChanged
export const handleSocialSignInResult = async (user: any) => {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    
    // Create user doc if it doesn't exist (merge to avoid race with onAuthStateChanged)
    if (!docSnap.exists()) {
        await setDoc(userDocRef, {
            name: user.displayName || user.email?.split('@')[0] || 'User', 
            email: user.email,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            age: null, 
            status: 'Other', 
            phone: '',
            provider: user.providerData[0]?.providerId || 'unknown',
            createdAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Social user document created');
    }
    
    // Welcome bonus is granted by AuthContext.grantWelcomeBonus() via onAuthStateChanged
    // This ensures a single, centralized bonus path for all user types
    
    return user;
};

/**
 * Detect if user is in an in-app browser (Instagram, Facebook, TikTok, LinkedIn, etc.)
 * These browsers block Google OAuth with 403: disallowed_useragent
 */
export const isInAppBrowser = (): boolean => {
    if (typeof window === 'undefined' || !navigator?.userAgent) return false;
    const ua = navigator.userAgent.toLowerCase();
    return /fban|fbav|instagram|linkedinapp|tiktok|snapchat|twitter|wv|webview|micromessenger|line\/|kakaotalk|naver|daum|samsung browser\/\d.*mobile vr/i.test(ua)
        || (ua.includes('android') && !ua.includes('chrome'));
};

const getAuthErrorCode = (error: any): string => {
  if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
    return error.code;
  }

  const message = String(error?.message || '');
  const match = message.match(/auth\/[a-z-]+/i);
  return match ? match[0].toLowerCase() : '';
};

const hasAuthErrorCode = (error: any, code: string): boolean => {
  return getAuthErrorCode(error) === code;
};

export const signInWithSocialProviderAndCreateProfile = async (
    provider: GoogleAuthProvider | GithubAuthProvider
) => {
  if (!auth) {
    const configError = new Error('Firebase Auth is not initialized.') as Error & { code?: string };
    configError.code = 'auth/configuration-not-found';
    throw configError;
  }

    // Redirect is only used for in-app browsers where popup is often unsupported.
    if (isInAppBrowser()) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('stocksimulatorbd_oauth_redirect', Date.now().toString());
      }
      await signInWithRedirect(auth, provider);
      return null;
    }

    try {
      // Strict stable path: popup-only for normal browsers.
      console.log('🔐 Attempting popup OAuth...');
      const result = await signInWithPopup(auth, provider);
      return await handleSocialSignInResult(result.user);
    } catch (error: any) {
      if (hasAuthErrorCode(error, 'auth/internal-error')) {
        try {
          console.warn('⚠️ Popup OAuth hit auth/internal-error, retrying once...');
          const retryResult = await signInWithPopup(auth, provider);
          return await handleSocialSignInResult(retryResult.user);
        } catch (retryError: any) {
          if (
            hasAuthErrorCode(retryError, 'auth/internal-error') ||
            hasAuthErrorCode(retryError, 'auth/popup-blocked') ||
            hasAuthErrorCode(retryError, 'auth/network-request-failed')
          ) {
            try {
              console.warn(`⚠️ Popup OAuth still failing (${getAuthErrorCode(retryError) || 'unknown'}). Switching to redirect fallback...`);
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('stocksimulatorbd_oauth_redirect', Date.now().toString());
              }
              await signInWithRedirect(auth, provider);
              return null;
            } catch (redirectError: any) {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
              }
              const wrappedError = new Error('Sign-in could not be completed using popup or redirect.') as Error & { code?: string };
              wrappedError.code = 'auth/redirect-failed';
              throw wrappedError;
            }
          }
          throw retryError;
        }
      }

      if (hasAuthErrorCode(error, 'auth/popup-blocked')) {
        try {
          console.warn('⚠️ Popup blocked in standard browser. Switching to redirect fallback...');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('stocksimulatorbd_oauth_redirect', Date.now().toString());
          }
          await signInWithRedirect(auth, provider);
          return null;
        } catch (redirectError: any) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
          }
          const wrappedError = new Error('Popup and redirect sign-in were both blocked.') as Error & { code?: string };
          wrappedError.code = 'auth/redirect-failed';
          throw wrappedError;
        }
      }

      if (hasAuthErrorCode(error, 'auth/network-request-failed')) {
        try {
          console.warn('⚠️ Popup OAuth network handoff failed. Switching to redirect fallback...');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('stocksimulatorbd_oauth_redirect', Date.now().toString());
          }
          await signInWithRedirect(auth, provider);
          return null;
        } catch (redirectError: any) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
          }
          const wrappedError = new Error('Social sign-in failed due to network issues in popup and redirect flows.') as Error & { code?: string };
          wrappedError.code = 'auth/redirect-failed';
          throw wrappedError;
        }
      }

      if (hasAuthErrorCode(error, 'auth/operation-not-supported-in-this-environment')) {
        const envError = new Error('Popup sign-in is not supported in this browser environment.') as Error & { code?: string };
        envError.code = 'auth/operation-not-supported-in-this-environment';
        throw envError;
      }

      // User closed popup or cancelled — re-throw for caller to handle
      if (hasAuthErrorCode(error, 'auth/popup-closed-by-user') || hasAuthErrorCode(error, 'auth/cancelled-popup-request')) {
        throw error;
      }

      console.warn('⚠️ Social OAuth failed:', error?.code || error?.message || error);
      throw error;
    }
};

export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            return await handleSocialSignInResult(result.user);
        }
        return null;
  } catch (error: any) {
    const nonFatalRedirectCodes = new Set(['auth/no-auth-event', 'auth/internal-error']);
    const resolvedCode = getAuthErrorCode(error);
    if (nonFatalRedirectCodes.has(resolvedCode)) {
      console.warn(`ℹ️ Non-fatal redirect auth error ignored: ${resolvedCode}`);
      return null;
    }
    console.error('Redirect result error:', error);
    throw error;
    }
};

// 🔒 Email signup: coins: 0 (requires verification for coins)
export const signUpWithEmailPasswordAndProfile = async (profileData: SignUpProfileData, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, profileData.email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: profileData.name });
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
        name: profileData.name,
        age: profileData.age,
        status: profileData.status,
        phone: profileData.phone || null,
        email: profileData.email,
        provider: 'password',
        createdAt: new Date().toISOString()
    });
    await sendEmailVerification(user);
    return user;
};

export const updateUserProfile = async (userId: string, data: any) => {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data, { merge: true });
};

export const getUserProfile = async (userId: string) => {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists() ? docSnap.data() as UserProfile : null;
};

export { 
    auth, 
    db,
    googleProvider,
    githubProvider,
    onAuthStateChanged, 
    isSignInWithEmailLink, 
    signInWithEmailLink,
    sendSignInLinkToEmail,
    signInWithEmailAndPassword,
    getRedirectResult
};

// ✅ Password Change Function
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = auth.currentUser;
  
  if (!user || !user.email) {
    throw new Error('No user is currently logged in');
  }

  try {
    // Re-authenticate user with their current password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update to new password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak. Use at least 8 characters');
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please log out and log back in, then try again');
    }
    throw new Error(error.message || 'Failed to change password');
  }
};

/**
 * Get fresh Firebase ID token with automatic refresh
 * Solves Issue #3: Token Expiry - ensures token is valid before API calls
 * @param forceRefresh - Force refresh even if token is valid (recommended for critical operations)
 * @returns Fresh ID token or null if not authenticated
 */
export const getFreshToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    // forceRefresh: true will refresh token even if not expired
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Failed to get fresh token:', error);
    return null;
  }
};
