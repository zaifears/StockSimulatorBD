import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://www.stocksimulator.tech';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/blog/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/'],
      },
      {
        // Explicitly welcome AI Search engines but keep them out of user data
        userAgent: ['GPTBot', 'PerplexityBot', 'Google-Extended', 'anthropic-ai', 'OAI-SearchBot'],
        allow: ['/', '/simulator', '/about-us', '/blog/'],
        disallow: ['/api/', '/admin/', '/profile/', '/coins/', '/_next/', '/auth/'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
