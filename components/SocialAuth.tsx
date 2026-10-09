'use client';
import React, { useState } from 'react';
import { GoogleIcon, GitHubIcon } from './AuthIcons';

interface SocialAuthProps {
  handleGoogleSignIn: () => void;
  handleGitHubSignIn: () => void;
  isLoading: boolean;
  isInAppBrowser?: boolean;
}

const SocialAuth: React.FC<SocialAuthProps> = ({
  handleGoogleSignIn,
  handleGitHubSignIn,
  isLoading,
  isInAppBrowser = false
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleOpenInBrowser = () => {
    const url = window.location.href;
    
    // Try to open in system browser
    // Android: intent URL to open in Chrome
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;end`;
      return;
    }
    
    // iOS: try window.open (sometimes works)
    window.open(url, '_system');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  if (isInAppBrowser) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-300 text-xs text-center mb-2 font-medium">
            Google/GitHub sign-in requires a full browser
          </p>
          <p className="text-slate-400 text-xs text-center">
            You&apos;re in an in-app browser. Open this page in Chrome or Safari to use social sign-in.
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleOpenInBrowser}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in Browser
        </button>
        
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-md hover:bg-slate-600 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          {linkCopied ? '✓ Link Copied!' : 'Copy Link & Paste in Browser'}
        </button>
        
        <p className="text-slate-500 text-xs text-center">
          Email/password sign-in works here
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
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      
      <button
        type="button"
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-gray-800 border border-gray-700 text-white font-medium py-3 px-4 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        <GitHubIcon />
        Continue with GitHub
      </button>
    </div>
  );
};

export default SocialAuth;
