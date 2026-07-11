"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AuthStatus from './AuthStatus'
import { useAuth } from '../contexts/AuthContext'
import CoinDisplay from './ui/CoinDisplay'
import { Home, LineChart, BarChart3 } from 'lucide-react'

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Allows text to wrap or shrink slightly on tiny screens */}
            <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0">
              <Image
                src="/favicon.svg"
                alt="Stock Simulator BD"
                width={32}
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain transform hover:scale-105 transition-transform duration-300 flex-shrink-0"
                priority
              />
              <span className="tracking-tight truncate">StockSim<span className="text-blue-600 dark:text-blue-400">BD</span></span>
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

            {/* Right Side - Maximized touch gaps & guaranteed touch targets */}
            <div className="flex items-center gap-6 sm:gap-8 shrink-0 relative z-20">
              
              {/* Coin Display - Now styled as a clear, clickable pill button */}
              <Link 
                href="/coins"
                className="flex items-center shrink-0 active:scale-95 transition-all relative z-30 cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-700/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-sm"
              >
                <CoinDisplay 
                  className="flex" 
                  size="default"
                />
              </Link>

              {/* Desktop Auth Status */}
              <div className="hidden lg:flex shrink-0">
                <AuthStatus />
              </div>

              {/* Mobile - Show Profile or Join button */}
              <div className="lg:hidden shrink-0 relative z-30">
                {user ? (
                  <Link href="/profile" className="block bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors active:scale-95 shadow-sm">
                    Profile
                  </Link>
                ) : (
                  <Link href="/auth" className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-blue-500/20 active:scale-95">
                    Join
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVIGATION - Mobile Only (True App-Style) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0B0E11]/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div className="flex items-center justify-around h-[68px] px-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
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