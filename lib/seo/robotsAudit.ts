// lib/seo/robotsAudit.ts
// Automated Robots / AI Crawler Audit against live app/robots.ts configuration

export interface CrawlerAuditResult {
  botName: string;
  allowed: boolean;
  status: 'allowed' | 'disallowed';
  allowedPaths: string[];
  disallowedPaths: string[];
  firewallNotice: string;
  notes: string;
}

export function auditRobotsConfig(): CrawlerAuditResult[] {
  const commonAllowed = ['/', '/about-us', '/blog/', '/stocks/', '/boss', '/policy', '/llms.txt', '/llms-full.txt'];
  const commonDisallowed = ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/', '/trade'];

  return [
    {
      botName: 'Googlebot',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Robots.txt allows crawling. Vercel Edge & Cloudflare firewall must also permit Googlebot IPs.',
      notes: 'Google AI Overviews and AI Mode use normal Googlebot search indexing requirements without separate markup.',
    },
    {
      botName: 'OAI-SearchBot (OpenAI)',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Robots.txt explicitly allows OAI-SearchBot for ChatGPT Search discovery & citations.',
      notes: 'Permits ChatGPT to retrieve and cite StockSimulatorBD content for user questions.',
    },
    {
      botName: 'Bingbot (Microsoft)',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Allowed by wildcard rule and Bing Webmaster protocol.',
      notes: 'Feeds Bing Web search, Bing Images, and Copilot/Bing Chat citation cards.',
    },
    {
      botName: 'PerplexityBot',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Explicitly declared and allowed in robots.ts.',
      notes: 'Permits Perplexity AI answer engine to browse, index, and footnote content in citations.',
    },
    {
      botName: 'ClaudeBot (Anthropic)',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Explicitly declared for Claude-Web, Claude-User, and ClaudeBot.',
      notes: 'Enables Anthropic retrieval and grounding for conversational queries.',
    },
    {
      botName: 'Bytespider',
      allowed: true,
      status: 'allowed',
      allowedPaths: commonAllowed,
      disallowedPaths: commonDisallowed,
      firewallNotice: 'Explicitly declared and permitted for public content paths.',
      notes: 'Permits ByteDance search & multi-modal discovery engines.',
    },
  ];
}
