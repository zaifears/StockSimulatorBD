/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.stocksimulator.tech',
  generateRobotsTxt: true,
  autoLastmod: true,
  outDir: './public',
  
  // Include main pages and feature pages
  additionalPaths: async (config) => {
    return [
      {
        loc: '/simulator/trade',
        changefreq: 'weekly',
        priority: 0.95,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/go',
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/about-us',
        changefreq: 'monthly',
        priority: 0.6,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/profile',
        changefreq: 'weekly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/coins',
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      },
    ]
  },

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
      },
      {
        userAgent: 'CCBot',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'],
      },
    ],
    additionalSitemaps: [
      'https://www.stocksimulator.tech/server-sitemap.xml',
    ],
  },
  
  exclude: [
    '/api/*',
    '/api/**/*',
    '/_*',
    '/_*/*',
  ],

  transform: async (config, path) => {
    // Allow these pages in the sitemap
    const allowedPaths = ['/', '/simulator', '/simulator/trade', '/go', '/about-us', '/profile', '/coins'];
    
    if (!allowedPaths.includes(path)) {
      return null; // Exclude this path from sitemap
    }

    // Custom transform for allowed pages only
    const priorities = {
      '/': 1.0,
      '/simulator': 0.95,
      '/simulator/trade': 0.95,
      '/go': 0.7,
      '/about-us': 0.6,
      '/profile': 0.5,
      '/coins': 0.5,
    };

    const changefreqs = {
      '/': 'daily',
      '/simulator': 'weekly',
      '/simulator/trade': 'weekly',
      '/go': 'weekly',
      '/about-us': 'monthly',
      '/profile': 'weekly',
      '/coins': 'weekly',
    };

    return {
      loc: path,
      changefreq: changefreqs[path] || 'weekly',
      priority: priorities[path] || 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
}