'use client';

import { memo, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook } from 'lucide-react';

interface InternalFooterLink {
  label: string;
  href: string;
}

interface SocialFooterLink {
  label: string;
  href: string;
  icon: ReactNode;
  ariaLabel: string;
}

const PLATFORM_LINKS: InternalFooterLink[] = [
  { label: 'Trade Simulator', href: '/trade' },
  { label: 'Stock Directory', href: '/stocks' },
  { label: 'DSE Learning Blog', href: '/blog' },
  { label: 'About Us', href: '/about-us' },
  { label: 'Privacy Policy', href: '/policy' },
];

const SOCIAL_LINKS: SocialFooterLink[] = [
  {
    label: 'Facebook',
    href: 'https://facebook.com/stocksimulatorbd/',
    icon: <Facebook size={16} />,
    ariaLabel: 'Follow StockSimulatorBD on Facebook',
  },
];

const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-[#090E17]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_auto] lg:gap-20">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="Go to StockSimulatorBD homepage"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <Image
                src="/favicon.svg"
                alt="StockSimulatorBD logo"
                width={40}
                height={40}
                className="transition-transform duration-300 hover:scale-105"
              />
              <span className="font-coolvetica text-xl sm:text-2xl font-normal tracking-normal text-gray-900 dark:text-white">
                StockSimulator<span className="text-blue-600 dark:text-blue-400">BD</span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Helping students and new investors — including those moving from
              Sanchayapatra and fixed deposits into the stock market — learn
              DSE-style trading through virtual trading, market education, and
              portfolio practice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:gap-20">
            <nav aria-label="Platform links">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Platform
              </h2>

              <ul className="space-y-1 text-sm">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-[44px] items-center font-medium text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Social links">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Connect
              </h2>

              <ul className="space-y-1 text-sm">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.ariaLabel}
                      className="inline-flex min-h-[44px] items-center gap-2 font-medium text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
                        {link.icon}
                      </span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-gray-100 pt-6 text-center text-xs text-gray-500 dark:border-gray-800/60 dark:text-gray-400 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>
            &copy; {currentYear} StockSimulatorBD. All rights reserved.
          </span>

          <p>
            Created by{' '}
            <a
              href="https://shahoriar.bd"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              Md Al Shahoriar Hossain
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
