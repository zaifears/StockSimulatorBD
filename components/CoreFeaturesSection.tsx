import React from 'react';
import { TrendingUp, BarChart2, ShieldCheck, Clock, Users, Zap } from 'lucide-react';

const features = [
  {
    icon: <BarChart2 className="w-6 h-6 text-blue-500" />,
    title: 'Real Market Data',
    description: 'Trade with actual DSE stock prices and live market conditions.'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
    title: 'Zero Risk Learning',
    description: 'Practice without losing real money. Build skills from scratch.'
  },
  {
    icon: <Clock className="w-6 h-6 text-amber-500" />,
    title: 'Realistic Rules',
    description: 'Enforces T+1 limits and authentic 0.4% broker commissions.'
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-indigo-500" />,
    title: 'Portfolio Tracking',
    description: 'Monitor your realized and unrealized P&L in real-time.'
  }
];

const stats = [
  { value: '৳10K+', label: 'Virtual Capital' },
  { value: '300+', label: 'Tradable Stocks' },
  { value: 'Live', label: 'Market Hours' },
];

export default function CoreFeaturesSection() {
  return (
    <section className="w-full bg-gray-50 dark:bg-[#111418] py-16 sm:py-24 border-y border-gray-100 dark:border-gray-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left Side: Text */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
              Master Trading <br className="hidden lg:block" />
              <span className="text-blue-600 dark:text-blue-400">with Simulator</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-8 max-w-xl mx-auto lg:mx-0">
              Practice stock trading in a risk-free environment. Learn market dynamics, test strategies, and build confidence before investing your own capital.
            </p>
            
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 border-t border-gray-200 dark:border-gray-800 pt-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Feature Grid */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feat, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1A1F26] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}