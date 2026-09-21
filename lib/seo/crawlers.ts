// lib/seo/crawlers.ts
// AI & Search Engine Crawler Access Logger & Observational Tracker
// Strictly empirical: never returns fabricated or synthetic request counts.

import { FieldValue } from 'firebase-admin/firestore';
import { AiCrawlerLog, CrawlerSummary } from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import {
  BotCrawlerName,
  STANDARD_BOTS,
  identifyCrawlerBot,
} from './botPatterns';

export { identifyCrawlerBot };

/**
 * Records an observed crawler visit into isolated Firestore
 */
export async function logCrawlerRequest(
  userAgent: string,
  path: string,
  statusCode: number = 200,
  robotsAllowed: boolean = true
): Promise<void> {
  const botName = identifyCrawlerBot(userAgent);
  if (!botName) return;

  try {
    const db = getSeoDb();
    const now = new Date().toISOString();
    const logId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logRecord: AiCrawlerLog = {
      id: logId,
      botName,
      userAgent: userAgent.slice(0, 250),
      path: path.slice(0, 150),
      statusCode,
      robotsAllowed,
      observationalNote: `Observed request header claimed identity as ${botName} (user-agent based, non-cryptographic).`,
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
  } catch (err) {
    console.warn('Failed to log crawler request:', err);
  }
}

/**
 * Retrieves crawler summaries across all tracked bots.
 * Strictly empirical: bots that have not yet visited report 0 requests and empty lastSeen.
 */
export async function getCrawlerSummaries(): Promise<CrawlerSummary[]> {
  const db = getSeoDb();
  const snap = await db.collection('seo_crawler_summaries').get();

  const existingMap: Record<string, CrawlerSummary> = {};
  snap.docs.forEach((d) => {
    existingMap[d.id] = d.data() as CrawlerSummary;
  });

  return STANDARD_BOTS.map((botName) => {
    if (existingMap[botName]) {
      return existingMap[botName];
    }
    // Strictly honest: 0 visits recorded until real telemetry arrives
    return {
      botName,
      lastSeen: '',
      totalRequests: 0,
      successfulCount: 0,
      forbiddenCount: 0,
      notFoundCount: 0,
      robotsBlockedCount: 0,
      robotsTxtStatus: 'allowed',
    };
  });
}
