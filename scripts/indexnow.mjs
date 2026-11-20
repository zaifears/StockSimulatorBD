#!/usr/bin/env node
/**
 * Submit URLs to IndexNow (Bing, ChatGPT/Bing index, Yandex, Seznam, Naver).
 *
 * Usage:
 *   pnpm indexnow                          # Fetches live sitemap.xml and submits all URLs
 *   pnpm indexnow / /blog/my-post          # Submits specific paths or full URLs
 *   pnpm indexnow --dry-run                # Prints what would be submitted without POSTing
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.stocksimulator.tech').replace(/\/+$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'd05b525162794ca2b873dfa47648be57';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const urlArgs = args.filter((a) => !a.startsWith('--'));

function normalizeUrl(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }
  const path = input.startsWith('/') ? input : `/${input}`;
  return `${SITE_URL}${path}`;
}

async function fetchSitemapUrls() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${sitemapUrl}: HTTP ${res.status}`);
  }
  const xml = await res.text();
  const urls = [];
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

async function main() {
  const rawUrls = urlArgs.length > 0 ? urlArgs.map(normalizeUrl) : await fetchSitemapUrls();
  const prefix = `${SITE_URL}/`;
  const clean = [...new Set(rawUrls)].filter((u) => u === SITE_URL || u.startsWith(prefix));

  if (clean.length === 0) {
    console.error(`No valid URLs found under ${SITE_URL}`);
    process.exit(1);
  }

  const host = new URL(SITE_URL).host;

  if (dryRun) {
    console.log(`[dry-run] Host: ${host}`);
    console.log(`[dry-run] Key location: ${KEY_LOCATION}`);
    console.log(`[dry-run] Would submit ${clean.length} URL(s). First 10:`);
    for (const u of clean.slice(0, 10)) console.log(`  - ${u}`);
    return;
  }

  let submitted = 0;
  for (let i = 0; i < clean.length; i += MAX_URLS) {
    const batch = clean.slice(i, i + MAX_URLS);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: batch,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`IndexNow submission failed (HTTP ${res.status}): ${body || res.statusText}`);
      process.exit(1);
    }

    submitted += batch.length;
    console.log(`Submitted batch of ${batch.length} URL(s) -> HTTP ${res.status}`);
  }

  console.log(`Done! Submitted ${submitted} URL(s) to IndexNow (${host}).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
