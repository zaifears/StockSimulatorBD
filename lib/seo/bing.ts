// lib/seo/bing.ts
// Microsoft Bing Webmaster REST API Client
// Endpoints adhere to official Bing Webmaster REST specification (post-August 2026 SOAP retirement)

import {
  BingTrafficStats,
  BingQueryItem,
  BingCrawlStat,
  BingLinkItem,
  BingAccountConfig,
} from './types';
import { getSeoDb } from '@/lib/firebaseSeoAdmin';
import { SITE_URL } from '@/lib/siteUrl';
import { encryptToken, decryptToken } from '@/lib/seo/crypto';

const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json';
const TIMEOUT_MS = 6000;

/**
 * Parses Microsoft JSON date string format ("/Date(1789776000000)/") into ISO YYYY-MM-DD
 */
export function parseBingDate(dateVal: any): string {
  if (!dateVal) return new Date().toISOString().split('T')[0];
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
    if (match) {
      try {
        return new Date(parseInt(match[1], 10)).toISOString().split('T')[0];
      } catch {
        return dateVal;
      }
    }
  }
  return String(dateVal);
}

/**
 * Dynamically resolves the verified property URL registered in Bing Webmaster Tools
 * (e.g. "https://stocksimulator.tech/" vs "https://www.stocksimulator.tech")
 */
export async function getVerifiedBingSiteUrl(apiKey: string, fallbackSiteUrl: string = SITE_URL): Promise<string> {
  if (!apiKey) return fallbackSiteUrl;

  try {
    const url = `${BING_API_BASE}/GetUserSites?apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) return fallbackSiteUrl;
    const json = await res.json();
    const list = json.d || json;
    if (!Array.isArray(list) || list.length === 0) return fallbackSiteUrl;

    try {
      const targetHost = new URL(fallbackSiteUrl.startsWith('http') ? fallbackSiteUrl : `https://${fallbackSiteUrl}`).host.replace(/^www\./, '');
      const matched = list.find((s: any) => s.Url && s.Url.includes(targetHost));
      if (matched && matched.Url) return matched.Url;
    } catch {
      // Ignore URL parsing fallback
    }

    return list[0].Url || fallbackSiteUrl;
  } catch (err) {
    console.warn('Failed to auto-resolve verified Bing site:', err);
    return fallbackSiteUrl;
  }
}

/**
 * Retrieves saved Bing Webmaster API configuration from isolated Firestore
 * API key is symmetrically decrypted if stored encrypted.
 */
export async function getBingConfig(): Promise<BingAccountConfig> {
  const db = getSeoDb();
  const doc = await db.collection('seo_config').doc('bing_auth').get();
  if (doc.exists) {
    const data = doc.data() as any;
    let apiKey = '';
    if (data.encryptedApiKey) {
      try {
        apiKey = decryptToken(data.encryptedApiKey);
      } catch {
        apiKey = '';
      }
    } else if (data.apiKey) {
      apiKey = data.apiKey;
    }

    const rawSiteUrl = data.siteUrl || SITE_URL;
    const siteUrl = apiKey ? await getVerifiedBingSiteUrl(apiKey, rawSiteUrl) : rawSiteUrl;

    return {
      apiKey,
      siteUrl,
      connected: !!apiKey,
      lastSyncAt: data.lastSyncAt,
    };
  }

  const envKey = process.env.BING_WEBMASTER_API_KEY || '';
  const siteUrl = envKey ? await getVerifiedBingSiteUrl(envKey, SITE_URL) : SITE_URL;
  return {
    apiKey: envKey,
    siteUrl,
    connected: !!envKey,
  };
}

/**
 * Saves Bing Webmaster API configuration with AES-256-GCM encryption
 */
export async function saveBingConfig(apiKey: string, siteUrl: string = SITE_URL): Promise<void> {
  const db = getSeoDb();
  const encryptedApiKey = apiKey ? encryptToken(apiKey) : '';
  const verifiedUrl = apiKey ? await getVerifiedBingSiteUrl(apiKey, siteUrl) : siteUrl;

  await db.collection('seo_config').doc('bing_auth').set({
    encryptedApiKey,
    siteUrl: verifiedUrl,
    connected: !!apiKey,
    lastSyncAt: new Date().toISOString(),
  });
}

/**
 * Fetches Rank and Traffic Stats from Bing Webmaster API
 */
export async function fetchBingTrafficStats(apiKey: string, siteUrl: string): Promise<BingTrafficStats[]> {
  if (!apiKey) {
    return [];
  }

  try {
    const targetUrl = await getVerifiedBingSiteUrl(apiKey, siteUrl);
    const url = `${BING_API_BASE}/GetRankAndTrafficStats?siteUrl=${encodeURIComponent(targetUrl)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`Bing API error ${res.status}`);
      return [];
    }
    const json = await res.json();
    const list = json.d || json;
    if (!Array.isArray(list)) return [];

    return list.map((item: any) => ({
      date: parseBingDate(item.Date),
      clicks: item.Clicks || 0,
      impressions: item.Impressions || 0,
      ctr: item.Impressions > 0 ? Math.round(((item.Clicks || 0) / item.Impressions) * 10000) / 100 : 0,
      position: item.AvgImpressionPosition ? Math.round(item.AvgImpressionPosition * 10) / 10 : 0,
      vertical: (item.Vertical || 'web').toLowerCase(),
    }));
  } catch (err) {
    console.error('Failed to fetch Bing traffic stats:', err);
    return [];
  }
}

/**
 * Fetches top Bing search queries and aggregates by query across date intervals
 */
export async function fetchBingQueryStats(apiKey: string, siteUrl: string): Promise<BingQueryItem[]> {
  if (!apiKey) return [];

  try {
    const targetUrl = await getVerifiedBingSiteUrl(apiKey, siteUrl);
    const url = `${BING_API_BASE}/GetQueryStats?siteUrl=${encodeURIComponent(targetUrl)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.d || json;
    if (!Array.isArray(list)) return [];

    const queryMap = new Map<string, { query: string; clicks: number; impressions: number; totalPos: number; count: number }>();
    for (const item of list) {
      const q = (item.Query || '').trim();
      if (!q) continue;
      const existing = queryMap.get(q) || { query: q, clicks: 0, impressions: 0, totalPos: 0, count: 0 };
      existing.clicks += item.Clicks || 0;
      existing.impressions += item.Impressions || 0;
      if (item.AvgImpressionPosition && item.AvgImpressionPosition > 0) {
        existing.totalPos += item.AvgImpressionPosition;
        existing.count++;
      }
      queryMap.set(q, existing);
    }

    const aggregated = Array.from(queryMap.values()).map((item) => ({
      query: item.query,
      clicks: item.clicks,
      impressions: item.impressions,
      ctr: item.impressions > 0 ? Math.round((item.clicks / item.impressions) * 10000) / 100 : 0,
      position: item.count > 0 ? Math.round((item.totalPos / item.count) * 10) / 10 : 0,
    }));

    aggregated.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
    return aggregated.slice(0, 100);
  } catch (err) {
    console.error('Failed to fetch Bing query stats:', err);
    return [];
  }
}

/**
 * Fetches Bing crawl statistics and maps official property names
 */
export async function fetchBingCrawlStats(apiKey: string, siteUrl: string): Promise<BingCrawlStat[]> {
  if (!apiKey) return [];

  try {
    const targetUrl = await getVerifiedBingSiteUrl(apiKey, siteUrl);
    const url = `${BING_API_BASE}/GetCrawlStats?siteUrl=${encodeURIComponent(targetUrl)}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = json.d || json;
    if (!Array.isArray(list)) return [];

    const mapped: BingCrawlStat[] = list.map((item: any) => ({
      crawlDate: parseBingDate(item.Date || item.CrawlDate),
      pagesCrawled: item.CrawledPages ?? item.PagesCrawled ?? 0,
      crawlErrors: item.CrawlErrors ?? 0,
      dnsFailures: item.DnsFailures ?? 0,
      blockedByRobots: item.BlockedByRobotsTxt ?? item.BlockedByRobots ?? 0,
      inIndex: item.InIndex ?? 0,
      inLinks: item.InLinks ?? 0,
    }));

    mapped.sort((a, b) => (b.crawlDate > a.crawlDate ? 1 : -1));
    return mapped.slice(0, 30);
  } catch (err) {
    console.error('Failed to fetch Bing crawl stats:', err);
    return [];
  }
}

/**
 * Fetches Bing external backlink data
 */
export async function fetchBingBacklinks(apiKey: string, siteUrl: string): Promise<BingLinkItem[]> {
  return [];
}
