'use client';

// components/app/AppShell.tsx
// The chrome every authenticated trading surface renders inside: one shared
// simulator subscription, the persistent market strip, the bottom tab bar on
// phones and an equivalent rail on desktop.
//
// Marketing pages (/, /blog, /about-us, /policy) deliberately do NOT use this
// — they keep the standard site navbar and their SEO layout. The shell is for
// screens where the user is trading, not reading.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SimulatorProvider } from '@/contexts/SimulatorContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import MarketStrip from './MarketStrip';
import AppTabBar, { APP_TABS } from './AppTabBar';
import DisclaimerGate from './DisclaimerGate';

/**
 * Lets whichever screen owns a search field claim the strip's search button.
 * Screens without one fall through to navigating to the market board.
 */
const SearchFocusContext = createContext<{
  register: (fn: (() => void) | null) => void;
} | null>(null);

/** Call from a screen with a search input to make the strip's magnifier focus it. */
export function useRegisterSearchFocus(fn: () => void) {
  const ctx = useContext(SearchFocusContext);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!ctx) return;
    const stable = () => fnRef.current();
    ctx.register(stable);
    return () => ctx.register(null);
  }, [ctx]);
}

interface Props {
  children: ReactNode;
  /** Where to send the user back after signing in. */
  redirectPath: string;
  redirectMessage?: string;
}

export default function AppShell({ children, redirectPath, redirectMessage }: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!authLoading && !user && !isRedirecting) {
      // Check if user session was cached in localStorage (e.g. returning after idle/sleep)
      const hasCachedSession = typeof window !== 'undefined' && !!localStorage.getItem('stocksimulatorbd_user_cache');

      if (hasCachedSession) {
        // Give Firebase Auth a brief grace window (1500ms) to re-hydrate from IndexedDB
        // or complete background token refresh before kicking to /auth
        timer = setTimeout(() => {
          setIsRedirecting(true);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', redirectPath);
            sessionStorage.setItem(
              'redirectMessage',
              redirectMessage || 'Please sign in to access the trading simulator'
            );
          }
          router.push('/auth');
        }, 1500);
      } else {
        // No session ever existed on this device, redirect immediately
        setIsRedirecting(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirectAfterLogin', redirectPath);
          sessionStorage.setItem(
            'redirectMessage',
            redirectMessage || 'Please sign in to access the trading simulator'
          );
        }
        router.push('/auth');
      }
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [user, authLoading, router, isRedirecting, redirectPath, redirectMessage]);

  if (authLoading || isRedirecting || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-[#0B0E11]">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {authLoading || isRedirecting ? 'Checking authorization…' : 'Loading…'}
        </p>
      </div>
    );
  }

  return (
    <DisclaimerGate>
      <SimulatorProvider>
        <ShellChrome>{children}</ShellChrome>
      </SimulatorProvider>
    </DisclaimerGate>
  );
}

function ShellChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchFocusRef = useRef<(() => void) | null>(null);

  const register = useCallback((fn: (() => void) | null) => {
    searchFocusRef.current = fn;
  }, []);

  const handleSearchClick = useCallback(() => {
    if (searchFocusRef.current) {
      searchFocusRef.current();
    } else {
      router.push('/trade');
    }
  }, [router]);

  return (
    <SearchFocusContext.Provider value={{ register }}>
      <div className="min-h-screen bg-[#EDEDED] dark:bg-[#111823] text-gray-900 dark:text-gray-100">
        <MarketStrip onSearchClick={handleSearchClick} />

        {/* Desktop navigation rail — the tab bar's counterpart above lg */}
        <nav
          aria-label="Primary"
          className="hidden lg:block fixed top-[calc(84px+env(safe-area-inset-top))] left-0 right-0 z-40 bg-white/95 dark:bg-[#0D131D]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800"
        >
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center gap-1 h-11">
              {APP_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.match(pathname);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 px-4 h-full text-sm font-bold border-b-2 transition-colors ${
                      active
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </Link>
                );
              })}
              <Link
                href="/trade/order"
                className={`ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-colors active:scale-95 ${
                  pathname.startsWith('/trade/order')
                    ? 'bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" strokeWidth={2.5} />
                Place order
              </Link>
            </div>
          </div>
        </nav>

        {/* Top padding clears the two-row strip (84px) plus its own safe-area
            inset — MarketStrip's pt-safe pushes its actual rendered height
            past 84px on any notched/edge-to-edge device, so a flat 84px here
            let the top of every AppShell page's content sit partly behind
            the fixed header on those devices. Also clears the desktop rail
            above lg. Bottom padding clears the tab bar and its safe area. */}
        <main className="pt-[calc(84px+env(safe-area-inset-top))] lg:pt-[calc(128px+env(safe-area-inset-top))] pb-[72px] lg:pb-8">
          {children}
        </main>

        <AppTabBar />
      </div>
    </SearchFocusContext.Provider>
  );
}
