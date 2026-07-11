import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech';

  return {
    rules: [
      {
        userAgent: '*',
        // Allowed paths for human users
        allow: ['/', '/trade', '/about-us', '/blog/', '/stocks/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/'],
      },
      {
        // Restricted paths for AI bots to save crawl budget
        userAgent: ['GPTBot', 'PerplexityBot', 'Google-Extended', 'anthropic-ai', 'OAI-SearchBot'],
        allow: ['/', '/about-us', '/blog/', '/stocks/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/', '/trade'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}