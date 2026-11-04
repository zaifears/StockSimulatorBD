'use client';
import React, { useEffect, useState } from 'react';
import { GoogleIcon, GitHubIcon } from './AuthIcons';

interface SocialAuthProps {
  handleGoogleSignIn: () => void;
  handleGitHubSignIn: () => void;
  handleFacebookSignIn?: () => void;
  isLoading: boolean;
  isInAppBrowser?: boolean;
  /** Facebook / Messenger / Instagram browser specifically */
  isMetaInAppBrowser?: boolean;
  /** Facebook login configured (NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN) */
  showFacebook?: boolean;
  /**
   * Firebase's auth handler is on this site's own domain, so redirect
   * sign-in survives in-app browsers' third-party storage blocking.
   */
  redirectSignInWorks?: boolean;
}

const FacebookIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
    />
  </svg>
);

// Tactile per DESIGN.md "The Lift Is Feedback Rule": every button rests on a
// soft shadow, rises under the cursor and compresses under a thumb, so a
// nervous first-time user can tell it is live before tapping.
const btnBase =
  'w-full min-h-[44px] py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 ' +
  'shadow-sm transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out ' +
  'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] active:shadow-sm ' +
  'motion-reduce:transform-none motion-reduce:transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1F26]';

// Google's own button themes (developers.google.com/identity/branding-guidelines):
// "light" = white fill, #747775 outline, #1F1F1F text. The light theme is
// used in dark mode too: Google's dark fill (#131314) sat darker than our
// navy card and read as disabled, while white is the highest-contrast,
// unmistakably live option the guidelines allow.
const googleBtn =
  'bg-white text-[#1F1F1F] border border-[#747775] hover:bg-[#F8F9FA] hover:border-[#5F6368] ' +
  'dark:border-white dark:hover:bg-[#F1F3F4] dark:hover:border-[#F1F3F4] focus-visible:ring-blue-500';

// Deliberately quiet while Meta's App Review is pending (only app-role
// accounts can sign in until then): neutral grey, listed last. Meta's brand
// rules allow a custom button as long as the "f" logo itself is unaltered,
// so the logo keeps Facebook Blue. Swap back to bg-[#1877F2] text-white
// after the app is published.
const facebookBtn =
  'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 ' +
  'dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800 ' +
  'focus-visible:ring-gray-400';

const SocialAuth: React.FC<SocialAuthProps> = ({
  handleGoogleSignIn,
  handleGitHubSignIn,
  handleFacebookSignIn,
  isLoading,
  isInAppBrowser = false,
  isMetaInAppBrowser = false,
  showFacebook = false,
  redirectSignInWorks = false,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setPlatform(/android/.test(ua) ? 'android' : /iphone|ipad|ipod/.test(ua) ? 'ios' : 'other');
  }, []);

  const facebookButton = showFacebook && handleFacebookSignIn && (
    <button
      type="button"
      onClick={handleFacebookSignIn}
      disabled={isLoading}
      className={`${btnBase} ${facebookBtn}`}
    >
      <FacebookIcon />
      Continue with Facebook
    </button>
  );

  const githubButton = (
    <button
      type="button"
      onClick={handleGitHubSignIn}
      disabled={isLoading}
      className={`${btnBase} bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white focus-visible:ring-gray-500`}
    >
      <GitHubIcon />
      Continue with GitHub
    </button>
  );

  const handleOpenInBrowser = () => {
    const { host, pathname, search, href } = window.location;
    if (platform === 'android') {
      // No package= so Android uses the person's default browser; the
      // fallback URL keeps them on the page if no handler answers.
      window.location.href =
        `intent://${host}${pathname}${search}#Intent;scheme=https;` +
        `S.browser_fallback_url=${encodeURIComponent(href)};end`;
      return;
    }
    if (platform === 'ios') {
      // Asks iOS to hand the page to Safari. Honoured by recent iOS versions
      // inside most in-app browsers; if it isn't, nothing happens and the
      // menu steps / copy-link below remain.
      window.location.href = `x-safari-${href}`;
      return;
    }
    window.open(href, '_blank', 'noopener');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (isInAppBrowser) {
    const appName = isMetaInAppBrowser ? 'Facebook / Messenger / Instagram' : 'this app';
    const menuHint =
      platform === 'ios'
        ? 'tap ••• (top right) → “Open in external browser”'
        : 'tap ⋮ (top right) → “Open in Chrome” or “Open in browser”';

    return (
      <div className="space-y-3 font-spaceGrotesk">
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3">
          <p className="text-amber-900 dark:text-amber-200 text-xs font-semibold text-center mb-1">
            Google sign-in doesn&apos;t work inside {appName}&apos;s browser
          </p>
          <p className="text-amber-800/90 dark:text-amber-200/80 text-xs text-center leading-relaxed">
            Google blocks it in in-app browsers. Open this page in your phone&apos;s browser ({menuHint}), or use
            {facebookButton && redirectSignInWorks ? ' Facebook,' : ''} your email and password, or an email sign-in link (above).
          </p>
        </div>


        <button
          type="button"
          onClick={handleOpenInBrowser}
          className={`${btnBase} bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {platform === 'ios' ? 'Open in Safari' : platform === 'android' ? 'Open in Chrome / browser' : 'Open in browser'}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className={`${btnBase} bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 focus-visible:ring-gray-400`}
        >
          {linkCopied ? '✓ Link copied, paste it in your browser' : 'Copy link'}
        </button>

        {redirectSignInWorks && githubButton}
        {redirectSignInWorks && facebookButton}

        <p className="text-gray-500 dark:text-slate-400 text-xs text-center">
          Email sign-in (password or a sign-in link) works right here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-spaceGrotesk">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={`${btnBase} ${googleBtn}`}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      {githubButton}
      {facebookButton}
    </div>
  );
};

export default SocialAuth;
