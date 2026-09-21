import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { identifyCrawlerBot, isPathRobotsAllowed } from '@/lib/seo/botPatterns';

const ALLOWED_ORIGINS = [
  'https://stocksimulator.tech',
  'https://www.stocksimulator.tech',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : []),
];

const INTERNAL_TELEMETRY_SECRET = process.env.CRON_SECRET || 'stocksimulator-crawler-telemetry-auth';

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 1. Crawler Telemetry: Detect real bot user-agents and log asynchronously without blocking
  if (!pathname.startsWith('/api/internal/crawler-telemetry')) {
    const userAgent = request.headers.get('user-agent');
    const botName = identifyCrawlerBot(userAgent);

    if (botName) {
      const robotsAllowed = isPathRobotsAllowed(pathname);
      const telemetryUrl = new URL('/api/internal/crawler-telemetry', request.url);
      const telemetryPromise = fetch(telemetryUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-crawler-telemetry-secret': INTERNAL_TELEMETRY_SECRET,
        },
        body: JSON.stringify({
          botName,
          userAgent: userAgent || '',
          path: pathname,
          statusCode: 200,
          robotsAllowed,
        }),
      }).catch(() => {
        // Non-fatal background telemetry reporting
      });

      if (event && typeof event.waitUntil === 'function') {
        event.waitUntil(telemetryPromise);
      }
    }
  }

  // 2. API CORS Handling (preserves existing proxy behavior for /api routes)
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

    if (request.method !== 'OPTIONS') {
      const response = NextResponse.next();

      if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }

    if (!isAllowedOrigin) {
      return new NextResponse(null, { status: 403 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
