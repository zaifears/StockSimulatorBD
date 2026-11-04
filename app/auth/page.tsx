"use client"

import React, { useState, useEffect, useCallback, useRef, Component } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, signUpWithEmailPasswordAndProfile, googleProvider, githubProvider, facebookProvider, isFacebookLoginEnabled, isFacebookLoginLive, isSameSiteAuthDomain, isMetaInAppBrowser, signInWithSocialProviderAndCreateProfile, isInAppBrowser, sendMagicSignInLink, isMagicSignInLink, getPendingMagicLinkEmail, completeMagicSignIn } from '../../lib/firebase'
import { useRouter } from 'next/navigation'
import { validateEmail, validatePassword, sanitizeError, rateLimit, PASSWORD_RULES } from '../../lib/authUtils'
import { humanizeAuthError } from '../../lib/authErrorHandler'
import OptimizedImage from '../../components/shared/OptimizedImage'
import SocialAuth from '../../components/SocialAuth'
import GoogleOneTap from '../../components/GoogleOneTap'
import { Eye, EyeOff, Check, Circle, Mail } from 'lucide-react'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import { useRecaptcha } from '@/hooks/useRecaptcha'
import { trackAuthClick, markPendingAuthMethod } from '@/lib/authMethodTracking'

// Inner component that uses reCAPTCHA
function AuthPageContent({ recaptchaEnabled }: { recaptchaEnabled: boolean }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    status: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)
  const [showSignupSuccess, setShowSignupSuccess] = useState(false)
  const [inAppBrowser, setInAppBrowser] = useState(false)
  const [metaInAppBrowser, setMetaInAppBrowser] = useState(false)
  const [redirectSignInWorks, setRedirectSignInWorks] = useState(false)
  // Magic link: address the link was sent to, and whether we're finishing a
  // link opened on a device/browser that doesn't know the address.
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null)
  const [finishingMagicLink, setFinishingMagicLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  // Guards for Google One Tap: don't initialize/prompt once we already know
  // a session exists (about to redirect away) or a redirect-based OAuth
  // flow is already in flight — avoids a race between two sign-in attempts.
  const [hasExistingSession, setHasExistingSession] = useState(false)
  const [oauthRedirectPending, setOauthRedirectPending] = useState(false)
  // Synchronous in-flight guard for credential submits. `isLoading` cannot do
  // this job: it is React state, so it only takes effect on the next render,
  // and handleSignUp/handleSignIn both `await` (reCAPTCHA) *before* setting
  // it — leaving a window where a second click re-enters the handler and
  // fires a second createUserWithEmailAndPassword concurrently, which can
  // create duplicate accounts in the same second. A ref flips synchronously,
  // closing that window.
  const submitInFlightRef = useRef(false)
  const router = useRouter()
  const { verifyRecaptcha: verifyRecaptchaToken, isReady: isRecaptchaReady, isConfigured } = useRecaptcha()
  const enforceRecaptcha = recaptchaEnabled && process.env.NODE_ENV === 'production'
  const googleOneTapClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()

  const canUseSocialOAuthHere = () => {
    if (typeof window === 'undefined') return true
    const { protocol, hostname } = window.location
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
    const isSecure = protocol === 'https:'
    return isSecure || isLocalhost
  }

  // Detect in-app browser on mount
  useEffect(() => {
    setInAppBrowser(isInAppBrowser())
    setMetaInAppBrowser(isMetaInAppBrowser())
    setRedirectSignInWorks(isSameSiteAuthDomain())
  }, [])

  // Opened from a magic sign-in link: finish signing in. If this browser
  // doesn't have the address saved (link opened on another device, or in the
  // mail app's own browser), ask for it instead of failing.
  useEffect(() => {
    if (typeof window === 'undefined' || !isMagicSignInLink(window.location.href)) return
    const saved = getPendingMagicLinkEmail()
    if (!saved) {
      setFinishingMagicLink(true)
      setIsSignUp(false)
      setMessage('Confirm your email address to finish signing in.')
      return
    }
    setIsLoading(true)
    setMessage('Signing you in…')
    markPendingAuthMethod('email_link')
    completeMagicSignIn(saved, window.location.href)
      .catch((err) => {
        setMessage('')
        setError(humanizeAuthError(err))
      })
      .finally(() => setIsLoading(false))
  }, [])

  // reCAPTCHA verification helper
  const verifyRecaptcha = async (action: string): Promise<boolean> => {
    try {
      const result = await verifyRecaptchaToken(action)
      if (!result.success) {
        setError(result.error || 'Security verification failed. Please try again.')
        return false
      }
      return true
    } catch (err) {
      console.error('reCAPTCHA verification error:', err)
      setError('Security verification failed. Please refresh and try again.')
      return false
    }
  }

  useEffect(() => {
    const msg = sessionStorage.getItem('redirectMessage')
    if (msg) {
      setRedirectMessage(msg)
      sessionStorage.removeItem('redirectMessage')
    }

    // Check if user returned from a failed OAuth redirect
    const oauthError = sessionStorage.getItem('stocksimulatorbd_oauth_error')
    if (oauthError) {
      setError(oauthError)
      sessionStorage.removeItem('stocksimulatorbd_oauth_error')
    }

    // A redirect-based OAuth flow (in-app browser / popup fallback) is
    // already in flight — keep Google One Tap off until it resolves.
    setOauthRedirectPending(!!sessionStorage.getItem('stocksimulatorbd_oauth_redirect'))

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setHasExistingSession(true)
        const queryRedirect =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('redirect')
            : null
        const safeQueryRedirect =
          queryRedirect && queryRedirect.startsWith('/') && !queryRedirect.startsWith('//')
            ? queryRedirect
            : null
        const redirectPath = safeQueryRedirect || sessionStorage.getItem('redirectAfterLogin') || '/profile'
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectPath)
      }
    })

    return () => unsubscribe()
  }, [router])

  // Fix reCAPTCHA badge z-index
  useEffect(() => {
    const fixRecaptchaBadge = () => {
      const badge = document.querySelector('.grecaptcha-badge') as HTMLElement
      if (badge) {
        // Remove any inline width Google sets so our CSS collapse works
        badge.style.removeProperty('width')
      }
    }

    // Run immediately
    fixRecaptchaBadge()

    // Also run on window resize
    window.addEventListener('resize', fixRecaptchaBadge)

    // Keep checking for the badge if it's not there yet (Google loads it async)
    const checkInterval = setInterval(fixRecaptchaBadge, 500)

    // Clean up after 5 seconds of checking
    const timeout = setTimeout(() => clearInterval(checkInterval), 5000)

    return () => {
      window.removeEventListener('resize', fixRecaptchaBadge)
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
    setShowSignupSuccess(false)
  }, [])

  const handleSignUp = async () => {
    // Must be the very first thing, before any await — see submitInFlightRef.
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true

    try {
    // Local checks first: a typo here must never count as an attempt
    // against the rate limit below (it used to lock people out after five
    // tries without ever reaching Firebase).
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!formData.name?.trim() || formData.name.length < 2) {
      setError('Please enter a valid name (at least 2 characters).')
      return
    }

    if (!rateLimit(`signup:${formData.email.trim().toLowerCase()}`)) {
      setError('Too many sign-up attempts from this browser. Please wait 15 minutes, or continue with Google.')
      return
    }

    // Enforce reCAPTCHA only in production for credential flows.
    if (enforceRecaptcha) {
      const isHuman = await verifyRecaptcha('signup')
      if (!isHuman) return
    }

    setIsLoading(true)
    setError('')
    setShowSignupSuccess(false)

    try {
      const profileData = {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        age: formData.age ? Math.max(13, Math.min(100, parseInt(formData.age, 10))) : null,
        status: formData.status,
        phone: formData.phone?.trim()
      }

      trackAuthClick('email_password')
      await signUpWithEmailPasswordAndProfile(profileData, formData.password)
      setMessage('Account created! Please check your email for verification.')
      setShowSignupSuccess(true)
    } catch (err: any) {
      setError(humanizeAuthError(err))
    } finally {
      setIsLoading(false)
    }
    } finally {
      submitInFlightRef.current = false
    }
  }

  const handleSignIn = async () => {
    // Must be the very first thing, before any await — see submitInFlightRef.
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true

    try {
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!formData.password) {
      setError('Please enter your password.')
      return
    }

    if (!rateLimit(`signin:${formData.email.trim().toLowerCase()}`)) {
      setError('Too many sign-in attempts from this browser. Wait 15 minutes, or use "Forgot password?" to reset it.')
      return
    }

    // Enforce reCAPTCHA only in production for credential flows.
    if (enforceRecaptcha) {
      const isHuman = await verifyRecaptcha('signin')
      if (!isHuman) return
    }

    setIsLoading(true)
    setError('')
    setShowSignupSuccess(false)

    try {
      trackAuthClick('email_password')
      await signInWithEmailAndPassword(auth, formData.email.trim().toLowerCase(), formData.password)
    } catch (err: any) {
      setError(humanizeAuthError(err))
    } finally {
      setIsLoading(false)
    }
    } finally {
      submitInFlightRef.current = false
    }
  }

  const handleGoogleSignIn = async () => {
    if (!canUseSocialOAuthHere()) {
      setError('Google/GitHub sign-in requires HTTPS (or localhost). On phone over LAN IP, use an HTTPS tunnel (for example ngrok) and add that domain to Firebase Authorized Domains.')
      return
    }

    setIsLoading(true)
    setError('')
    setShowSignupSuccess(false)
    setMessage('Connecting to Google...')
    trackAuthClick('google')

    try {
      await signInWithSocialProviderAndCreateProfile(googleProvider)
      // If popup was used, the result is handled here.
      // If redirect was used (popup blocked), the page navigates away.
    } catch (err: any) {
      setError(humanizeAuthError(err))
      console.warn('Google sign-in handled error:', err?.code || err?.message || err)
    } finally {
      setIsLoading(false)
      setMessage('')
    }
  }

  const handleGitHubSignIn = async () => {
    if (!canUseSocialOAuthHere()) {
      setError('Google/GitHub sign-in requires HTTPS (or localhost). On phone over LAN IP, use an HTTPS tunnel (for example ngrok) and add that domain to Firebase Authorized Domains.')
      return
    }

    setIsLoading(true)
    setError('')
    setShowSignupSuccess(false)

    try {
      trackAuthClick('github')
      await signInWithSocialProviderAndCreateProfile(githubProvider)
    } catch (err: any) {
      setError(humanizeAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const getSafeRedirect = (): string | null => {
    const q = new URLSearchParams(window.location.search).get('redirect')
    if (q && q.startsWith('/') && !q.startsWith('//')) return q
    return sessionStorage.getItem('redirectAfterLogin')
  }

  const handleSendMagicLink = async () => {
    if (submitInFlightRef.current) return
    const email = formData.email.trim().toLowerCase()
    if (!validateEmail(email)) {
      setError('Enter your email address above first, then tap "Email me a sign-in link".')
      return
    }
    if (!rateLimit(`emaillink:${email}`)) {
      setError('Too many sign-in links requested from this browser. Please wait 15 minutes and check your inbox for the earlier ones.')
      return
    }
    submitInFlightRef.current = true
    try {
      if (enforceRecaptcha) {
        const isHuman = await verifyRecaptcha('email_link')
        if (!isHuman) return
      }
      setIsLoading(true)
      setError('')
      setMessage('')
      trackAuthClick('email_link')
      await sendMagicSignInLink(email, getSafeRedirect())
      setMagicLinkSentTo(email)
    } catch (err: any) {
      setError(humanizeAuthError(err))
    } finally {
      setIsLoading(false)
      submitInFlightRef.current = false
    }
  }

  const handleFinishMagicLink = async () => {
    const email = formData.email.trim().toLowerCase()
    if (!validateEmail(email)) {
      setError('Please enter the email address the link was sent to.')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      markPendingAuthMethod('email_link')
      await completeMagicSignIn(email, window.location.href)
      setMessage('Signing you in…')
    } catch (err: any) {
      const code = String(err?.code || '')
      setError(code.includes('auth/invalid-email')
        ? 'That email doesn\u2019t match the address this link was sent to.'
        : humanizeAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    if (!canUseSocialOAuthHere()) {
      setError('Facebook sign-in requires HTTPS (or localhost).')
      return
    }

    setIsLoading(true)
    setError('')
    setShowSignupSuccess(false)

    try {
      trackAuthClick('facebook')
      await signInWithSocialProviderAndCreateProfile(facebookProvider)
    } catch (err: any) {
      const code = String(err?.code || '')
      const closedWithoutSigningIn =
        code.includes('auth/popup-closed-by-user') || code.includes('auth/cancelled-popup-request')
      // While Meta's App Review is pending, Facebook shows non-tester accounts
      // an "App not active" page and the person just closes the popup. Say
      // what's going on instead of "Sign-in was cancelled". Set
      // NEXT_PUBLIC_FACEBOOK_LOGIN_LIVE=true on Vercel once the Meta app is
      // published to switch this back to the normal message.
      if (closedWithoutSigningIn && !isFacebookLoginLive) {
        setError('Facebook sign-in is being activated. Please use Google or email for now.')
      } else {
        setError(humanizeAuthError(err))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email?.trim()) {
      setError('Please enter your email address first.')
      return
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!rateLimit(`forgot:${formData.email}`)) {
      setError('Too many password reset attempts. Please try again later.')
      return
    }

    // Enforce reCAPTCHA only in production for credential flows.
    if (enforceRecaptcha) {
      const isHuman = await verifyRecaptcha('forgot_password')
      if (!isHuman) return
    }

    setIsLoading(true)
    setError('')
    setMessage('')
    try {
      await sendPasswordResetEmail(auth, formData.email.trim().toLowerCase())
      setMessage('Password reset email sent! Check your inbox.')
    } catch (err: any) {
      setError(humanizeAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (enforceRecaptcha && !isConfigured) {
      setError('Security verification is unavailable right now. Please try again later.')
      return
    }
    if (enforceRecaptcha && !isRecaptchaReady) {
      setError('Security verification is loading. Please wait a moment and try again.')
      return
    }
    if (isLoading) return
    if (finishingMagicLink) {
      handleFinishMagicLink()
      return
    }
    isSignUp ? handleSignUp() : handleSignIn()
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#090E17] transition-colors duration-300 flex flex-col items-center justify-center px-4 py-8 pt-24 pb-12 sm:p-8 sm:pt-28 relative z-0 overflow-hidden">
      {/* Grid pattern + ambient glows — matches homepage hero background */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]" aria-hidden="true"></div>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/20 blur-[100px] rounded-full"></div>
        <div className="absolute top-40 left-10 w-64 h-64 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[100px]"></div>
      </div>

      {/* Google One Tap — invisible mount point. Renders no visible UI of its
          own; it only shows Google's own floating "Sign in as..." card for
          eligible returning users. The existing "Continue with Google"
          button below remains the guaranteed fallback if it doesn't show. */}
      <GoogleOneTap
        clientId={googleOneTapClientId}
        disabled={
          !canUseSocialOAuthHere() ||
          inAppBrowser ||
          hasExistingSession ||
          oauthRedirectPending ||
          isLoading
        }
        onError={(err) => setError(humanizeAuthError(err))}
        onSigningIn={setIsLoading}
      />

      {/* Main card - centered */}
      <div className="w-full max-w-4xl relative z-10 font-spaceGrotesk">
        <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-5 sm:p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">

          {/* 2-column grid: 1 col on mobile, 65/35 split on lg screens */}
          <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 sm:gap-8">

            {/* LEFT COLUMN - Form */}
            <div className="flex flex-col justify-center">
              {/* Redirect Message (shown when user is redirected from protected page) */}
              {redirectMessage && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 mb-6">
                  <p className="text-blue-700 dark:text-blue-300 text-sm text-center">{redirectMessage}</p>
                </div>
              )}

              {/* Sign In View */}
              {!isSignUp && (
                <>
                  <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal tracking-normal text-gray-900 dark:text-white mb-2">
                    Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">back!</span>
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Sign in to your account</p>

                  {!recaptchaEnabled && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-amber-900 dark:text-amber-200 text-sm">
                        Security verification is currently unavailable. Social sign-in remains available, and email/password auth is allowed in development.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {message && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-green-700 dark:text-green-300 text-sm text-center">{message}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>

                    {!finishingMagicLink && (<>
                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter your password"
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isLoading || (enforceRecaptcha && !isRecaptchaReady)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition disabled:opacity-50"
                      >
                        Forgot password?
                      </button>
                    </div>

                    </>)}

                    {/* Log In Button */}
                    <button
                      type="submit"
                      disabled={isLoading || (enforceRecaptcha && !isRecaptchaReady)}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing In...
                        </>
                      ) : finishingMagicLink ? (
                        'Finish signing in'
                      ) : (
                        'Log In'
                      )}
                    </button>
                  </form>

                  {/* Passwordless option: also works inside Facebook / Messenger browsers */}
                  {!finishingMagicLink && (
                    magicLinkSentTo ? (
                      <div className="mt-4 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 p-4" role="status">
                        <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
                          <Mail className="w-4 h-4 shrink-0" aria-hidden="true" /> Check your inbox
                        </p>
                        <p className="mt-1 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                          We sent a sign-in link to <strong className="break-all">{magicLinkSentTo}</strong>. Open it on this device to sign in. No password needed. It can take a minute, and may land in Spam or Promotions.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMagicLinkSentTo(null)}
                          className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                        >
                          Use a different email
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendMagicLink}
                        disabled={isLoading || (enforceRecaptcha && !isRecaptchaReady)}
                        className="mt-3 w-full min-h-[44px] py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4" aria-hidden="true" />
                        Email me a sign-in link instead
                      </button>
                    )
                  )}
                </>
              )}

              {/* Sign Up View */}
              {isSignUp && (
                <>
                  <h1 className="font-coolvetica text-2xl sm:text-4xl font-normal tracking-normal text-gray-900 dark:text-white mb-2">
                    Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">account</span>
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Join StockSimulatorBD today</p>

                  {showSignupSuccess && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-4 mb-6">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🎉</span>
                        <div className="flex-1 text-xs">
                          <h4 className="font-spaceGrotesk font-semibold text-green-800 dark:text-green-300 mb-1">Welcome to StockSimulatorBD!</h4>
                          <div className="text-green-700 dark:text-green-400 space-y-1">
                            <p>📧 Check your email and click the verification link</p>
                            <p>🪙 After verification, your 10,000 welcome coins will be credited automatically</p>
                            <p>🔄 Click "I Already Verified" in the banner after verification</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {message && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-4 mb-6">
                      <p className="text-green-700 dark:text-green-300 text-sm text-center">{message}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Full Name & Email in two columns on lg */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-3">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                        <input
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your name"
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Phone and age moved to /profile: sign-up asks only what's needed */}

                    {/* Password & Confirm Password in two columns on lg */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-3">
                      {/* Password */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                        <div className="relative">
                          <input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            aria-describedby="password-rules"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="Create a password"
                            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                        <div className="relative">
                          <input
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            aria-describedby="password-match"
                            required
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Re-enter password"
                            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live password rules: visible before submit, tick as you type */}
                    <div className="rounded-xl bg-gray-50 dark:bg-[#111418] border border-gray-200 dark:border-gray-800 px-3 py-2.5">
                      <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Your password needs:</p>
                      <ul id="password-rules" className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1" aria-label="Password requirements">
                        {PASSWORD_RULES.map((rule) => {
                          const ok = rule.test(formData.password)
                          return (
                            <li
                              key={rule.label}
                              className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              {ok ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Circle className="w-3 h-3 shrink-0" aria-hidden="true" />}
                              <span>{rule.label}<span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span></span>
                            </li>
                          )
                        })}
                      </ul>
                      {formData.confirmPassword && (
                        <p
                          id="password-match"
                          aria-live="polite"
                          className={`mt-1.5 flex items-center gap-1.5 text-xs ${formData.password === formData.confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          {formData.password === formData.confirmPassword ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Circle className="w-3 h-3 shrink-0" aria-hidden="true" />}
                          {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match yet'}
                        </p>
                      )}
                    </div>

                    {/* Sign Up Button */}
                    <button
                      type="submit"
                      disabled={isLoading || (enforceRecaptcha && !isRecaptchaReady)}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  {/* Toggle to Sign In */}
                  <div className="mt-4 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(false)
                          setError('')
                          setMessage('')
                          setShowSignupSuccess(false)
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT COLUMN - Social Auth (desktop only) */}
            <div className="hidden lg:flex flex-col justify-center gap-6 pt-0">
              {/* Show different content based on view */}
              {!isSignUp ? (
                // Sign In View - Show New Here Box
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6">
                  <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold mb-4">New here?</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError('');
                      setMessage('');
                      setShowSignupSuccess(false);
                    }}
                    className="w-full py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create Your Account
                  </button>
                  <p className="text-gray-500 dark:text-gray-400 text-xs text-center mt-4">
                    Join StockSimulatorBD
                  </p>
                </div>
              ) : (
                // Sign Up View - Show Sign In Link
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setError('');
                        setMessage('');
                        setShowSignupSuccess(false);
                      }}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}

              {/* Or Divider */}
              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
                <span className="px-3 text-gray-500 dark:text-gray-400 text-xs">or</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
              </div>

              {/* Social Buttons (shared with mobile) */}
              <SocialAuth
                handleGoogleSignIn={handleGoogleSignIn}
                handleGitHubSignIn={handleGitHubSignIn}
                handleFacebookSignIn={handleFacebookSignIn}
                showFacebook={isFacebookLoginEnabled}
                isLoading={isLoading}
                isInAppBrowser={inAppBrowser}
                isMetaInAppBrowser={metaInAppBrowser}
                redirectSignInWorks={redirectSignInWorks}
              />
            </div>
          </div>

          {/* Mobile Alternate Actions & Social Auth */}
          <div className="lg:hidden mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            {/* Social Auth Header */}
            <div className="flex items-center mb-4">
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
              <span className="px-3 text-gray-500 dark:text-gray-400 text-xs">
                {isSignUp ? 'Or sign up with' : 'Or sign in with'}
              </span>
              <div className="flex-1 border-t border-gray-200 dark:border-gray-800"></div>
            </div>

            {/* Social Auth Component */}
            <SocialAuth
              handleGoogleSignIn={handleGoogleSignIn}
              handleGitHubSignIn={handleGitHubSignIn}
              handleFacebookSignIn={handleFacebookSignIn}
              showFacebook={isFacebookLoginEnabled}
              isLoading={isLoading}
              isInAppBrowser={inAppBrowser}
              isMetaInAppBrowser={metaInAppBrowser}
              redirectSignInWorks={redirectSignInWorks}
            />

            {/* New Here Registration Box (Only show during Sign In) */}
            {!isSignUp && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5 mt-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold mb-3">New here?</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                    setMessage('');
                    setShowSignupSuccess(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Create Your Account
                </button>
                <p className="text-gray-500 dark:text-gray-400 text-xs text-center mt-3">
                  Join StockSimulatorBD
                </p>
              </div>
            )}
          </div>

        </div>

        {/* reCAPTCHA attribution: required by Google when the floating badge
            is hidden (it is on mobile, where it covered the Google button). */}
        {recaptchaEnabled && (
          <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500 font-spaceGrotesk">
            Protected by reCAPTCHA. Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">Privacy Policy</a>{' '}and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">Terms</a>{' '}apply.
          </p>
        )}
      </div>
    </div>
  )
}

// Error boundary to catch provider initialization failures
class AuthErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white dark:bg-[#090E17] transition-colors duration-300 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-8 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 max-w-md w-full text-center font-spaceGrotesk">
            <h2 className="font-spaceGrotesk text-xl font-bold text-gray-900 dark:text-white mb-3">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              The authentication page encountered an error. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all duration-300"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main component wrapped with reCAPTCHA provider
export default function AuthPage() {
  const siteKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim()
  const hasValidSiteKey = siteKey.length > 0

  // If site key is missing, render without reCAPTCHA provider
  // (verifyRecaptcha will show a user-facing error when executeRecaptcha is unavailable)
  if (!hasValidSiteKey) {
    console.warn('reCAPTCHA site key not found — auth reCAPTCHA unavailable.')
    return (
      <AuthErrorBoundary>
        <AuthPageContent recaptchaEnabled={false} />
      </AuthErrorBoundary>
    )
  }

  return (
    <AuthErrorBoundary>
      <GoogleReCaptchaProvider
        reCaptchaKey={siteKey}
        scriptProps={{
          async: true,
          defer: true,
          appendTo: 'head',
        }}
      >
        <AuthPageContent recaptchaEnabled={true} />
      </GoogleReCaptchaProvider>
    </AuthErrorBoundary>
  )
}