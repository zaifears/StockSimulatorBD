'use client';

import { useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface VerifyRecaptchaResult {
  success: boolean;
  score?: number;
  error?: string;
}

export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  const isConfigured = Boolean(siteKey);

  const verifyRecaptcha = useCallback(async (action: string): Promise<VerifyRecaptchaResult> => {
    if (!isConfigured) {
      return {
        success: false,
        error: 'Security verification is temporarily unavailable. Please try again later.',
      };
    }

    // If reCAPTCHA is not available, block the action
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not ready yet');
      return { success: false, error: 'Security verification loading. Please wait a moment and try again.' };
    }

    try {
      // Get reCAPTCHA token from Google
      const token = await executeRecaptcha(action);

      if (!token) {
        return { success: false, error: 'Failed to get reCAPTCHA token' };
      }

      // Verify token with our backend
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, action }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'reCAPTCHA verification failed',
          score: data.score,
        };
      }

      return {
        success: true,
        score: data.score,
      };
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return {
        success: false,
        error: 'Failed to verify reCAPTCHA. Please try again.',
      };
    }
  }, [executeRecaptcha, isConfigured]);

  // A raw token for routes that verify reCAPTCHA themselves (a token can be
  // verified only once, so it must not also go through verifyRecaptcha).
  const getRecaptchaToken = useCallback(async (action: string): Promise<string | null> => {
    if (!isConfigured || !executeRecaptcha) return null;
    try {
      return (await executeRecaptcha(action)) || null;
    } catch {
      return null;
    }
  }, [executeRecaptcha, isConfigured]);

  return { verifyRecaptcha, getRecaptchaToken, isReady: !!executeRecaptcha, isConfigured };
}
