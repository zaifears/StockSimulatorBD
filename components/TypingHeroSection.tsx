import React from 'react';
import Link from 'next/link';

const TypingHeroSection = () => {
    return (
        <section className="hero-background-container relative py-16 sm:py-18 md:py-6 px-6 text-center overflow-hidden bg-cover bg-center bg-no-repeat min-h-[450px] sm:min-h-[550px] md:min-h-[700px] flex items-center justify-center">
            {/* Dark overlay for light mode and gradient for dark mode */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/75 to-white/60 dark:from-black/70 dark:via-black/60 dark:to-black/50 pointer-events-none"></div>

            {/* FIXED: Inline bouncing balls that match the dark background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-20 right-16 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-optimized-bounce opacity-80 shadow-lg" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
                <div className="absolute bottom-32 left-20 w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-optimized-bounce opacity-60 shadow-md" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
                <div className="absolute top-60 right-12 w-7 h-7 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-optimized-bounce opacity-70 shadow-md" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
                <div className="absolute top-40 left-14 w-5 h-5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full animate-optimized-bounce opacity-75 shadow-sm" style={{ animationDelay: '3s', animationDuration: '4.5s' }}></div>
                <div className="absolute top-80 left-8 w-9 h-9 bg-gradient-to-r from-violet-400 to-purple-600 rounded-full animate-optimized-bounce opacity-65 shadow-lg" style={{ animationDelay: '1.5s', animationDuration: '3.8s' }}></div>
                <div className="absolute bottom-20 right-24 w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-optimized-bounce opacity-80 shadow-sm" style={{ animationDelay: '2.5s', animationDuration: '4.2s' }}></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10 py-6 sm:py-12 md:py-8 px-4 sm:px-6">
                {/* Main Heading */}
                <div className="relative mb-8 sm:mb-8 md:mb-10 w-full max-w-[100vw]">
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent leading-tight md:leading-relaxed transition-all duration-500 hover:scale-[1.02] cursor-default drop-shadow-sm break-words whitespace-normal">
                        Master the Markets
                    </h1>
                    
                    {/* Small decorative balls near the title */}
                    <div className="absolute -top-4 -right-4 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-80"></div>
                    <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-bounce opacity-60"></div>
                </div>

                {/* Subtitle */}
                <p className="text-base sm:text-lg md:text-2xl text-gray-600 dark:text-gray-300 mb-10 sm:mb-12 md:mb-14 max-w-4xl mx-auto leading-relaxed px-2 font-medium break-words">
                    Experience the thrill of stock trading without the risk. Learn strategies, track performance, and build your financial future today.
                </p>

                {/* CTA Button */}
                <div className="relative inline-block mb-12 sm:mb-16 md:mb-16">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <Link 
                        href="/simulator" 
                        className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 sm:py-5 px-6 sm:px-10 rounded-full hover:scale-105 transform transition-all duration-300 flex sm:inline-flex items-center justify-center text-center gap-2 sm:gap-3 shadow-xl hover:shadow-blue-500/25 text-sm sm:text-lg flex-wrap max-w-full"
                    >
                        <span>Start Trading Now - It's Free</span>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>

                
            </div>
        </section>
    );
};

export default TypingHeroSection;
