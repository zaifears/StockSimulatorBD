/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.stocksimulator.tech',
  generateRobotsTxt: true,
  autoLastmod: true,
  outDir: './public',
  
  // Keep this empty. Dynamic routes (/stocks/[stock]) are handled by your server-sitemap.xml
  additionalPaths: async (config) => {
    return []
  },

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
      },
      {
        userAgent: 'CCBot',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'],
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
    const allowedPaths = ['/', '/trade', '/stocks', '/about-us', '/blog', '/profile', '/coins'];
    
    if (!allowedPaths.includes(path)) {
      return null;
    }

    const priorities = {
      '/': 1.0,
      '/trade': 0.95,
      '/stocks': 0.9,
      '/about-us': 0.9,
      '/blog': 0.9,
      '/coins': 0.7,
      '/profile': 0.5,
    };

    const changefreqs = {
      '/': 'weekly',
      '/trade': 'monthly',
      '/stocks': 'weekly', 
      '/about-us': 'monthly',
      '/blog': 'monthly',
      '/coins': 'monthly',
      '/profile': 'monthly',
    };

    return {
      loc: path,
      changefreq: changefreqs[path] || 'monthly',
      priority: priorities[path] || 0.5,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
}