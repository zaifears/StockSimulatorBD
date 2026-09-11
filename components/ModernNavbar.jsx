"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AuthStatus from './AuthStatus'
import { useAuth } from '../contexts/AuthContext'
import CoinDisplay from './ui/CoinDisplay'
import { Home, LineChart, BarChart3, Crown, Shield } from 'lucide-react'

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, isBoss } = useAuth()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Smart active state detection that handles sub-routes
  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const bottomNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Trade', href: '/trade', icon: LineChart },
    { name: 'Stocks', href: '/stocks', icon: BarChart3 }
  ]
  // ✅ Fixed labels and hrefs to match new architecture
  const desktopNavItems = [
    { name: 'About Us', href: '/about-us' },
    { name: 'Trade', href: '/trade' },
    { name: 'Stocks', href: '/stocks' },
    { name: 'Blog', href: '/blog' }
  ]

  return (
    <>
      {/* TOP NAVBAR - Desktop and Mobile */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 ${
          isScrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Full Brand Name (Always fully visible in small compact size on mobile) */}
            <Link 
              href="/" 
              className="flex items-center gap-1 sm:gap-2 text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
              aria-label="StockSimulatorBD home"
            >
              <Image
                src="/favicon.svg"
                alt="StockSimulatorBD"
                width={28}
                height={28}
                className="h-5 w-5 sm:h-8 sm:w-8 object-contain transform hover:scale-105 transition-transform duration-300 shrink-0"
                priority
              />
              <span className="text-[11px] xs:text-xs sm:text-lg font-extrabold tracking-tight whitespace-nowrap">
                StockSimulator<span className="text-blue-600 dark:text-blue-400">BD</span>
              </span>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-1">
              {desktopNavItems.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                    isActive(item.href)
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side - Compact on mobile so all items (Name, Logo, Tier, Coin count, Profile/Join) fit cleanly */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 lg:gap-5 shrink-0 relative z-20">
              
              {/* User Tier Status Button */}
              {user && (
                isBoss ? (
                  <Link
                    href="/profile/tier"
                    className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-400/50 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm shrink-0"
                    title="Boss Tier active — click to view tier status"
                  >
                    <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current text-amber-500 shrink-0" />
                    <span className="hidden sm:inline">Boss Tier</span>
                    <span className="sm:hidden">Boss</span>
                  </Link>
                ) : (
                  <Link
                    href="/boss"
                    className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-all shrink-0"
                    title="Bro Tier (Free) — click to upgrade to Boss"
                  >
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
                    <span className="hidden sm:inline">Bro Tier</span>
                    <span className="sm:hidden">Bro</span>
                    <span className="text-[8px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded bg-amber-500 text-gray-950 ml-0.5">Up</span>
                  </Link>
                )
              )}

              {/* Coin Display - Compact on mobile */}
              <Link 
                href="/coins"
                className="flex items-center shrink-0 active:scale-95 transition-all relative z-30 cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-700/50 px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-sm"
              >
                <CoinDisplay 
                  className="flex" 
                  size="small"
                />
              </Link>

              {/* Desktop Auth Status */}
              <div className="hidden lg:flex shrink-0">
                <AuthStatus />
              </div>

              {/* Mobile - Show Profile or Join button */}
              <div className="lg:hidden shrink-0 relative z-30">
                {user ? (
                  <Link href="/profile" className="block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] xs:text-xs font-bold transition-colors active:scale-95 shadow-sm">
                    Profile
                  </Link>
                ) : (
                  <Link href="/auth" className="block bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] xs:text-xs font-bold transition-colors shadow-sm shadow-blue-500/20 active:scale-95">
                    Join
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVIGATION - Mobile Only (True App-Style) */}
      {/* The middle Trade item is a raised circular button rather than a plain
          tab — it's the doorway from the marketing site into the full
          trading-terminal app shell (components/app/AppShell.tsx), a
          different kind of destination than Home/Stocks, and should read
          that way at a glance. */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0B0E11]/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div className="flex items-stretch justify-around h-[68px] px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.name === 'Trade') {
              return (
                <div key={item.href} className="w-full flex items-start justify-center">
                  <Link
                    href={item.href}
                    aria-label="Go to the trading floor"
                    className={`-mt-5 w-14 h-14 rounded-full flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-all ${
                      active
                        ? 'bg-blue-700 text-white shadow-blue-600/40'
                        : 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-wide">TRADE</span>
                  </Link>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-transparent'}`}>
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-80'}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default ModernNavbar