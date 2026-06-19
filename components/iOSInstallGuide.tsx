'use client';

import { useEffect, useState } from 'react';

export default function iOSInstallGuide() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Simple check to see if user is on iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if already dismissed (within 7 days)
    const isDismissed = () => {
      const dismissTime = localStorage.getItem('ios-install-banner-dismissed');
      if (!dismissTime) return false;
      const daysSinceDismiss = (Date.now() - parseInt(dismissTime)) / (1000 * 60 * 60 * 24);
      return daysSinceDismiss < 7;
    };

    // Check if app is already installed (PWA detection)
    const isInstalled = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };

    if (isIos() && !isDismissed() && !isInstalled()) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('ios-install-banner-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">📱 Install StockSimBD</p>
            <p className="text-xs opacity-90">
              Tap <span className="font-bold">Share ⬆️</span> → <span className="font-bold">Add to Home Screen ➕</span>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-xl hover:opacity-80 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
