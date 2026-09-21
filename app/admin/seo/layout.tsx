// app/admin/seo/layout.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  Search,
  KeyRound,
  FileCode2,
  Bot,
  Network,
  Lightbulb,
  GitBranch,
  ArrowRightLeft,
  FileText,
  Settings,
  ShieldCheck,
  Sparkles,
  Globe,
  Layers,
  ArrowLeft,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    name: 'Engines',
    items: [
      { label: 'Overview', href: '/admin/seo', icon: Compass },
      { label: 'Search Console', href: '/admin/seo/search', icon: Search },
      { label: 'Google AI Mode', href: '/admin/seo/search/ai-google', icon: Sparkles },
      { label: 'Bing Webmaster', href: '/admin/seo/search/bing', icon: Globe },
    ],
  },
  {
    name: 'Indexation & Tech',
    items: [
      { label: 'Indexation & Sitemaps', href: '/admin/seo/indexation', icon: Layers },
      { label: 'Pages & CrUX', href: '/admin/seo/pages', icon: FileCode2 },
      { label: 'Keywords', href: '/admin/seo/keywords', icon: KeyRound },
      { label: 'AI Crawlers', href: '/admin/seo/ai-geo/crawlers', icon: ShieldCheck },
    ],
  },
  {
    name: 'Intelligence & Impact',
    items: [
      { label: 'AI / GEO Lab', href: '/admin/seo/ai-geo', icon: Bot },
      { label: 'Authority', href: '/admin/seo/authority', icon: Network },
      { label: 'Recommendations', href: '/admin/seo/recommendations', icon: Lightbulb },
      { label: 'Change Impact', href: '/admin/seo/changes', icon: GitBranch },
    ],
  },
  {
    name: 'Ops & Settings',
    items: [
      { label: 'Migration', href: '/admin/seo/migration', icon: ArrowRightLeft },
      { label: 'LLM Export', href: '/admin/seo/llm-export', icon: FileText },
      { label: 'Settings', href: '/admin/seo/settings', icon: Settings },
    ],
  },
];

const ALL_TABS = NAV_GROUPS.flatMap((g) => g.items);

export default function SeoAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#090E17] text-gray-900 dark:text-gray-100">
      {/* Top Banner & Header */}
      <header className="relative border-b border-gray-200 dark:border-gray-800/80 bg-white/95 dark:bg-[#0E131F]/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Title & Return */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 transition-colors"
                title="Back to Admin Command Center"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blue-500" />
                    <span>Search & GEO Intelligence</span>
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" /> $0 Free Tier
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Search Console • Bing Webmaster • Batch Crawler • AI Query Lab • Change Impact
                </p>
              </div>
            </div>

            {/* Free Mode Guarantee Pill & Mobile Jump Selector */}
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              {/* Mobile Quick Dropdown */}
              <div className="sm:hidden w-full">
                <select
                  value={pathname}
                  onChange={(e) => router.push(e.target.value)}
                  className="w-full text-xs font-bold bg-white dark:bg-[#151C28] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {NAV_GROUPS.map((group) => (
                    <optgroup key={group.name} label={group.name}>
                      {group.items.map((tab) => (
                        <option key={tab.href} value={tab.href}>
                          {tab.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-2 text-xs bg-gray-100 dark:bg-[#151C28] border border-gray-200 dark:border-gray-700/60 px-3 py-1.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Mode: FREE
                </div>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Monthly Spend: <strong className="text-gray-800 dark:text-gray-200">$0</strong>
                </span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Secondary DB</span>
              </div>
            </div>
          </div>

          {/* Categorized Multi-Row Responsive Tabs (Zero Sideways Scrollbar) */}
          <nav className="hidden sm:flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/60">
            {NAV_GROUPS.map((group, gIdx) => (
              <React.Fragment key={group.name}>
                {gIdx > 0 && (
                  <span className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-1 self-center" />
                )}
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = pathname === tab.href;

                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100/70 dark:bg-gray-800/50 hover:bg-gray-200/70 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/40'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
