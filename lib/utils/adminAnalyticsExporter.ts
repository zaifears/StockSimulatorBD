// lib/utils/adminAnalyticsExporter.ts
// Formats complete Admin & Site Analytics into structured Markdown and JSON reports
// designed specifically for consumption by LLMs (ChatGPT, Claude, Gemini) to analyze
// platform growth, trading engagement, user retention, and monetization bottlenecks.

import { SiteAnalyticsData } from '@/components/admin/SiteAnalyticsSection';

export interface AdminStatsContext {
  totalUsers?: number;
  pendingRequests?: number;
  approvedRequests?: number;
  rejectedRequests?: number;
  totalRequests?: number;
  surveyResponses?: number;
  pendingBossRequests?: number;
  activeBossUsers?: number;
}

/**
 * Generates an LLM-optimized Markdown report from live Site & Trading Analytics.
 */
export function generateAdminAnalyticsMarkdown(
  data: SiteAnalyticsData,
  stats?: AdminStatsContext
): string {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const visitors = data.visitors || { today: 0, last7Days: 0, last30Days: 0 };
  const regs = data.registrations || {
    today: 0,
    last7Days: 0,
    last30Days: 0,
    totalAllTime: 0,
    totalUserDocs: 0,
    source: 'firestore-user-docs',
    sourceWarning: null,
  };
  const trading = data.trading;
  const revenue = data.revenue;
  const retention = data.retention;
  const devices = data.deviceBreakdown || { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  const traffic = data.trafficSources || {
    direct: 0,
    internal: 0,
    search_google: 0,
    search_other: 0,
    social: 0,
    other: 0,
  };

  const totalTraffic = Object.values(traffic).reduce((a, b) => a + b, 0) || 1;
  const totalDevices = (devices.mobile || 0) + (devices.desktop || 0) + (devices.tablet || 0) || 1;

  const lines: string[] = [];

  // Title & Header
  lines.push('# StockSimulatorBD — Platform & Trading Analytics Report');
  lines.push(`**Generated:** ${dateStr} (${timestamp})`);
  lines.push(`**Active Users Right Now:** ${data.activeRightNow ?? 0}`);
  lines.push('');

  // 1. Executive Context
  lines.push('## 1. Platform Context & Model');
  lines.push('- **Product:** StockSimulatorBD ([stocksimulator.tech](https://www.stocksimulator.tech)) — Risk-free paper-trading simulator for the Dhaka Stock Exchange (DSE).');
  lines.push('- **Target Audience:** Bangladeshi students, youth, and first-time retail investors moving from Sanchayapatra/fixed deposits into DSE equities.');
  lines.push('- **Monetization & Tiers:**');
  lines.push('  - **Bro Tier (Free):** 100% free DSE trading, live board, basic candlestick charts.');
  lines.push('  - **Boss Tier (Pro):** ৳20/month or ৳99/6-months; grants Portfolio Risk Radar (21 LankaBangla sectors), 40% concentration alerts, lifetime commission tracking, and +10% bonus coins.');
  lines.push('  - **Virtual Currency Recharge:** bKash recharge at 20 BDT = 10,000 coins (500 coins/taka).');
  lines.push('');

  // 2. High-Level KPIs
  lines.push('## 2. Executive KPI Summary');
  lines.push('| Metric | Today | Last 7 Days | Last 30 Days | Total All-Time |');
  lines.push('|---|---|---|---|---|');
  lines.push(`| **Unique Visitors** | ${visitors.today.toLocaleString()} | ${visitors.last7Days.toLocaleString()} | ${visitors.last30Days.toLocaleString()} | - |`);
  lines.push(`| **New Registrations** | ${regs.today.toLocaleString()} | ${regs.last7Days.toLocaleString()} | ${regs.last30Days.toLocaleString()} | ${regs.totalAllTime.toLocaleString()} |`);
  lines.push(`| **Trades Executed** | ${trading?.trades?.today?.toLocaleString() ?? 0} | ${trading?.trades?.last7Days?.toLocaleString() ?? 0} | ${trading?.trades?.last30Days?.toLocaleString() ?? 0} | - |`);
  lines.push(`| **Active Traders** | ${trading?.activeTraders?.today?.toLocaleString() ?? 0} | ${trading?.activeTraders?.last7Days?.toLocaleString() ?? 0} | ${trading?.activeTraders?.last30Days?.toLocaleString() ?? 0} | - |`);
  lines.push(`| **Approved Recharges** | - | - | ৳${revenue?.approvedLast30Days?.bdt?.toLocaleString() ?? 0} (${revenue?.approvedLast30Days?.count ?? 0} tx) | ৳${revenue?.approvedAllTime?.bdt?.toLocaleString() ?? 0} (${revenue?.approvedAllTime?.count ?? 0} tx) |`);
  if (stats?.activeBossUsers !== undefined) {
    lines.push(`| **Active Boss Tier** | - | - | - | ${stats.activeBossUsers} users (Pending: ${stats.pendingBossRequests ?? 0}) |`);
  }
  lines.push('');

  // 3. User Engagement & Retention
  lines.push('## 3. User Engagement & Cohort Retention');
  lines.push(`- **Average Session Duration Today:** ${Math.round(data.avgSessionSeconds?.today ?? 0)} seconds (~${((data.avgSessionSeconds?.today ?? 0) / 60).toFixed(1)} mins)`);
  lines.push(`- **Average Session Duration (7d Avg):** ${Math.round(data.avgSessionSeconds?.last7Days ?? 0)} seconds (~${((data.avgSessionSeconds?.last7Days ?? 0) / 60).toFixed(1)} mins)`);
  lines.push(`- **Bounce Rate:** ${((data.bounceRate ?? 0) * 100).toFixed(1)}%`);
  lines.push(`- **New vs. Returning Ratio:** ${data.newVsReturning?.new ?? 0} new vs ${data.newVsReturning?.returning ?? 0} returning`);
  if (retention) {
    lines.push('- **Cohort Retention:**');
    lines.push(`  - **Day 1 Retention:** ${((retention.d1?.rate ?? 0) * 100).toFixed(1)}% (${retention.d1?.retained ?? 0} of ${retention.d1?.eligible ?? 0} eligible)`);
    lines.push(`  - **Day 7 Retention:** ${((retention.d7?.rate ?? 0) * 100).toFixed(1)}% (${retention.d7?.retained ?? 0} of ${retention.d7?.eligible ?? 0} eligible)`);
    lines.push(`  - **Day 30 Retention:** ${((retention.d30?.rate ?? 0) * 100).toFixed(1)}% (${retention.d30?.retained ?? 0} of ${retention.d30?.eligible ?? 0} eligible)`);
  }
  lines.push('');

  // 4. Acquisition & Technology
  lines.push('## 4. Traffic Sources & Device Distribution');
  lines.push('### Traffic Channels:');
  lines.push(`- **Google Search (Organic):** ${traffic.search_google ?? 0} (${(((traffic.search_google ?? 0) / totalTraffic) * 100).toFixed(1)}%)`);
  lines.push(`- **Direct Traffic:** ${traffic.direct ?? 0} (${(((traffic.direct ?? 0) / totalTraffic) * 100).toFixed(1)}%)`);
  lines.push(`- **Social Media:** ${traffic.social ?? 0} (${(((traffic.social ?? 0) / totalTraffic) * 100).toFixed(1)}%)`);
  lines.push(`- **Other Search Engines:** ${traffic.search_other ?? 0} (${(((traffic.search_other ?? 0) / totalTraffic) * 100).toFixed(1)}%)`);
  lines.push(`- **Internal/Other:** ${(traffic.internal ?? 0) + (traffic.other ?? 0)}`);
  lines.push('');
  lines.push('### Device Split:');
  lines.push(`- **Mobile:** ${devices.mobile ?? 0} (${(((devices.mobile ?? 0) / totalDevices) * 100).toFixed(1)}%)`);
  lines.push(`- **Desktop:** ${devices.desktop ?? 0} (${(((devices.desktop ?? 0) / totalDevices) * 100).toFixed(1)}%)`);
  lines.push(`- **Tablet:** ${devices.tablet ?? 0} (${(((devices.tablet ?? 0) / totalDevices) * 100).toFixed(1)}%)`);
  lines.push('');

  // 5. Trading Activity & Popular Stocks
  if (trading) {
    lines.push('## 5. DSE Trading Behavior & Market Velocity');
    const totalOrders = (trading.buyVsSell?.buys ?? 0) + (trading.buyVsSell?.sells ?? 0) || 1;
    const buyPct = (((trading.buyVsSell?.buys ?? 0) / totalOrders) * 100).toFixed(1);
    const sellPct = (((trading.buyVsSell?.sells ?? 0) / totalOrders) * 100).toFixed(1);
    lines.push(`- **Order Direction:** ${trading.buyVsSell?.buys ?? 0} Buys (${buyPct}%) vs ${trading.buyVsSell?.sells ?? 0} Sells (${sellPct}%)`);
    lines.push('- **Top Most Traded Stocks:**');
    if (trading.mostTradedStocks && trading.mostTradedStocks.length > 0) {
      trading.mostTradedStocks.slice(0, 8).forEach((s, idx) => {
        lines.push(`  ${idx + 1}. **${s.symbol}**: ${s.count} trades`);
      });
    } else {
      lines.push('  - No traded stocks recorded in this window.');
    }
    if (data.tradingError) {
      lines.push(`- ⚠️ **Trading Log Alert:** ${data.tradingError}`);
    }
    lines.push('');
  }

  // 6. Top Content & Pages
  lines.push('## 6. Top Visited Surfaces');
  if (data.topLandingPages && data.topLandingPages.length > 0) {
    lines.push('### Top Landing Pages:');
    data.topLandingPages.slice(0, 5).forEach((p) => {
      lines.push(`- \`${p.path}\`: ${p.views.toLocaleString()} views`);
    });
  }
  if (data.topStockPages && data.topStockPages.length > 0) {
    lines.push('### Top Stock Quote Pages:');
    data.topStockPages.slice(0, 5).forEach((p) => {
      lines.push(`- \`${p.path}\`: ${p.views.toLocaleString()} views`);
    });
  }
  if (data.topBlogPosts && data.topBlogPosts.length > 0) {
    lines.push('### Top Educational Blog Articles:');
    data.topBlogPosts.slice(0, 5).forEach((p) => {
      lines.push(`- \`${p.path}\`: ${p.views.toLocaleString()} views`);
    });
  }
  lines.push('');

  // 7. Monetization & Currency Economy
  if (revenue) {
    lines.push('## 7. Revenue & Coin Economy');
    lines.push(`- **All-Time Recharge Volume:** ৳${revenue.approvedAllTime?.bdt?.toLocaleString() ?? 0} (${revenue.approvedAllTime?.count ?? 0} transactions, ${revenue.approvedAllTime?.coins?.toLocaleString() ?? 0} virtual coins issued)`);
    lines.push(`- **Last 30 Days Recharge Volume:** ৳${revenue.approvedLast30Days?.bdt?.toLocaleString() ?? 0} (${revenue.approvedLast30Days?.count ?? 0} transactions)`);
    lines.push(`- **Average Recharge Ticket:** ৳${revenue.avgApprovedRechargeBdt?.toFixed(0) ?? 0}`);
    lines.push(`- **Recharger Conversion Rate:** ${(revenue.conversionRatePercent ?? 0).toFixed(2)}% of total registered users (${revenue.rechargerCount ?? 0} paying rechargers)`);
    lines.push(`- **Pending Recharge Queue:** ${revenue.pending?.count ?? 0} requests awaiting verification (৳${revenue.pending?.bdt?.toLocaleString() ?? 0})`);
    lines.push(`- **Total Coins In Circulation:** ${data.totalCoinsInCirculation?.toLocaleString() ?? 'Auditing...'}`);
    lines.push('');
  }

  // 8. Account & System Integrity
  if (data.accountIntegrity && !('error' in data.accountIntegrity)) {
    const ai = data.accountIntegrity;
    lines.push('## 8. Account Integrity & Health Check');
    lines.push(`- **Firebase Auth Accounts:** ${ai.authAccountCount.toLocaleString()}`);
    lines.push(`- **Firestore User Documents:** ${ai.userDocCount.toLocaleString()}`);
    lines.push(`- **Orphaned User Docs:** ${ai.orphanedDocCount} (Firestore documents without Firebase Auth identity)`);
    lines.push(`- **Missing User Docs:** ${ai.missingDocCount} (Firebase Auth users without Firestore user documents)`);
    lines.push(`- **Duplicate Email Accounts:** ${ai.duplicateEmailCount}`);
    lines.push('');
  }

  // 9. Prompt for the LLM
  lines.push('---');
  lines.push('## [INSTRUCTIONS FOR LLM STRATEGIC ADVISOR]');
  lines.push('You are acting as a Principal Product Growth & Monetization Strategist for StockSimulatorBD.');
  lines.push('Review the empirical metrics above and provide an actionable strategy across these 4 areas:');
  lines.push('1. **User Activation & First Trade:** Identify drop-offs between unique visitors, registrations, and active traders. What onboarding micro-copy or prompt can boost initial trade execution?');
  lines.push('2. **Cohort Retention Leaks:** Analyze the D1, D7, and D30 retention curve and session duration. Recommend 2 specific engagement loops (e.g., daily market-open notifications, P&L alerts, leaderboard).');
  lines.push('3. **Boss Tier & Recharge Monetization:** With ৳20/mo pricing and bKash coin recharges, how can we improve conversion rate without alienating the free student user base?');
  lines.push('4. **Top 3 High-Impact Initiatives:** Give the solo developer (`zaifears`) 3 prioritized, concrete tasks to execute this week to drive maximum retention and trader satisfaction.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates a clean, typed JSON string of the complete analytics snapshot for direct API or LLM tool input.
 */
export function generateAdminAnalyticsJson(
  data: SiteAnalyticsData,
  stats?: AdminStatsContext
): string {
  const exportPayload = {
    $schema: 'https://stocksimulator.tech/schemas/admin-analytics-v1.json',
    metadata: {
      platform: 'StockSimulatorBD',
      url: 'https://www.stocksimulator.tech',
      market: 'Dhaka Stock Exchange (DSE)',
      exportedAt: new Date().toISOString(),
      activeUsersRightNow: data.activeRightNow ?? 0,
      environment: process.env.NODE_ENV || 'production',
    },
    overviewStats: stats || null,
    visitors: data.visitors,
    registrations: data.registrations,
    engagement: {
      avgSessionSeconds: data.avgSessionSeconds,
      bounceRate: data.bounceRate,
      newVsReturning: data.newVsReturning,
      retentionCohorts: data.retention,
      peakHours: data.peakHours,
    },
    trafficDistribution: {
      sources: data.trafficSources,
      devices: data.deviceBreakdown,
      geoRegions: data.geoBreakdown,
    },
    dseTrading: data.trading,
    contentDiscovery: {
      topLandingPages: data.topLandingPages,
      topStockPages: data.topStockPages,
      topBlogPosts: data.topBlogPosts,
    },
    monetizationAndCoins: {
      revenue: data.revenue,
      totalCoinsInCirculation: data.totalCoinsInCirculation,
      balanceIntegrityWatchlist: data.balanceIntegrity?.watchlist,
      topCoinHolders: data.topCoinHolders?.slice(0, 10),
    },
    systemIntegrity: {
      accountIntegrity: data.accountIntegrity,
      sessionRetention: data.sessionRetention,
    },
    growthFunnel: data.growthFunnel,
    mostActiveUsersSample: data.mostActiveUsers?.slice(0, 10),
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Downloads a string payload as a browser file.
 */
export function downloadAnalyticsFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
