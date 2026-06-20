import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavbarWrapper from '../components/NavbarWrapper'
import { AuthProvider } from '../contexts/AuthContext'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import SparkEffectInitializer from '@/components/SparkEffectInitializer'
import CookieConsent from '@/components/CookieConsent'
import SentryInitializer from '@/components/SentryInitializer'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import IOSInstallGuide from '@/components/iOSInstallGuide'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"
import ServiceWorkerCleanup from '@/components/ServiceWorkerCleanup'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

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
  title: 'Stock Simulator BD - DSE Paper Trading Simulator | Practice Stock Market Risk-Free',
  description: 'Practice trading Dhaka Stock Exchange stocks with virtual currency. The only free DSE simulator with real-time market data, T+1 settlement rules, and 0.3% commission simulation. Learn stock investing without risking real money.',
  applicationName: 'Stock Simulator BD',
  keywords: [
    "DSE simulator", "paper trading Bangladesh", "Dhaka Stock Exchange simulator",
    "virtual stock trading", "stock market practice Bangladesh", "DSE stocks",
    "learn stock trading", "free paper trading", "Bangladesh stock market",
    "trading simulator", "practice trading", "virtual trading Bangladesh",
    "stock market learning", "DSE practice", "risk-free trading", "stock simulator bd"
  ],
  authors: [{ name: 'Stock Simulator BD Team' }],
  creator: 'Shahoriar Hossain',
  publisher: 'Stock Simulator BD',
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
    title: "Stock Simulator BD - DSE Paper Trading Simulator - Practice Stock Trading Risk-Free",
    description: "The only free paper trading simulator built for the Dhaka Stock Exchange. Trade 300+ DSE stocks with virtual currency, real-time market data, T+1 settlement rules, and 0.3% commission. Learn investing without financial risk.",
    url: process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://www.stocksimulator.tech",
    siteName: "Stock Simulator BD",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://www.stocksimulator.tech"}/og/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Stock Simulator BD - DSE Paper Trading Simulator",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stock Simulator BD - DSE Paper Trading Simulator',
    description: 'Practice trading Dhaka Stock Exchange stocks risk-free with virtual currency. Learn stock investing with real market data and realistic trading rules.',
    images: [`${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://www.stocksimulator.tech"}/og/og-image.png`],
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech',
  },
  verification: {
    google: 'NRcmZt1gkRaisYql52KCRUqEJCyGeTGyXsntWkqYFFk',
  },
  category: 'finance',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stock Simulator BD',
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
        <link rel="sitemap" type="application/xml" href="https://www.stocksimulator.tech/sitemap.xml" />
        
        {/* Enhanced Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Stock Simulator BD",
              "alternateName": "Stock Simulator BD - DSE Paper Trading",
              "description": "Practice trading Dhaka Stock Exchange stocks risk-free with virtual currency.",
              "url": "https://www.stocksimulator.tech",
              "sameAs": [
                "https://www.facebook.com/stocksimulatorbd",
                "https://twitter.com/stocksimulatorbd",
                "https://www.linkedin.com/company/stocksimulatorbd"
              ],
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.stocksimulator.tech/discover?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Stock Simulator BD",
                "url": "https://www.stocksimulator.tech",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.stocksimulator.tech/web-app-manifest-512x512.png",
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
              "name": "Stock Simulator BD",
              "description": "Paper trading simulator platform for Bangladesh investors",
              "url": "https://www.stocksimulator.tech",
              "logo": "https://www.stocksimulator.tech/web-app-manifest-512x512.png",
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
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-gray-900 transition-colors duration-300`} suppressHydrationWarning={true}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        {/* Microsoft Clarity Tracking */}
        <Script id="clarity-script" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "x930hvyge2");`}
        </Script>
        {/* End Microsoft Clarity */}

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
          <EmailVerificationBanner />
          <SparkEffectInitializer />
          <SentryInitializer />
          <ServiceWorkerCleanup />
          
          <div className="relative min-h-screen">
            <NavbarWrapper />
            <main role="main" className="lg:pb-0 pb-16">{children}</main>
          </div>
          
          <CookieConsent />
        </AuthProvider>
        
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}