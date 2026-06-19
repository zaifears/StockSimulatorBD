'use client';

import { memo } from 'react';
import Image from 'next/image';

// FIXED: Proper TypeScript interface with optional properties
interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  underlined?: boolean;
}

interface FooterSection {
  useful: FooterLink[];
}

const FOOTER_LINKS: FooterSection = {
  useful: [
    { label: 'About Us', href: '/about-us' },
    { label: 'Privacy Policy', href: '/policy' }
  ],
};

const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200/50 dark:border-gray-800/50 pt-10 mt-16 bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-t-3xl">
      <div className="max-w-5xl mx-auto px-4 pb-6 flex flex-col md:flex-row gap-6 md:gap-12 items-start justify-between">
        {/* Logo and About */}
        <div className="flex flex-col gap-3 min-w-[150px]">
          <div className="relative">
            <Image
              src="/favicon.svg"
              alt="Stock Simulator BD"
              width={56}
              height={56}
              className="mb-2 transform hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-lg opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Stock Simulator BD</span>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
            Empowering students with Stock market knowledge.
          </p>
        </div>
        
        {/* Footer Links */}
        <div className="flex justify-center flex-1">
          <div>
            <h4 className="text-md font-bold text-gray-800 dark:text-white mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Useful Links</h4>
            <ul className="flex flex-col gap-1 text-gray-500 dark:text-gray-400 text-sm">
              {FOOTER_LINKS.useful.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className={`hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 ${link.underlined ? 'underline' : ''}`}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="text-center my-4 py-4 border-t border-gray-200/30 dark:border-gray-700/30">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          &copy; {currentYear} Stock Simulator BD. All rights reserved.
        </span>
      </div>
    </footer>
  );
});

export default Footer;
