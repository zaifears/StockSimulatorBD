import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavbarWrapper from '../components/NavbarWrapper'
import SiteMain from '../components/SiteMain'
import { AuthProvider } from '../contexts/AuthContext'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import SparkEffectInitializer from '@/components/SparkEffectInitializer'
import SentryInitializer from '@/components/SentryInitializer'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import IOSInstallGuide from '@/components/iOSInstallGuide'
import { Analytics } from "@vercel/analytics/react"
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import VisitTracker from '@/components/VisitTracker'
import { SITE_URL, absoluteUrl } from '@/lib/siteUrl'

const GTM_ID = 'GTM-PS2HRL37'
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()
const LINKEDIN_PARTNER_ID = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID?.trim()

// Optimize font loading with display swap
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'StockSimulatorBD: DSE Trading Simulator',
  description: "Free paper trading simulator for the Dhaka Stock Exchange. Practice DSE share trading with live prices, real market hours, T+1 rules and virtual money.",
  applicationName: 'StockSimulatorBD',
  keywords: [
    "DSE simulator", "paper trading Bangladesh", "Dhaka Stock Exchange simulator",
    "fake trading simulator", "fake stock trading simulator", "fake stock market game",
    "virtual stock trading", "stock market practice Bangladesh", "DSE stocks",
    "learn stock trading", "free paper trading", "Bangladesh stock market",
    "trading simulator", "practice trading", "virtual trading Bangladesh",
    "stock market learning", "DSE practice", "risk-free trading", "stock simulator bd",
    "stocks sim", "stock market game bd", "stock market game bangladesh", "stock market game",
    "BO account opening", "Bangladesh BO account", "open BO account Bangladesh",
    "stock market for students Bangladesh", "student investing Bangladesh",
    "new investor Bangladesh", "first time stock market investor Bangladesh",
    "sanchayapatra to stock market", "government savings certificate to shares",
    "safe investment to stock market Bangladesh", "how to start investing after graduation Bangladesh",
    "beginner stock investor Bangladesh", "afraid to invest in stock market Bangladesh",
  ],
  authors: [{ name: 'Md Al Shahoriar Hossain', url: 'https://shahoriar.bd' }],
  creator: 'Md Al Shahoriar Hossain',
  publisher: 'StockSimulatorBD',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "StockSimulatorBD: DSE Trading Simulator. Practice Stock Trading Risk-Free",
    description: "The only free paper trading simulator built for the Dhaka Stock Exchange. Trade 300+ DSE stocks with virtual currency, real-time market data, T+1 settlement rules, and 0.4% commission. Built for students learning the market and for new investors moving beyond Sanchayapatra and fixed deposits into stocks. Practice first, risk nothing.",
    url: SITE_URL,
    siteName: "StockSimulatorBD",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: absoluteUrl("/og/og-image.png"),
        width: 1200,
        height: 630,
        alt: "StockSimulatorBD: DSE Trading Simulator",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockSimulatorBD: DSE Trading Simulator',
    description: 'Practice trading Dhaka Stock Exchange stocks risk-free with virtual currency. For students and for new investors moving from Sanchayapatra into the stock market, with real market data and realistic trading rules.',
    images: [absoluteUrl("/og/og-image.png")],
    creator: '@StockSimulatorBD',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/logo/ios/16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo/ios/20.png', sizes: '20x20', type: 'image/png' },
      { url: '/logo/ios/29.png', sizes: '29x29', type: 'image/png' },
      { url: '/logo/ios/32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/ios/40.png', sizes: '40x40', type: 'image/png' },
      { url: '/logo/ios/50.png', sizes: '50x50', type: 'image/png' },
      { url: '/logo/ios/57.png', sizes: '57x57', type: 'image/png' },
      { url: '/logo/ios/58.png', sizes: '58x58', type: 'image/png' },
      { url: '/logo/ios/60.png', sizes: '60x60', type: 'image/png' },
      { url: '/logo/ios/64.png', sizes: '64x64', type: 'image/png' },
      { url: '/logo/ios/72.png', sizes: '72x72', type: 'image/png' },
      { url: '/logo/ios/76.png', sizes: '76x76', type: 'image/png' },
      { url: '/logo/ios/80.png', sizes: '80x80', type: 'image/png' },
      { url: '/logo/ios/87.png', sizes: '87x87', type: 'image/png' },
      { url: '/logo/ios/100.png', sizes: '100x100', type: 'image/png' },
      { url: '/logo/ios/114.png', sizes: '114x114', type: 'image/png' },
      { url: '/logo/ios/120.png', sizes: '120x120', type: 'image/png' },
      { url: '/logo/ios/128.png', sizes: '128x128', type: 'image/png' },
      { url: '/logo/ios/144.png', sizes: '144x144', type: 'image/png' },
      { url: '/logo/ios/152.png', sizes: '152x152', type: 'image/png' },
      { url: '/logo/ios/167.png', sizes: '167x167', type: 'image/png' },
      { url: '/logo/ios/180.png', sizes: '180x180', type: 'image/png' },
      { url: '/logo/ios/192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo/ios/256.png', sizes: '256x256', type: 'image/png' },
      { url: '/logo/ios/512.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo/ios/1024.png', sizes: '1024x1024', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  metadataBase: new URL(SITE_URL),
  alternates: {
    // './' resolves against metadataBase per route, so every page self-canonicalises.
    // An absolute URL here would make every child page declare the homepage as its
    // canonical, which de-indexes /about-us, /coins, /blog, /trade and every post.
    canonical: './',
  },
  verification: {
    google: 'NRcmZt1gkRaisYql52KCRUqEJCyGeTGyXsntWkqYFFk',
  },
  category: 'finance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StockSimulatorBD',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'ai-content-declaration': 'human-created',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* LLM Discovery Links - Helps AI assistants understand this site */}
        <link rel="ai-content" href="/llms.txt" />
        <link rel="ai-documentation" href="/llms-full.txt" type="text/plain" />
        
        {/* Essential Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Google Tag Manager Head Script */}
        <Script id="gtm-script" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>

        {/* Performance optimizations */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        {RECAPTCHA_SITE_KEY && <link rel="dns-prefetch" href="//www.google.com" />}
        {RECAPTCHA_SITE_KEY && <link rel="dns-prefetch" href="//www.gstatic.com" />}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        {RECAPTCHA_SITE_KEY && <link rel="preconnect" href="https://www.google.com" crossOrigin="anonymous" />}
        {RECAPTCHA_SITE_KEY && <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />}
        
        {/* Sitemap Link for Search Engines */}
        <link rel="sitemap" type="application/xml" href={absoluteUrl("/sitemap.xml")} />
        
        {/* Enhanced Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "StockSimulatorBD",
              "alternateName": [
                "StockSimulatorBD: DSE Trading Simulator",
                "Bangladesh Stock Market Game",
                "Stocks Sim BD"
              ],
              "description": "Practice trading Dhaka Stock Exchange stocks risk-free with virtual currency.",
              "url": SITE_URL,
              "sameAs": [
                "https://www.facebook.com/stocksimulatorbd"
              ],
              "publisher": {
                "@type": "Organization",
                "name": "StockSimulatorBD",
                "url": SITE_URL,
                "logo": {
                  "@type": "ImageObject",
                  "url": absoluteUrl("/web-app-manifest-512x512.png"),
                  "width": 512,
                  "height": 512
                },
                "contactPoint": {
                  "@type": "ContactPoint",
                  "contactType": "customer service",
                  "availableLanguage": ["English"]
                }
              }
            })
          }}
        />

        {/* Additional Structured Data for Educational Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "StockSimulatorBD",
              "description": "Paper trading simulator platform for Bangladesh investors",
              "url": SITE_URL,
              "logo": absoluteUrl("/web-app-manifest-512x512.png"),
              "educationalCredentialAwarded": "Trading Experience",
              "offers": [
                {
                  "@type": "Course",
                  "name": "DSE Stock Market Simulator",
                  "description": "Practice trading stocks risk-free with live data"
                }
              ]
            })
          }}
        />

        {/* SoftwareApplication - enables Google app rich results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "StockSimulatorBD",
              "alternateName": ["Stock Market Game BD", "Stocks Sim"],
              "url": SITE_URL,
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web",
              "browserRequirements": "Requires JavaScript",
              "description": "The only free DSE paper trading simulator for the Dhaka Stock Exchange. Trade 300+ stocks with virtual currency, real-time market data, T+1 settlement rules, and 0.4% commission simulation.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BDT"
              },
              "author": {
                "@type": "Person",
                "name": "Md Al Shahoriar Hossain",
                "url": "https://shahoriar.bd"
              },
              "creator": {
                "@type": "Person",
                "name": "Md Al Shahoriar Hossain",
                "url": "https://shahoriar.bd"
              },
              "featureList": [
                "Real-time DSE market data",
                "T+1 settlement simulation",
                "0.4% commission simulation",
                "Virtual portfolio tracking",
                "300+ DSE stocks"
              ]
            })
          }}
        />

        {/* Person - creator entity */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Md Al Shahoriar Hossain",
              "alternateName": ["Shahoriar Hossain", "zaifears"],
              "url": "https://shahoriar.bd",
              "sameAs": [
                "https://shahoriar.bd",
                "https://linkedin.com/in/shahoriarhossain",
                "https://github.com/zaifears"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-gray-900 transition-colors duration-300`} suppressHydrationWarning={true}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            className="hidden invisible"
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        {/* UI/UX Metrics Engine - Obfuscated ID to bypass basic ad blockers */}
        <Script id="ui-metrics-engine" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "xkn64ae06m");`}
        </Script>

        <ServiceWorkerRegistration />
        <IOSInstallGuide />
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}

        {LINKEDIN_PARTNER_ID && (
          <>
            <Script id="linkedin-insight-init" strategy="lazyOnload">
              {`
                window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                window._linkedin_data_partner_ids.push('${LINKEDIN_PARTNER_ID}');
                window.lintrk = window.lintrk || function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q = window.lintrk.q || [];
              `}
            </Script>
            <Script
              id="linkedin-insight-src"
              src="https://snap.licdn.com/li.lms-analytics/insight.min.js"
              strategy="lazyOnload"
            />
          </>
        )}

        <AuthProvider>
          <VisitTracker />
          <EmailVerificationBanner />
          <SparkEffectInitializer />
          <SentryInitializer />
          <ServiceWorkerCleanup />
          
          <div className="relative min-h-screen">
            <NavbarWrapper />
            <SiteMain>{children}</SiteMain>
          </div>
        </AuthProvider>
        
        <Analytics />
      </body>
    </html>
  )
}