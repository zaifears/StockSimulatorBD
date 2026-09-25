/**
 * API Client with Automatic Token Refresh
 * 🔒 Security Fix: Handles token expiry and automatic refresh
 * 
 * This utility ensures that before making API calls,
 * we get a fresh Firebase ID token with automatic retry on 401
 */

import { auth } from '@/lib/firebase';

interface FetchOptions extends RequestInit {
  forceTokenRefresh?: boolean;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Fetch wrapper that automatically includes fresh Firebase token
 * Handles 401 errors by refreshing the token and retrying once
 * 
 * @param url - API endpoint URL
 * @param options - Fetch options with optional forceTokenRefresh & maxRetries
 * @returns Response from API
 */
export async function fetchWithToken(url: string, options: FetchOptions = {}) {
  const { forceTokenRefresh = false, timeout = 30000, maxRetries = 1, ...fetchOptions } = options;
  
  let retryCount = 0;
  const maxRetryAttempts = Math.max(1, maxRetries); // At least 1 attempt

  while (retryCount <= maxRetryAttempts) {
    try {
      // 🔒 Sleep / Wake-up Grace: If auth.currentUser is temporarily restoring after computer sleep or tab throttle,
      // wait briefly if we know an authenticated session exists in localStorage.
      if (!auth.currentUser && typeof window !== 'undefined' && localStorage.getItem('stocksimulatorbd_user_cache')) {
        for (let i = 0; i < 4 && !auth.currentUser; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Get fresh token before API call
      // Force refresh if this is a retry (token may have expired)
      const shouldForceRefresh = forceTokenRefresh || retryCount > 0;
      let token: string | undefined;

      try {
        token = await auth.currentUser?.getIdToken(shouldForceRefresh);
      } catch (tokenErr: any) {
        console.warn(`⚠️ Token retrieval attempt ${retryCount + 1} failed (network reconnection):`, tokenErr?.message || tokenErr);
        if (retryCount < maxRetryAttempts) {
          retryCount++;
          const waitMs = 400 * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw new Error(`Token retrieval failed: ${tokenErr?.message || 'Network error'}`);
      }

      if (!token) {
        if (retryCount < maxRetryAttempts) {
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        throw new Error('User not authenticated - no valid token available');
      }

      // Add token to Authorization header
      const headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 🔑 Critical: If 401 (Unauthorized), token may have just expired
        // Retry once with forced token refresh
        if (response.status === 401 && retryCount < maxRetryAttempts) {
          console.warn(`⚠️ Token expired (401). Retrying with fresh token... (Attempt ${retryCount + 1}/${maxRetryAttempts})`);
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue; // Retry the loop with forced refresh
        }

        // All other responses (success, errors) are returned as-is
        if (response.status === 401) {
          console.error('❌ Authentication failed after token refresh. User may need to re-login.');
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    } catch (error) {
      console.error(`❌ API request failed (Attempt ${retryCount + 1}):`, error);
      
      // If we haven't exhausted retries, try again with backoff
      if (retryCount < maxRetryAttempts) {
        retryCount++;
        const waitMs = 400 * Math.pow(2, retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * 🔐 Wrapper for critical API operations (financial transactions, admin actions)
 * Always uses fresh tokens and retries on 401
 * 
 * Use this for:
 * - Coin transfers/purchases
 * - Admin user modifications
 * - Any authenticated state-changing operation
 */
export async function fetchWithFreshToken(url: string, options: FetchOptions = {}) {
  return fetchWithToken(url, {
    ...options,
    forceTokenRefresh: true,  // Always refresh for critical operations
    maxRetries: 2,            // Retry up to 2 times if token fails
  });
}

/**
 * Safe token retrieval for direct API calls
 * Use this when you need the token to manually construct headers
 * 
 * @param forceRefresh - Force Firebase to refresh the token
 * @returns Firebase ID token
 */
export async function getSafeAuthToken(forceRefresh: boolean = true): Promise<string> {
  try {
    if (!auth.currentUser && typeof window !== 'undefined' && localStorage.getItem('stocksimulatorbd_user_cache')) {
      for (let i = 0; i < 4 && !auth.currentUser; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    const token = await auth.currentUser?.getIdToken(forceRefresh);
    if (!token) {
      throw new Error('No authenticated user or token available');
    }
    return token;
  } catch (error: any) {
    console.error('❌ Failed to get auth token:', error);
    throw new Error(`Token retrieval failed: ${error.message}`);
  }
}
