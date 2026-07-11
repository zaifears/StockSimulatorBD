'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Facebook } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
}

interface FooterSection {
  useful: FooterLink[];
  social: FooterLink[];
}

const FOOTER_LINKS: FooterSection = {
  useful: [
    { label: 'About Us', href: '/about-us' },
    { label: 'Privacy Policy', href: '/policy' },
  ],
  social: [
    {
      label: 'Facebook',
      href: 'https://www.facebook.com/stocksimbd',
      external: true,
      icon: <Facebook size={16} />,
    },
  ],
};

const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-[#090E17] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-12 items-start justify-between">

        {/* Logo and About */}
        <div className="flex flex-col gap-4 max-w-xs">
          <div className="flex items-center gap-3">
            <Image
              src="/favicon.svg"
              alt="Stock Simulator BD Logo"
              width={40}
              height={40}
              className="transform hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              StockSim<span className="text-blue-600 dark:text-blue-400">BD</span>
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Empowering students with risk-free stock market knowledge and a realistic DSE trading experience.
          </p>
        </div>

        {/* Footer Links Wrapper */}
        <div className="flex gap-16 sm:gap-24">
          
          {/* Useful Links */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="flex flex-col gap-3 text-sm">
              {FOOTER_LINKS.useful.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Connect
            </h4>
            <ul className="flex flex-col gap-3 text-sm">
              {FOOTER_LINKS.social.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 font-medium"
                  >
                    <span className="text-gray-400 dark:text-gray-500">{link.icon}</span> 
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-gray-100 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-gray-500 dark:text-gray-500">
          &copy; {currentYear} Stock Simulator BD. All rights reserved.
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Created by{' '}
          <a
            href="https://shahoriar.bd"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Md Al Shahoriar Hossain
          </a>
        </p>
      </div>
    </footer>
  );
});

export default Footer;