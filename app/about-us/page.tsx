'use client';

import React from 'react';
import AboutHero from '@/components/AboutHero';
import Footer from '@/components/shared/Footer';

export default function AboutUsPage() {
  return (
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden text-gray-800 dark:text-gray-200">

      {/* ✅ HERO SECTION WITH HOMEPAGE GRID & GLOWS */}
      <div className="relative flex-1 w-full pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
        
        {/* Modern Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
        
        {/* Ambient Glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/20 blur-[100px] rounded-full"></div>
          <div className="absolute top-40 left-10 w-64 h-64 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[100px] animate-optimized-bounce"></div>
          <div className="absolute top-60 right-10 w-72 h-72 bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[100px] animate-optimized-bounce" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 animate-fade-in-up">
          <AboutHero />
        </div>
      </div>

      {/* ✅ ABOUT THE PRODUCT SECTION (Alternating background) */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] py-20 md:py-32 border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
              Why We Built <span className="text-blue-600 dark:text-blue-400">StockSimBD</span>
            </h2>
            <p className="max-w-3xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              We built the ultimate paper trading platform for the Dhaka Stock Exchange. Whether you are a beginner looking to understand market dynamics or an experienced trader testing new strategies, our simulator provides a 100% risk-free environment to hone your investing skills.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-[#1A1F26] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6 border border-blue-100 dark:border-blue-800/50">📈</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Real Market Data</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Experience the DSE with authentic price movements, category tracking, and market trends to ensure your virtual trades reflect reality.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-[#1A1F26] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6 border border-emerald-100 dark:border-emerald-800/50">🛡️</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Risk-Free Learning</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Start with a virtual portfolio balance. Make mistakes, learn from them, and build your trading confidence before investing real capital.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-[#1A1F26] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-2xl mb-6 border border-amber-100 dark:border-amber-800/50">⚙️</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Realistic Rules</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                We simulate actual DSE trading conditions, including standard broker commissions and accurate portfolio settlement mechanics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ CREATOR & CONTACT SECTION */}
      <section className="w-full bg-white dark:bg-[#090E17] py-20 md:py-32 relative">
        
        {/* Subtle Bottom Glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-blue-500/5 dark:bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          
          {/* Creator Attribution */}
          <div className="inline-block bg-gray-50 dark:bg-[#1A1F26] px-8 py-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-20">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Built & maintained by</p>
            <a
              href="https://shahoriar.bd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              Md Al Shahoriar Hossain
            </a>
            <div className="flex gap-4 justify-center mt-3 text-xs font-medium text-gray-400 dark:text-gray-500">
              <a href="https://shahoriar.bd" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">shahoriar.bd</a>
              <span>·</span>
              <a href="https://linkedin.com/in/shahoriarhossain" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">LinkedIn</a>
              <span>·</span>
              <a href="https://github.com/zaifears" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">GitHub</a>
            </div>
          </div>

          {/* Contact Block */}
          <div className="bg-gray-50 dark:bg-[#111418] py-16 px-6 sm:px-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-blue-200 dark:border-blue-800/50">
              📧
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Get in Touch
            </h2>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-10">
              Have questions, ideas, or feedback? We&apos;d love to hear from you!
            </p>

            {/* Contact Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
              <a
                href="mailto:alshahoriar.hossain@gmail.com"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email Us</span>
              </a>
              <a
                href="https://shahoriar.bd/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-bold rounded-xl transition-all transform hover:-translate-y-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>Contact Page</span>
              </a>
            </div>
          </div>
          
        </div>
      </section>

      {/* ✅ FOOTER */}
      <div className="mt-auto z-10 bg-white dark:bg-[#090E17] border-t border-gray-100 dark:border-gray-800/60">
        <Footer />
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </main>
  );
}