'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import BouncingBalls from '../../components/shared/BouncingBalls';

const AboutHero = dynamic(() => import('../../components/AboutHero'), {
  loading: () => <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-3xl mb-16"></div>,
  ssr: false,
});

const Footer = dynamic(() => import('../../components/shared/Footer'), {
  loading: () => <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-t-3xl"></div>,
  ssr: false,
});

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 text-gray-800 dark:text-gray-200 pt-40 pb-12 sm:pt-40 sm:pb-24 px-4 relative overflow-hidden">

      {/* Bouncing Balls Component */}
      <BouncingBalls variant="dense" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Hero Section */}
        <div className="animate-fade-in-up">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-3xl mb-16"></div>}>
            <AboutHero />
          </Suspense>
        </div>

        {/* Story Section */}
        <Suspense fallback={<div className="h-96 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>}>
        </Suspense>

        {/* About The Product Section */}
        <section className="mt-24 md:mt-32">
          <div className="text-center mb-16">
            <p className="max-w-3xl mx-auto text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              We built the ultimate paper trading platform for the Dhaka Stock Exchange. Whether you are a beginner looking to understand market dynamics or an experienced trader testing new strategies, our simulator provides a 100% risk-free environment to hone your investing skills.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">

            {/* Feature 1 */}
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-800/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-6">📈</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Real Market Data</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Experience the DSE with authentic price movements, category tracking, and market trends to ensure your virtual trades reflect reality.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-800/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-6">🛡️</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Risk-Free Learning</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Start with a virtual portfolio balance. Make mistakes, learn from them, and build your trading confidence before investing real capital.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-800/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-5xl mb-6">⚙️</div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Realistic Rules</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We simulate actual DSE trading conditions, including standard 0.3% broker commissions and accurate portfolio settlement mechanics.
              </p>
            </div>

          </div>
        </section>

        {/* Creator Attribution */}
        <section className="mt-20 md:mt-24 text-center">
          <div className="inline-block bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm px-8 py-6 rounded-3xl shadow-lg border border-gray-200/50 dark:border-gray-800/50">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Built & maintained by</p>
            <a
              href="https://shahoriar.bd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              Md Al Shahoriar Hossain
            </a>
            <div className="flex gap-4 justify-center mt-3 text-xs text-gray-400 dark:text-gray-500">
              <a href="https://shahoriar.bd" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors duration-300">shahoriar.bd</a>
              <span>·</span>
              <a href="https://linkedin.com/in/shahoriarhossain" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors duration-300">LinkedIn</a>
              <span>·</span>
              <a href="https://github.com/zaifears" target="_blank" rel="noopener noreferrer" className="hover:text-purple-500 transition-colors duration-300">GitHub</a>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mt-20 md:mt-32 text-center mb-20 md:mb-32">
          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 py-16 px-8 rounded-3xl shadow-xl border border-indigo-200/30 dark:border-indigo-800/30">
            <div className="mb-8">
              <span className="text-6xl">📧</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-600 bg-clip-text text-transparent mb-6">
              Get in Touch
            </h2>
            <p className="max-w-4xl mx-auto text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-10">
              Have questions, ideas, or feedback? We&apos;d love to hear from you!
            </p>

            {/* Contact Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">

              {/* Email Button */}
              <a
                href="mailto:alshahoriar.hossain@gmail.com"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>Email Us</span>
              </a>

              {/* Contact Page Button */}
              <a
                href="https://shahoriar.bd/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 8a1 1 0 000 2h.01a1 1 0 000-2H8zm2-1a1 1 0 11-2 0 1 1 0 012 0zm2 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
                <span>Contact Page</span>
              </a>

            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-t-3xl"></div>}>
        <Footer />
      </Suspense>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}