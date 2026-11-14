import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { identifyCrawlerBot, isPathRobotsAllowed } from '@/lib/seo/botPatterns';

const ALLOWED_ORIGINS = [
  'https://stocksimulator.tech',
  'https://www.stocksimulator.tech',
  'https://stocksimulator.shahoriar.bd',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : []),
];

const INTERNAL_TELEMETRY_SECRET = process.env.CRON_SECRET || process.env.INTERNAL_TELEMETRY_SECRET || '';
const VPS_TELEMETRY_URL = `${(process.env.NEXT_PUBLIC_VPS_API_URL || 'https://dse.shahoriar.bd').replace(/\/+$/, '')}/api/internal/crawler-telemetry`;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // 1. Crawler Telemetry: Detect real bot user-agents and log asynchronously directly to the Oracle VPS
  //    (eliminating Vercel serverless invocations for bot traffic).
  if (!pathname.startsWith('/api/internal/crawler-telemetry') && INTERNAL_TELEMETRY_SECRET) {
    const userAgent = request.headers.get('user-agent');
    const botName = identifyCrawlerBot(userAgent);

    if (botName) {
      const robotsAllowed = isPathRobotsAllowed(pathname);
      const telemetryPromise = fetch(VPS_TELEMETRY_URL, {
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

// Every proxy invocation costs Fluid Active CPU on Vercel, so humans must never trigger it on pages:
// - /api/*: always runs (CORS handling).
// - everything else: runs ONLY when the user-agent looks like a tracked crawler (telemetry).
// The regex is case-sensitive (no inline flags in matcher values), so it lists the canonical casings;
// identifyCrawlerBot() above re-checks case-insensitively. Keep in step with BOT_PATTERNS.
export const config = {
  matcher: [
    '/api/:path*',
    {
      source:
        '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      has: [{ type: 'header', key: 'user-agent', value:
            '.*(?:[Gg]ooglebot|Google-Extended|OAI-SearchBot|ChatGPT-User|GPTBot|[Bb]ingbot|PerplexityBot|Perplexity-User|ClaudeBot|Claude-SearchBot|Claude-Web|Claude-User|anthropic-ai|Bytespider).*' }],
    },
  ],
};
