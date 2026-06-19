"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import AuthStatus from './AuthStatus'
import { useAuth } from '../contexts/AuthContext'
import CoinDisplay from './ui/CoinDisplay'

const ModernNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Mobile bottom nav items
  const bottomNavItems = [
    { name: 'Home', href: '/', label: 'Home' },
    { name: 'Simulator', href: '/simulator', label: 'Simulator' },
    { name: 'Blog', href: '/blog', label: 'Blog' }
  ]

  // Desktop nav items
  const desktopNavItems = [
    { name: 'About Us', href: '/about-us', label: 'About Us' },
    { name: 'Simulator', href: '/simulator', label: 'Simulator' },
    { name: 'Blog', href: '/blog', label: 'Blog' }
  ]

  const isActive = (href) => pathname === href

  return (
    <>
      {/* TOP NAVBAR - Desktop and Mobile */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${
          isScrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-black dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <Image
                src="/favicon.svg"
                alt="Stock Simulator BD"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
              <span>Stock Simulator BD</span>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-1">
              {desktopNavItems.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                    isActive(item.href)
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-300'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Coin Display - Show on all screens */}
              <div className="flex">
                <CoinDisplay 
                  className="flex" 
                  size="default"
                />
              </div>

              {/* Desktop Auth Status */}
              <div className="hidden lg:flex">
                <AuthStatus />
              </div>

              {/* Mobile - Show Profile or Join button */}
              <div className="lg:hidden">
                {user ? (
                  <Link href="/profile" className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors">
                    Profile
                  </Link>
                ) : (
                  <Link href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors">
                    Join
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* BOTTOM NAVIGATION - Mobile Only (Instagram-style) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center h-16 max-w-7xl mx-auto px-0">
          {bottomNavItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative ${
                  isActive(item.href)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="text-xs font-semibold text-center leading-tight">
                  {item.label}
                </span>
                {isActive(item.href) && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500"></div>
                )}
              </Link>
              {index < bottomNavItems.length - 1 && (
                <div className="h-6 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </nav>
    </>
  )
}

export default ModernNavbar