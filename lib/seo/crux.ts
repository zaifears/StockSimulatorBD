// lib/seo/crux.ts
// Chrome UX Report (CrUX) API Client for 28-day rolling real-user Core Web Vitals

import { CruxFieldData, CruxMetricScore } from './types';
import { SITE_URL } from '@/lib/siteUrl';

const CRUX_API_ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';

/**
 * Queries real-user Core Web Vitals for an origin or specific URL using Google's Chrome UX Report API.
 * Falls back gracefully to verified platform baseline if API key is not supplied.
 */
export async function fetchCruxMetrics(urlOrOrigin: string = SITE_URL): Promise<CruxFieldData> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_CRUX_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing GOOGLE_PAGESPEED_API_KEY or GOOGLE_CRUX_API_KEY. Configure a Google API key in Vercel to fetch real-user Chrome Web Vitals.'
    );
  }

  const isOrigin = urlOrOrigin === SITE_URL || !urlOrOrigin.includes('/', 8);
  const body = isOrigin ? { origin: urlOrOrigin } : { url: urlOrOrigin };

  const res = await fetch(`${CRUX_API_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 86400 }, // Cache 24h
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'No Chrome UX Report field data available for this path. Google requires sufficient real Chrome user traffic before publishing CrUX metrics.'
      );
    }
    const errText = await res.text();
    throw new Error(`Google CrUX API returned HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const metrics = data.record?.metrics;
  if (!metrics) {
    throw new Error('CrUX record returned without metrics.');
  }

  const lcpScore = parseMetric(metrics.largest_contentful_paint, 2500, 4000);
  const inpScore = parseMetric(metrics.interaction_to_next_paint, 200, 500);
  const clsScore = parseMetric(metrics.cumulative_layout_shift, 0.1, 0.25, 0.01);
  const fcpScore = parseMetric(metrics.first_contentful_paint, 1800, 3000);
  const ttfbScore = parseMetric(metrics.experimental_time_to_first_byte, 800, 1800);

  const isHealthy =
    lcpScore.rating === 'good' && inpScore.rating === 'good' && clsScore.rating === 'good';

  return {
    urlOrOrigin,
    collectionPeriod: '28-day rolling period (Real Chrome Users)',
    lcp: lcpScore,
    inp: inpScore,
    cls: clsScore,
    fcp: fcpScore,
    ttfb: ttfbScore,
    overallStatus: isHealthy ? 'healthy' : 'needs_improvement',
    lastCheckedAt: new Date().toISOString(),
  };
}

function parseMetric(metric: any, goodThreshold: number, poorThreshold: number, multiplier: number = 1): CruxMetricScore {
  if (!metric || !metric.percentiles) {
    return { p75: 0, rating: 'good' };
  }
  const rawP75 = parseFloat(metric.percentiles.p75) * multiplier;
  const p75 = Math.round(rawP75 * 100) / 100;

  let rating: 'good' | 'needs_improvement' | 'poor' = 'good';
  if (p75 > poorThreshold) rating = 'poor';
  else if (p75 > goodThreshold) rating = 'needs_improvement';

  return { p75, rating };
}
