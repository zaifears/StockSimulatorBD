import React from 'react';
import { Info } from 'lucide-react';

const AboutHero = () => {
  return (
    <section className="text-center flex flex-col items-center justify-center mb-8 md:mb-12">
      
      {/* Category Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide mb-6">
        <Info className="w-3.5 h-3.5" />
        <span>Our Story</span>
      </div>
      
      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-6">
        About <br className="hidden sm:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Stock Simulator BD
        </span>
      </h1>
      
      {/* Supporting Text */}
      <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
        Empowering the next generation of investors in Bangladesh. We built this platform to provide a realistic, risk-free environment to master the stock market.
      </p>

    </section>
  );
};

export default AboutHero;