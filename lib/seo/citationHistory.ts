// lib/seo/citationHistory.ts
// AI Citation History Timeline & Change Detection Event Ledger

import {
  AiCitationTimelinePoint,
  AiCitationEvent,
  AiVisibilityObservation,
} from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';

/**
 * Returns month-by-month citation timeline across ChatGPT, Gemini, Perplexity, and Claude
 */
export async function getCitationTimeline(): Promise<{
  timeline: AiCitationTimelinePoint[];
  totalObservations: number;
  totalCitedCount: number;
  citationUrlDistribution: { path: string; count: number }[];
}> {
  const db = getSeoDb();
  const snap = await db.collection('ai_visibility_results').orderBy('observedAt', 'desc').get();
  const observations = snap.docs.map((d) => d.data() as AiVisibilityObservation);

  const urlCountMap: Record<string, number> = {};
  let totalCited = 0;

  // Compute URL distribution
  observations.forEach((obs) => {
    if (obs.cited) {
      totalCited++;
      obs.citedUrls.forEach((url) => {
        const path = url.replace(/^https?:\/\/[^/]+/, '') || '/';
        urlCountMap[path] = (urlCountMap[path] || 0) + 1;
      });
    }
  });

  // Aggregate real observations into month-by-month timeline points
  const timelineMap: Record<string, AiCitationTimelinePoint> = {};
  observations.forEach((obs) => {
    const month = obs.observedAt ? obs.observedAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const key = `${month}_${obs.query}`;
    if (!timelineMap[key]) {
      timelineMap[key] = {
        dateMonth: month,
        query: obs.query,
        chatGptCited: false,
        geminiCited: false,
        perplexityCited: false,
        claudeCited: false,
      };
    }
    if (obs.cited) {
      if (obs.provider === 'ChatGPT') timelineMap[key].chatGptCited = true;
      if (obs.provider === 'Gemini') timelineMap[key].geminiCited = true;
      if (obs.provider === 'Perplexity') timelineMap[key].perplexityCited = true;
      if (obs.provider === 'Claude') timelineMap[key].claudeCited = true;
    }
  });

  const timeline = Object.values(timelineMap).sort((a, b) => b.dateMonth.localeCompare(a.dateMonth));

  return {
    timeline,
    totalObservations: observations.length,
    totalCitedCount: totalCited,
    citationUrlDistribution: Object.entries(urlCountMap)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Detects differences between the latest AI observation and previous observations,
 * emitting an event ledger item (NEW_CITATION, CITATION_LOST, MENTION_GAINED, etc.)
 */
export async function detectCitationEvent(
  newObs: AiVisibilityObservation,
  previousObs?: AiVisibilityObservation
): Promise<AiCitationEvent | null> {
  const db = getSeoDb();
  let event: AiCitationEvent | null = null;

  if (!previousObs) {
    if (newObs.cited) {
      event = {
        id: `evt_${Date.now()}`,
        eventType: 'NEW_CITATION',
        provider: newObs.provider,
        query: newObs.query,
        details: `${newObs.provider} now cites StockSimulatorBD for query: "${newObs.query}"`,
        newValue: newObs.citedUrls.join(', '),
        detectedAt: new Date().toISOString(),
      };
    }
  } else {
    // 1. Citation gained / lost
    if (!previousObs.cited && newObs.cited) {
      event = {
        id: `evt_${Date.now()}`,
        eventType: 'NEW_CITATION',
        provider: newObs.provider,
        query: newObs.query,
        details: `${newObs.provider} newly added citation: ${newObs.citedUrls.join(', ')}`,
        previousValue: 'not cited',
        newValue: newObs.citedUrls.join(', '),
        detectedAt: new Date().toISOString(),
      };
    } else if (previousObs.cited && !newObs.cited) {
      event = {
        id: `evt_${Date.now()}`,
        eventType: 'CITATION_LOST',
        provider: newObs.provider,
        query: newObs.query,
        details: `${newObs.provider} previously cited StockSimulatorBD but citation was dropped in latest response.`,
        previousValue: previousObs.citedUrls.join(', '),
        newValue: 'none',
        detectedAt: new Date().toISOString(),
      };
    } else if (!previousObs.mentioned && newObs.mentioned) {
      event = {
        id: `evt_${Date.now()}`,
        eventType: 'MENTION_GAINED',
        provider: newObs.provider,
        query: newObs.query,
        details: `${newObs.provider} mentioned StockSimulatorBD by brand name in answer text.`,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  if (event) {
    await db.collection('seo_ai_events').doc(event.id).set(event);
  }

  return event;
}

/**
 * Retrieves recent citation events from the event ledger
 */
export async function getCitationEvents(): Promise<AiCitationEvent[]> {
  const db = getSeoDb();
  const snap = await db.collection('seo_ai_events').orderBy('detectedAt', 'desc').limit(20).get();
  if (snap.empty) {
    return [];
  }
  return snap.docs.map((d) => d.data() as AiCitationEvent);
}
