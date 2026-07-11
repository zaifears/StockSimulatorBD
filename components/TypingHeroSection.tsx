'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Activity } from 'lucide-react';

export default function TypingHeroSection() {
  return (
    // Applied your perfectly dialed-in padding!
    <section className="relative w-full pt-40 pb-18 md:pt-32 md:pb-24 overflow-hidden">
      
      {/* Modern Grid Background - Now injects a glowing blue grid (#3b82f6) in dark mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
      
      {/* Central Ambient Glow - Cranked up opacity for dark mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/20 dark:bg-blue-600/35 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide mb-6">
          <Activity className="w-3.5 h-3.5" />
          <span>DSE Virtual Trading</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-6">
          Master the Markets <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Without the Risk
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed">
          Experience the thrill of Dhaka Stock Exchange paper trading. Test strategies, track virtual portfolio performance, and build your financial future today.
        </p>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/simulator/trade" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-1"
          >
            Start Trading Now - It's Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/about-us" 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-8 py-4 rounded-xl font-bold text-base sm:text-lg transition-all"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}