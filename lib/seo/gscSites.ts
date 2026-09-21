// lib/seo/gscSites.ts
// Utility to query Google Search Console sites.list and auto-detect domain properties

import { SITE_URL } from '@/lib/siteUrl';

export interface GscSiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

/**
 * Extracts apex domain (e.g. 'stocksimulator.tech') from a full URL or hostname
 */
export function getDomainFromUrl(rawUrl: string): string {
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(`https://${rawUrl}`);
    return url.hostname.replace(/^www\./, '').toLowerCase().trim();
  } catch {
    return rawUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase().trim();
  }
}

/**
 * Intelligently matches the best Google Search Console site entry for this application.
 * Prioritizes DNS Domain Properties (sc-domain:example.com), followed by exact HTTPS prefixes.
 */
export function matchGscProperty(sites: GscSiteEntry[], domainOrUrl: string = SITE_URL): string {
  if (!sites || sites.length === 0) {
    const domain = getDomainFromUrl(domainOrUrl);
    return `sc-domain:${domain}`;
  }

  const targetDomain = getDomainFromUrl(domainOrUrl);

  // 1. Exact DNS domain property match (e.g., 'sc-domain:stocksimulator.tech')
  const scDomainMatch = sites.find(
    (s) => s.siteUrl.toLowerCase() === `sc-domain:${targetDomain}`
  );
  if (scDomainMatch) return scDomainMatch.siteUrl;

  // 2. Exact URL prefix matches (HTTPS www or apex)
  const httpsWwwMatch = sites.find(
    (s) => s.siteUrl.toLowerCase() === `https://www.${targetDomain}/` || s.siteUrl.toLowerCase() === `https://www.${targetDomain}`
  );
  if (httpsWwwMatch) return httpsWwwMatch.siteUrl;

  const httpsApexMatch = sites.find(
    (s) => s.siteUrl.toLowerCase() === `https://${targetDomain}/` || s.siteUrl.toLowerCase() === `https://${targetDomain}`
  );
  if (httpsApexMatch) return httpsApexMatch.siteUrl;

  // 3. Substring match for target domain
  const substringMatch = sites.find((s) => s.siteUrl.toLowerCase().includes(targetDomain));
  if (substringMatch) return substringMatch.siteUrl;

  // 4. If user only has 1 property verified in GSC, return that property
  if (sites.length === 1 && sites[0].siteUrl) {
    return sites[0].siteUrl;
  }

  // 5. Fallback to sc-domain
  return `sc-domain:${targetDomain}`;
}

/**
 * Discovers verified properties from Google Search Console API using an active access token
 */
export async function discoverGscSites(accessToken: string): Promise<{
  properties: GscSiteEntry[];
  matchedProperty: string;
}> {
  const targetDomain = getDomainFromUrl(SITE_URL);
  try {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.warn(`GSC sites.list returned ${res.status}:`, await res.text());
      return {
        properties: [],
        matchedProperty: `sc-domain:${targetDomain}`,
      };
    }

    const data = await res.json();
    const siteEntries: GscSiteEntry[] = data.siteEntry || [];
    const matched = matchGscProperty(siteEntries, targetDomain);

    return {
      properties: siteEntries,
      matchedProperty: matched,
    };
  } catch (err) {
    console.error('Failed to discover GSC sites:', err);
    return {
      properties: [],
      matchedProperty: `sc-domain:${targetDomain}`,
    };
  }
}
