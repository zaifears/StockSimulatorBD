// lib/seo/botPatterns.ts
// Zero-dependency crawler detection definitions.
// Safe for Edge Runtime, Middleware, and Node.js environments.

export type BotCrawlerName =
  | 'Googlebot'
  | 'OAI-SearchBot'
  | 'Bingbot'
  | 'PerplexityBot'
  | 'ClaudeBot'
  | 'Bytespider'
  | 'Other';

export interface BotPatternDef {
  pattern: RegExp;
  name: BotCrawlerName;
}

export const BOT_PATTERNS: BotPatternDef[] = [
  { pattern: /Googlebot/i, name: 'Googlebot' },
  { pattern: /OAI-SearchBot/i, name: 'OAI-SearchBot' },
  { pattern: /ChatGPT-User/i, name: 'OAI-SearchBot' },
  { pattern: /GPTBot/i, name: 'OAI-SearchBot' },
  { pattern: /bingbot/i, name: 'Bingbot' },
  { pattern: /PerplexityBot/i, name: 'PerplexityBot' },
  { pattern: /ClaudeBot|Claude-Web|anthropic-ai/i, name: 'ClaudeBot' },
  { pattern: /Bytespider/i, name: 'Bytespider' },
];

/**
 * Standard list of bots tracked in the SEO Intelligence Dashboard
 */
export const STANDARD_BOTS: BotCrawlerName[] = [
  'Googlebot',
  'OAI-SearchBot',
  'Bingbot',
  'PerplexityBot',
  'ClaudeBot',
  'Bytespider',
];

/**
 * Identifies crawler bot name from user-agent string
 */
export function identifyCrawlerBot(userAgent: string | null | undefined): BotCrawlerName | null {
  if (!userAgent) return null;
  for (const { pattern, name } of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/**
 * Checks whether a requested path is allowed by robots.ts policy.
 * /trade, /api/, /admin/, /profile/, /coins/, /_next/, /auth/ are disallowed.
 */
export function isPathRobotsAllowed(path: string): boolean {
  if (!path) return true;
  const disallowedPrefixes = [
    '/trade',
    '/api/',
    '/admin/',
    '/profile/',
    '/coins/',
    '/_next/',
    '/auth/',
  ];
  return !disallowedPrefixes.some((prefix) => path.startsWith(prefix));
}
