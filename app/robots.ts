import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/blog/', '/stocks/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/'],
      },
      {
        // Explicitly welcome AI Search engines to index educational & stock content
        userAgent: ['GPTBot', 'PerplexityBot', 'Google-Extended', 'anthropic-ai', 'OAI-SearchBot'],
        allow: ['/', '/simulator', '/about-us', '/blog/', '/stocks/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/', '/simulator/trade'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}