import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;

  // Every crawler - search engines, AI answer engines, and everything else -
  // gets the exact same full access to content pages. No bot is singled out
  // for a reduced crawl budget, so ChatGPT/Claude/Perplexity etc. can see and
  // cite the site's content just as fully as Google can. /trade stays
  // disallowed for everyone (including AI bots) - it's a live, per-request
  // dynamic page, and repeated crawler hits on it churn ISR writes/revalidations
  // for zero SEO benefit. /api/, /admin/, /profile/, /auth/ etc. stay
  // disallowed too since they're non-content or login-gated.
  const allow = ['/', '/about-us', '/blog/', '/stocks/', '/boss', '/policy', '/llms.txt', '/llms-full.txt'];
  const disallow = ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/', '/trade'];

  return {
    rules: [
      {
        userAgent: '*',
        allow,
        disallow,
      },
      {
        // Explicitly named so it's unambiguous these are welcome, not just
        // caught by the wildcard - OpenAI, Anthropic, Perplexity, Google AI
        // training, and the common-crawl-derived corpora several other LLMs
        // train/ground on.
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'ClaudeBot',
          'Claude-Web',
          'Claude-User',
          'anthropic-ai',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
          'CCBot',
          'Bytespider',
          'Amazonbot',
          'meta-externalagent',
        ],
        allow,
        disallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}