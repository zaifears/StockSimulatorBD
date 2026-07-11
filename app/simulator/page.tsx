'use client';

import React from 'react';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';
import { 
  TrendingUp, Shield, BookOpen, Target, 
  BarChart3, Clock, Wallet, ArrowRight,
  CheckCircle2, AlertTriangle, Activity
} from 'lucide-react';

export default function SimulatorLandingPage() {
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': ['WebApplication', 'SoftwareApplication'],
    name: 'StockSimulatorBD DSE Stock Market Simulator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web Browser',
    url: 'https://www.stocksimulator.tech/simulator',
    description:
      'Practice Dhaka Stock Exchange trading with real-time market behavior, T+1 settlement simulation, and risk-free virtual capital.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Real-time DSE data simulation',
      'T+1 settlement rules simulation',
      'Risk-free paper trading with virtual money',
    ],
    publisher: {
      '@type': 'Organization',
      name: 'StockSimulatorBD',
      url: 'https://www.stocksimulator.tech',
    },
  };

  return (
    <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300 pb-safe overflow-x-hidden text-gray-800 dark:text-gray-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />

      {/* ✅ HERO SECTION WITH HOMEPAGE GRID & GLOWS */}
      <section className="relative w-full pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
        
        {/* Modern Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
        
        {/* Ambient Glows */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/20 blur-[100px] rounded-full"></div>
          <div className="absolute top-40 left-10 w-64 h-64 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[100px] animate-optimized-bounce"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide mb-6">
            <Activity className="w-3.5 h-3.5" />
            <span>DSE Virtual Trading</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-6">
            DSE Stock Market Simulator <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Without Real Risk
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed px-2">
            Practice buying and selling stocks on the Dhaka Stock Exchange with virtual money. 
            Experience real market conditions, learn trading strategies, and build confidence 
            before investing your hard-earned capital.
          </p>

          {/* CTA Button */}
          <Link 
            href="/simulator/trade"
            prefetch
            className="inline-flex items-center justify-center gap-2 sm:gap-3 px-8 sm:px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto mx-auto"
          >
            Start Trading Now
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </div>
      </section>

      {/* ✅ WHAT IS PAPER TRADING SECTION (Alternating Background) */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] py-20 border-b border-gray-100 dark:border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
                What is <span className="text-blue-600 dark:text-blue-400">Paper Trading</span>?
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Paper trading, also known as <strong className="text-gray-900 dark:text-gray-200">simulator trading</strong> or 
                <strong className="text-gray-900 dark:text-gray-200"> virtual trading</strong>, is a practice method where you 
                trade stocks using fake money in a simulated environment that mirrors real market conditions.
              </p>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                It&apos;s called &quot;paper trading&quot; because traditionally, traders would write down 
                their hypothetical trades on paper. Today, digital platforms like StockSimBD automate this process with real-time data.
              </p>
              
              {/* Alert Box */}
              <div className="flex items-start gap-3 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl shadow-sm">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200 text-sm leading-relaxed">
                  <strong>The Reality:</strong> Finding a good paper trading platform for the Bangladesh 
                  stock market is extremely difficult. Most platforms focus on US markets, 
                  leaving Bangladeshi investors with very few options to practice.
                </p>
              </div>
            </div>

            {/* Right Content - Checklist */}
            <div className="bg-white dark:bg-[#1A1F26] rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Why Practice First?</h3>
              <ul className="space-y-4">
                {[
                  'Understand how the market works without financial risk',
                  'Learn to read stock prices, charts, and market trends',
                  'Test different trading strategies before using real money',
                  'Experience the emotional aspects of trading safely',
                  'Build confidence before your first real investment'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ✅ FEATURES GRID */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#090E17]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Why Choose <span className="text-blue-600 dark:text-blue-400">StockSimBD</span>?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
              One of the very few paper trading platforms built specifically for the 
              Dhaka Stock Exchange with realistic market conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: 'Real DSE Data',
                description: 'Practice with actual stock prices from the Dhaka Stock Exchange, updated during market hours.'
              },
              {
                icon: Wallet,
                title: '10K+ Virtual Capital',
                description: 'Start with over 10,000 BDT in virtual money to build your practice portfolio.'
              },
              {
                icon: Clock,
                title: 'Real Market Hours',
                description: 'Trade only during DSE open hours (10 AM - 2:15 PM) for an authentic experience.'
              },
              {
                icon: Shield,
                title: 'Real Limitations',
                description: 'Experience T+1 settlement rules and broker commission charges just like real trading.'
              },
              {
                icon: Target,
                title: '300+ Companies',
                description: 'Access to all tradeable companies currently listed on the Dhaka Stock Exchange.'
              },
              {
                icon: BookOpen,
                title: 'Learn by Doing',
                description: 'The best way to understand stock trading is through hands-on practice without fear.'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 dark:bg-[#1A1F26] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-800/50">
                  <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ THE PROBLEM / BOTTOM CTA */}
      <section className="w-full bg-gray-50 dark:bg-[#111418] py-20 relative overflow-hidden border-t border-gray-100 dark:border-gray-800/60">
        
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-blue-500/5 dark:bg-blue-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
            The <span className="text-blue-600 dark:text-blue-400">Problem</span> with Learning to Trade
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed max-w-2xl mx-auto">
            Most beginners jump straight into real trading without any practice. They lose money, 
            get discouraged, and often quit entirely. 
          </p>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            That&apos;s why we built this simulator — to give Bangladeshi investors a 
            <strong className="text-gray-900 dark:text-white"> risk-free environment</strong> to learn, practice, and 
            gain confidence before putting real money at stake.
          </p>

          <Link 
            href="/simulator/trade"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 transition-all duration-300"
          >
            Start Trading Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
            Join hundreds of learners practicing today
          </p>
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