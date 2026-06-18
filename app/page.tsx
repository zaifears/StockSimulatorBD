import React from 'react';
import HomeDeferredSections from '@/components/HomeDeferredSections';

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col pb-20 lg:pb-0 w-full">
      
      {/* ✅ TOP SECTION: Light background with transparent navbar area */}
      <div className="relative bg-white dark:bg-black transition-colors duration-300 flex-1">
        
        {/* ✅ Optimized Floating Circles - Reduced for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/3 dark:bg-blue-400/6 rounded-full animate-optimized-bounce"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500/3 dark:bg-purple-400/6 rounded-full animate-optimized-bounce" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-96 left-1/4 w-20 h-20 bg-indigo-500/3 dark:bg-indigo-400/6 rounded-full animate-optimized-bounce" style={{animationDelay: '4s'}}></div>
        </div>
        
        {/* Hero Section */}
        <section className="relative z-10" role="banner">
        </section>
        
        {/* Core Features Section */}
        <HomeDeferredSections section="core" />
        
      </div>
      
      {/* ✅ GRADIENT SECTION: Starts from "Your Path to Success" */}
      <div className="relative bg-white dark:bg-black transition-colors duration-300">
        
        {/* Optimized background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl"></div>
        </div>
        
        {/* Content Sections loaded only when near viewport */}
        <HomeDeferredSections section="content" />
        
      </div>
      
      {/* ✅ FOOTER SECTION */}
      <HomeDeferredSections section="footer" />
      
    </div>
  );
}
