/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Keep TypeScript checking enabled
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
  
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
  
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net',
      },
    ],
  },
  
  // Enable compression and optimize bundles
  compress: true,
  poweredByHeader: false,
  
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Fixed HTTP headers with correct regex
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const enableTrustedTypes = process.env.ENABLE_TRUSTED_TYPES === 'true';

    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://snap.licdn.com https://www.google.com https://www.gstatic.com https://apis.google.com https://accounts.google.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' ws: wss: https://*.googleapis.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://www.google.com https://www.gstatic.com https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms https://region1.google-analytics.com https://accounts.google.com https://va.vercel-scripts.com",
      "frame-src 'self' https://www.google.com https://www.gstatic.com https://accounts.google.com https://*.firebaseapp.com https://*.web.app",
      "worker-src 'self' blob:",
    ];

    if (isProduction) {
      cspDirectives.push('upgrade-insecure-requests');
    }

    // Trusted Types can break third-party and framework runtime script assignment if not fully configured.
    if (isProduction && enableTrustedTypes) {
      cspDirectives.push("require-trusted-types-for 'script'");
      cspDirectives.push("trusted-types default nextjs");
    }

    const csp = cspDirectives.join('; ');

    return [
      ...(isProduction
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-site',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // 🚀 Cache static HTML pages (24 hours)
      {
        source: '/about-us',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        source: '/policy',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, s-maxage=604800',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // 🚀 Cache API responses
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=300',
          },
        ],
      },
    ];
  },

  // Rewrites for manifest file compatibility
  async rewrites() {
    return [
      {
        source: '/manifest.webmanifest',
        destination: '/site.webmanifest',
      },
    ];
  },

  env: {
    NEXT_PUBLIC_IS_PREVIEW_MODE: process.env.IS_PREVIEW_MODE,
  },
};

export default nextConfig;
