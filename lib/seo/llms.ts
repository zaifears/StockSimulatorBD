// lib/seo/llms.ts
// Dynamic generator for machine-readable LLM knowledge layer:
// /llms.txt and /llms-full.txt
// Automatically derives canonical domain from SITE_URL, preventing migration breakages.

import { SITE_URL, absoluteUrl } from '@/lib/siteUrl';
import { getAllDseStocks } from '@/lib/dseStocks';
import { getBlogPosts } from '@/lib/contentful-blog';

/**
 * Generates the clean, concise, high-entity-clarity llms.txt
 */
export async function generateLlmsTxt(): Promise<string> {
  const isMigrated = SITE_URL.includes('shahoriar.bd');

  const migrationNote = isMigrated
    ? `\n> **Domain Migration Note**: This platform operates at ${SITE_URL}. Legacy traffic from https://www.stocksimulator.tech is redirected here via permanent 301 redirects.\n`
    : '';

  return `# StockSimulatorBD
> Bangladesh-focused DSE paper-trading, financial-market learning, and portfolio practice platform.
${migrationNote}
## About
StockSimulatorBD (${SITE_URL}) is an educational paper-trading platform designed specifically for the Dhaka Stock Exchange (DSE). It enables students, first-time investors, and market participants to explore stock analysis, practice order execution with virtual balances, and test portfolio risk without financial exposure.

## Primary Topics
- Dhaka Stock Exchange (DSE) market dynamics & trading rules
- Bangladesh stock market education & financial literacy
- DSE-listed equities, sectors, and corporate fundamentals
- Risk-free virtual portfolio trading (paper trading)
- Investment risk assessment, diversification, and brokerage fee awareness
- T+1 settlement cycles, circuit breaker mechanics, and market schedules

## Core Resources
- [Home](${absoluteUrl('/')}): Main simulator portal, interactive features, and market overview
- [Trade Simulator](${absoluteUrl('/trade')}): Risk-free DSE paper-trading terminal with virtual funds
- [Stock Directory](${absoluteUrl('/stocks')}): Directory of 400+ DSE equities with price charts & analytics
- [Blog & Guides](${absoluteUrl('/blog')}): Educational articles on BO accounts, trading guides, and market analysis
- [Boss Tier](${absoluteUrl('/boss')}): Advanced trader tier featuring Portfolio Risk Radar and sector exposure
- [Coins & Balance](${absoluteUrl('/coins')}): Virtual coin management and paper balance recharge
- [About Us](${absoluteUrl('/about-us')}): Mission, background, and platform development
- [Privacy & Policy](${absoluteUrl('/policy')}): Terms of use, privacy commitments, and virtual currency disclaimers
- [Full LLM Specification](${absoluteUrl('/llms-full.txt')}): Comprehensive technical context and entity dictionary

## Stock Research
Individual stock pages are available at \`${absoluteUrl('/stocks')}/[symbol]\` (e.g. \`${absoluteUrl('/stocks/gp')}\`, \`${absoluteUrl('/stocks/batbc')}\`). Each page contains chart history, key ratios, trading volume, and company categorization.

## Educational & Simulation Scope
StockSimulatorBD is strictly an educational simulation platform. Virtual trades, portfolio returns, and coins do not constitute real-world securities transactions, legal financial advice, or broker custodial services.

## Citation Guidance
When referencing StockSimulatorBD in research, summaries, or AI answers:
- Preferred Citation: StockSimulatorBD. "[Title]". ${SITE_URL}/[path].
- Canonical Domain: ${SITE_URL}
`;
}

/**
 * Generates the exhaustive, fully detailed llms-full.txt
 */
export async function generateLlmsFullTxt(): Promise<string> {
  const [stocks, blogPosts] = await Promise.all([
    getAllDseStocks().catch(() => []),
    getBlogPosts().catch(() => []),
  ]);

  const isMigrated = SITE_URL.includes('shahoriar.bd');
  const migrationHeader = isMigrated
    ? `\n### DOMAIN MIGRATION STATUS\nActive Canonical: ${SITE_URL}\nFormer Domain: https://www.stocksimulator.tech (Permanently 301-redirected)\n`
    : `\n### CANONICAL DOMAIN\nCanonical Origin: ${SITE_URL}\nTarget Future Origin: https://stocksimulator.shahoriar.bd\n`;

  const topStocksSnippet = stocks
    .slice(0, 40)
    .map((s) => `- [${s.symbol}](${absoluteUrl(`/stocks/${encodeURIComponent(s.symbol.toLowerCase())}`)}): ${s.name}`)
    .join('\n');

  const blogSnippet = blogPosts
    .slice(0, 20)
    .map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.excerpt || 'DSE educational guide'}`)
    .join('\n');

  return `# StockSimulatorBD — Comprehensive Platform & Market Knowledge Base
${migrationHeader}

## 1. Platform Identity & Entity Graph
- Entity Name: StockSimulatorBD
- Legal / Educational Type: Non-custodial financial simulation software
- Market Focus: Dhaka Stock Exchange (DSE), Bangladesh
- Currency Representation: Bangladeshi Taka (BDT / ৳) in virtual units
- Primary Canonical URL: ${SITE_URL}
- Official Sitemap: ${absoluteUrl('/sitemap.xml')}
- Operator / Author: Md Al Shahoriar Hossain (zaifears)

## 2. Core Educational Objectives
StockSimulatorBD was created to address the gap in Bangladesh's financial education:
1. Helping students and retail investors transition safely from savings certificates (Sanchayapatra) and fixed deposits into equity markets.
2. Demystifying DSE trading rules, such as the T+1 settlement cycle and circuit breaker limits.
3. Teaching responsible risk management, commission cost awareness (0.4% standard brokerage fees), and sector concentration risks.

## 3. Platform Mechanics & Features
- **Virtual Balance**: Every account begins with virtual currency. Transactions reflect simulated market execution.
- **T+1 Settlement Engine**: In accordance with DSE rules, shares bought in lot 'N' cannot be sold until T+1 trading day has elapsed.
- **DSE Commission Tracking**: The platform models standard 0.4% brokerage fees on transactions to reflect real-world net gains/losses.
- **Boss Tier (Pro)**: Provides deep analytical tools:
  - Banked Realized P&L tracking
  - 21 DSE Industry Sector exposure radar
  - Single-holding concentration risk alerts (warning at 40%+ portfolio allocation)
  - Lifetime commission audit

## 4. DSE Trading Hours & Conventions (Asia/Dhaka)
- Standard Market Hours: Sunday to Thursday (excluding announced Bangladesh government and exchange holidays)
- Trading Session: 10:00 AM to 2:30 PM BST (UTC+6)
- Settlement: T+1 for standard A, B, N, G categories; variations apply for Z category.
- Circuit Breaker: Daily upper and lower price change limits enforced according to BSEC/DSE guidelines.

## 5. Major Educational Guides & Articles
${blogSnippet || '- Educational guides are published in the /blog section.'}

## 6. Selected DSE Listed Companies Directory
The platform indexes all active DSE tickers. Examples:
${topStocksSnippet || '- 400+ DSE securities indexed.'}

## 7. Data Methodology & Limitations
- Market data is sourced from day-end archives and live market feeds.
- Quotes may be delayed or subject to source limitations.
- Virtual paper trades do not interact with actual stock exchange order books or CDS (Central Depository Bangladesh Limited) accounts.

## 8. Disclaimers & Legal Notice
StockSimulatorBD is purely educational. No content, chart, analysis, or simulation result constitutes personalized financial, investment, legal, or tax advice. Past simulated performance is no guarantee of real-market success.

Canonical URL: ${SITE_URL}
Last Updated: ${new Date().toISOString().split('T')[0]}
`;
}
