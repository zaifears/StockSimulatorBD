'use client';

import React from 'react';
import TypingHeroSection from '@/components/TypingHeroSection';
import CoreFeaturesSection from '@/components/CoreFeaturesSection';
import SimulatorPreview from '@/components/SimulatorPreview';
import Footer from '@/components/shared/Footer';

export default function HomePage() {
  return (
    // Changed dark mode background to a very deep midnight blue (#090E17) to support the theme
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden">
      
      {/* ✅ HERO & CORE FEATURES */}
      <div className="relative flex-1">
        
        {/* Modern Ambient Background Glows - Amplified for Dark Mode */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[100px] animate-optimized-bounce"></div>
          <div className="absolute top-60 right-10 w-72 h-72 bg-purple-500/10 dark:bg-purple-600/20 rounded-full blur-[100px] animate-optimized-bounce" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-96 left-1/4 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-[100px] animate-optimized-bounce" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="relative z-10 pt-0 -mt-6 sm:-mt-10">
          <TypingHeroSection />
          
          <div className="mt-2 sm:mt-4 mb-16 sm:mb-24">
            <CoreFeaturesSection />
          </div>
        </div>
      </div>
      
      {/* ✅ SIMULATOR PREVIEW SECTION */}
      <div className="relative border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-[#0D131F]">
        
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500/5 dark:bg-purple-600/15 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/15 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="relative z-10 py-16 sm:py-24">
          <SimulatorPreview />
        </div>
      </div>
      
      {/* ✅ FOOTER */}
      <div className="mt-auto z-10 bg-white dark:bg-[#090E17] border-t border-gray-100 dark:border-gray-800/60">
        <Footer />
      </div>
      
    </main>
  );
}