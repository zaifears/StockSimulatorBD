// app/api/internal/crawler-telemetry/route.ts
// Internal ingestion endpoint for real-time bot crawler hits dispatched asynchronously from middleware.
// Uses isolated SEO Firestore with atomic FieldValue increments.

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { BotCrawlerName, STANDARD_BOTS } from '@/lib/seo/botPatterns';
import { AiCrawlerLog } from '@/lib/seo/types';

export const runtime = 'nodejs';

const INTERNAL_TELEMETRY_SECRET = process.env.CRON_SECRET || 'stocksimulator-crawler-telemetry-auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-crawler-telemetry-secret');
    if (authHeader !== INTERNAL_TELEMETRY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized internal telemetry call' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      botName,
      userAgent = '',
      path = '/',
      statusCode = 200,
      robotsAllowed = true,
    }: {
      botName: BotCrawlerName;
      userAgent?: string;
      path?: string;
      statusCode?: number;
      robotsAllowed?: boolean;
    } = body;

    if (!botName || !STANDARD_BOTS.includes(botName)) {
      return NextResponse.json({ error: 'Invalid or untracked botName' }, { status: 400 });
    }

    const db = getSeoDb();
    const now = new Date().toISOString();

    // 1. Write individual log record with automatic retention in mind
    const logId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRecord: AiCrawlerLog = {
      id: logId,
      botName,
      userAgent: String(userAgent).slice(0, 250),
      path: String(path).slice(0, 150),
      statusCode: Number(statusCode) || 200,
      robotsAllowed: Boolean(robotsAllowed),
      observationalNote: `Real observed telemetry: User-Agent claimed identity as ${botName}.`,
      timestamp: now,
    };

    const summaryRef = db.collection('seo_crawler_summaries').doc(botName);

    await Promise.all([
      db.collection('seo_crawler_logs').doc(logId).set(logRecord),
      summaryRef.set(
        {
          botName,
          lastSeen: now,
          totalRequests: FieldValue.increment(1),
          successfulCount: FieldValue.increment(statusCode === 200 ? 1 : 0),
          forbiddenCount: FieldValue.increment(statusCode === 403 ? 1 : 0),
          notFoundCount: FieldValue.increment(statusCode === 404 ? 1 : 0),
          robotsBlockedCount: FieldValue.increment(!robotsAllowed ? 1 : 0),
          robotsTxtStatus: robotsAllowed ? 'allowed' : 'disallowed',
        },
        { merge: true }
      ),
    ]);

    return NextResponse.json({ success: true, logged: botName });
  } catch (error: any) {
    console.error('[crawler-telemetry] Failed to record bot hit:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
