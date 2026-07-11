import React from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

export default function SimulatorPreview() {
  return (
    <section className="w-full py-16 sm:py-24 bg-white dark:bg-[#0B0E11]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 shadow-2xl shadow-blue-900/20">
          
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 px-6 py-12 sm:p-16 md:p-20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-inner">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
              Ready to test your strategies?
            </h2>
            
            <p className="text-blue-100 text-base sm:text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
              Join the Dhaka Stock Exchange paper trading simulator today. Get ৳10,000 in virtual capital instantly and experience the market risk-free.
            </p>
            
            <Link 
              href="/simulator/trade" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg transform hover:scale-105"
            >
              Launch Simulator
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}