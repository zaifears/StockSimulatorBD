'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification,
  getRedirectResult 
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleSocialSignInResult } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { updateUserCount } from '@/lib/utils/updateStats';

// ✅ localStorage cache interface
interface CachedUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  lastSync: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  accountTier: 'Bro' | 'Boss';
  isBoss: boolean;
  sendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  isEmailVerified: false,
  accountTier: 'Bro',
  isBoss: false,
  sendVerificationEmail: async () => {},
  refreshVerificationStatus: async () => {},
  logout: async () => {}
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [accountTier, setAccountTier] = useState<'Bro' | 'Boss'>('Bro');
  const [isBoss, setIsBoss] = useState<boolean>(false);
  const [userCountUpdated, setUserCountUpdated] = useState(false);
  const userCountUpdatedRef = useRef(false);
  const welcomeBonusAttemptedRef = useRef(false);
  // Track whether we're still resolving a redirect OAuth callback.
  // Keeps `loading: true` so the UI never flashes the login page.
  const [redirectChecked, setRedirectChecked] = useState(false);
  const router = useRouter();

  // ✅ Handle OAuth redirect callback (when user returns from Google/GitHub auth)
  // This MUST resolve before we allow `loading` to become `false`.
  useEffect(() => {
    const handleRedirectResult = async () => {
      const hadPendingRedirect = typeof window !== 'undefined'
        && !!sessionStorage.getItem('stocksimulatorbd_oauth_redirect');

      // Strict popup-first: only attempt redirect result handling
      // if this session explicitly initiated redirect OAuth.
      if (!hadPendingRedirect) {
        setRedirectChecked(true);
        return;
      }

      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          console.log('✅ User authenticated via redirect OAuth');
          await handleSocialSignInResult(result.user);
          // Clear the redirect flag on success
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
          }
          // onAuthStateChanged will pick up the user from here
        } else if (hadPendingRedirect) {
          // Redirect was initiated but getRedirectResult returned null.
          // This usually means third-party cookies are blocked (Chrome 115+/Safari)
          // or the redirect session was lost.
          console.warn('⚠️ OAuth redirect returned no result — redirect may have failed silently');
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
            sessionStorage.setItem('stocksimulatorbd_oauth_error',
              'Google sign-in didn\u2019t complete. Your browser may be blocking the redirect. Please try again \u2014 a popup will be used instead.'
            );
          }
        }
      } catch (error: any) {
        // These can occur when there is no valid redirect result to consume.
        // Treat as non-fatal to avoid noisy console errors for normal page loads.
        const nonFatalRedirectCodes = new Set(['auth/no-auth-event', 'auth/internal-error']);
        if (nonFatalRedirectCodes.has(error?.code)) {
          if (hadPendingRedirect && typeof window !== 'undefined') {
            sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
            sessionStorage.setItem('stocksimulatorbd_oauth_error',
              'Social sign-in redirect did not complete. Please try again. If it still fails, use popup sign-in or email/password.'
            );
          } else {
            console.warn(`ℹ️ Ignoring non-fatal redirect auth error: ${error?.code}`);
          }
          return;
        }

        console.error('❌ Failed to handle OAuth redirect:', error.message);
        // Surface the error so the auth page can display it
        if (hadPendingRedirect && typeof window !== 'undefined') {
          sessionStorage.removeItem('stocksimulatorbd_oauth_redirect');
          sessionStorage.setItem('stocksimulatorbd_oauth_error',
            'Sign-in failed after redirect. Please try again.'
          );
        }
      } finally {
        // Signal that redirect resolution is complete
        setRedirectChecked(true);
      }
    };

    if (typeof window !== 'undefined') {
      handleRedirectResult();
    } else {
      // SSR – no redirect to handle
      setRedirectChecked(true);
    }
  }, []);

  // 🪙 Grant 10,000 welcome bonus to verified users (email AND social)
  // Multi-layer dedup: session ref → Firestore flag → server-side checks
  // Writes to simulator/state.balance (the real displayed balance)
  const grantWelcomeBonus = async (currentUser: User) => {
    // 🔒 LAYER 1: Session dedup
    if (welcomeBonusAttemptedRef.current) {
      return;
    }

    // 🔒 LAYER 2: Must be verified (social users are auto-verified)
    if (!currentUser.emailVerified) {
      return;
    }

    // 🔒 LAYER 3: Check Firestore flag (cross-session dedup)
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data()?.welcomeBonusGranted === true) {
        welcomeBonusAttemptedRef.current = true; // Don't re-check this session
        return;
      }
    } catch (checkErr) {
      console.error('❌ Failed to check bonus flag:', checkErr);
      return;
    }

    welcomeBonusAttemptedRef.current = true;
    const provider = currentUser.providerData[0]?.providerId || 'unknown';
    console.log(`🪙 Granting 10k bonus to verified user: ${currentUser.uid} (${provider})`);

    try {
      const idToken = await currentUser.getIdToken(true);
      const response = await fetch('/api/auth/grant-social-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Welcome bonus granted! New balance:', data.newBalance);
      } else {
        console.log('ℹ️ Welcome bonus status:', data.error || 'Already granted');
      }
    } catch (err) {
      console.error('❌ Failed to grant welcome bonus:', err);
      welcomeBonusAttemptedRef.current = false; // Allow retry
    }
  };

  // ✅ Load cached user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('stocksimulatorbd_user_cache');
        if (cached) {
          const cachedData: CachedUserData = JSON.parse(cached);
          const now = Date.now();
          const cacheAge = now - cachedData.lastSync;
          
          // Use cache if less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            setIsEmailVerified(cachedData.emailVerified);
            console.log('✅ Loaded user from localStorage cache');
          } else {
            // Cache expired
            localStorage.removeItem('stocksimulatorbd_user_cache');
          }
        }
      } catch (error) {
        console.error('Failed to load cached user:', error);
      }
    }
    // ✅ DON'T set loading to false here - let Firebase auth resolve it
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      // ✅ BLOCK ANONYMOUS USERS (Guest login disabled)
      if (user?.isAnonymous) {
        console.warn('⚠️ Anonymous users are disabled. Signing out...');
        // Clean up anonymous user's Firestore document to prevent orphan data
        try {
          const anonDocRef = doc(db, 'users', user.uid);
          const anonDoc = await getDoc(anonDocRef);
          if (anonDoc.exists()) {
            await deleteDoc(anonDocRef);
            console.log('🗑️ Cleaned up anonymous user document');
          }
        } catch (cleanupErr) {
          console.warn('Failed to clean up anonymous user document:', cleanupErr);
        }
        await signOut(auth);
        setUser(null);
        setIsEmailVerified(false);
        setUserCountUpdated(false);
        userCountUpdatedRef.current = false;
        setLoading(false);
        return;
      }
      
      setUser(user);
      
      if (user) {
        // ✅ Cache user to localStorage for instant reload
        const cachedData: CachedUserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          lastSync: Date.now()
        };
        
        try {
          localStorage.setItem('stocksimulatorbd_user_cache', JSON.stringify(cachedData));
        } catch (error) {
          console.warn('Failed to cache user to localStorage:', error);
        }
        
        // 🔧 CHECK EMAIL VERIFICATION STATUS
        await user.reload();
        const nowVerified = user.emailVerified;
        setIsEmailVerified(nowVerified);
        
        console.log(`📧 [Email Status] User: ${user.uid}, Verified: ${nowVerified}, Provider: ${user.providerData[0]?.providerId || 'unknown'}`);

        // 🪙 GRANT WELCOME BONUS for verified users
        // grantWelcomeBonus has multi-layer dedup (session ref → Firestore flag → server checks)
        if (nowVerified) {
          await grantWelcomeBonus(user);
        }
        
        // ✅ AUTOMATIC USER DOCUMENT CREATION & COUNT UPDATE
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          // Existence alone isn't proof of a profile: the disclaimer-consent
          // route (app/api/disclaimer/agree) can create this doc first with
          // nothing but a timestamp on it. Treat a doc with no createdAt as
          // still needing its profile, or the account stays nameless forever
          // and never shows up in registration analytics.
          if (!userDoc.exists() || !userData?.createdAt) {
            // ✅ NEW USER: Create document (merge:true to avoid overwriting if race with handleSocialSignInResult)
            console.log('🆕 New user detected, creating document...');
            
            // Determine provider
            const provider = user.providerData[0]?.providerId || 'email';
            const isGoogleUser = provider === 'google.com';
            const isGitHubUser = provider === 'github.com';
            
            await setDoc(userDocRef, {
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email,
              displayName: user.displayName || null,
              photoURL: user.photoURL || null,
              status: 'Other',
              provider: provider,
              accountTier: 'Bro',
              createdAt: new Date().toISOString(),
            }, { merge: true });
            
            setAccountTier('Bro');
            setIsBoss(false);
            console.log('✅ User document created with Bro tier');
            
            // ✅ FIXED: Pass user.uid to updateUserCount
            if (!userCountUpdatedRef.current) {
              userCountUpdatedRef.current = true;
              setUserCountUpdated(true);
              updateUserCount(user.uid).catch(err => 
                console.error('Failed to update user count:', err)
              );
            }
          } else {
            // Existing user: check tier and backfill accountTier if missing
            const activeBoss = (userData?.accountTier === 'Boss') || (typeof userData?.bossUntil === 'number' && userData.bossUntil > Date.now());
            const currentTier = activeBoss ? 'Boss' : 'Bro';
            setAccountTier(currentTier);
            setIsBoss(activeBoss);

            if (!userData.accountTier) {
              await setDoc(userDocRef, { accountTier: currentTier }, { merge: true });
            }
          }
          
        } catch (error) {
          console.error('❌ Failed to create or load user document:', error);
        }
        
        console.log('🔍 User email verified:', nowVerified);
      } else {
        setIsEmailVerified(false);
        setUserCountUpdated(false);
        userCountUpdatedRef.current = false;
        setAccountTier('Bro');
        setIsBoss(false);
      }
      
      // Don't set loading to false here directly — we gate it below
      // via the `authResolved` effect so we wait for BOTH
      // onAuthStateChanged AND getRedirectResult to finish.
      setAuthStateResolved(true);
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Loading is only false when BOTH Firebase auth state AND redirect result are settled.
  // This prevents the "bounce" — briefly showing the login page before the redirect
  // result resolves and logs the user in.
  const [authStateResolved, setAuthStateResolved] = useState(false);

  useEffect(() => {
    if (authStateResolved && redirectChecked) {
      setLoading(false);
    }
  }, [authStateResolved, redirectChecked]);

  const sendVerificationEmail = async () => {
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        console.log('✅ Verification email sent');
      } catch (error) {
        console.error('❌ Failed to send verification email:', error);
        throw error;
      }
    }
  };

  const refreshVerificationStatus = async () => {
    if (user) {
      try {
        await user.reload();
        const nowVerified = user.emailVerified;
        setIsEmailVerified(nowVerified);
        
        console.log('🔄 Refreshed verification status:', nowVerified);

        // 🪙 Grant welcome bonus if just verified
        if (nowVerified) {
          await grantWelcomeBonus(user);
        }
      } catch (error) {
        console.error('❌ Failed to refresh verification status:', error);
      }
    }
  };

  const logout = async () => {
    try {
      // ✅ Clear localStorage cache on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('stocksimulatorbd_user_cache');
      }
      
      await signOut(auth);
      setUser(null);
      setIsEmailVerified(false);
      setUserCountUpdated(false);
      userCountUpdatedRef.current = false;
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isEmailVerified,
      accountTier,
      isBoss,
      sendVerificationEmail,
      refreshVerificationStatus,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);