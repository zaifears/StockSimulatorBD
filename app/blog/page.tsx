'use client';

import React from 'react';
import Link from 'next/link';
import Footer from '@/components/shared/Footer';

const posts = [
    {
        title: 'What is a Circuit Breaker in DSE? Upper & Lower Circuit Explained',
        href: '/blog/dse-circuit-breaker',
        publishedAt: 'July 11, 2026',
        excerpt: 'DSE-এর Circuit Breaker কী, Upper Circuit ও Lower Circuit কীভাবে কাজ করে, কেন শেয়ারের দাম নির্দিষ্ট সীমার বাইরে যেতে পারে না — সহজ ভাষায় জানুন।',
    },
    {
        title: 'DSE Trading Hours, Holidays & Settlement (T+2) Explained',
        href: '/blog/dse-trading-hours-bangladesh',
        publishedAt: 'July 11, 2026',
        excerpt: 'ঢাকা স্টক এক্সচেঞ্জের ট্রেডিং সময়, প্রতিটি সেশনের কাজ, T+2 Settlement কীভাবে কাজ করে এবং সরকারি ছুটির তালিকা — সব কিছু সহজ ভাষায়।',
    },
    {
        title: 'Press Release: SkillDash is Officially Rebranding to Stock Simulator BD',
        href: '/blog/skilldash-is-now-stock-simulator-bd',
        publishedAt: 'June 20, 2026',
        excerpt: 'SkillDash has officially rebranded to Stock Simulator BD. Read our official strategic announcement regarding our 100% pivot into building the ultimate Dhaka Stock Exchange (DSE) paper trading terminal.',
    },
    {
        title: 'How to Open a BO Account in Bangladesh (2026)',
        href: '/blog/how-to-open-bo-account-bangladesh',
        publishedAt: 'April 8, 2026',
        excerpt: 'Step-by-step BO account opening process, required documents, minimum funding, and safety checks before your first DSE trade.',
    },
    {
        title: 'Compare Top DSE Stock Brokers in Bangladesh (2026)',
        href: '/blog/top-dse-stock-brokers-2026',
        publishedAt: 'April 8, 2026',
        excerpt: 'A practical comparison of BO account opening costs, annual maintenance, and commission ranges for leading DSE brokers.',
    },
];

export default function BlogPage() {
    return (
        <main className="min-h-screen flex flex-col w-full bg-white dark:bg-[#090E17] transition-colors duration-300">
            
            {/* ✅ HERO SECTION WITH HOMEPAGE GRID & GLOWS */}
            <section className="relative w-full pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden border-b border-gray-100 dark:border-gray-800/60">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)]"></div>
                
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-blue-500/10 dark:bg-blue-600/15 blur-[100px] rounded-full"></div>
                </div>

                <header className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center animate-fade-in-up">
                    <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide mb-6">
                        StockSimBD Journal
                    </p>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">
                        Ideas, Guides, and <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            Market Notes
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Research-backed writing focused on Dhaka Stock Exchange education, broker selection, and practical investing workflows.
                    </p>
                </header>
            </section>

            {/* ✅ BLOG LIST SECTION */}
            <section className="w-full py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    {posts.map((post) => (
                        <article
                            key={post.href}
                            className="group rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1A1F26] p-8 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">{post.publishedAt}</p>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                <Link href={post.href}>{post.title}</Link>
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                {post.excerpt}
                            </p>
                            <Link
                                href={post.href}
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold hover:gap-3 transition-all"
                            >
                                <span>Read Full Article</span>
                                <span aria-hidden="true">→</span>
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            <Footer />

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