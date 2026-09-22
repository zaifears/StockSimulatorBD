---
name: dse-modern-roadmap
description: Comprehensive architecture, feature roadmap, and execution playbook for the DSE modern platform integration, Oracle VPS offloading, Level 2 order book, company fundamentals, and Impeccable UI upgrades for StockSimulatorBD.
---

# DSE Modern Platform Architecture & Future Plan Playbook

This skill encodes the master architecture and phased delivery playbook for integrating the Dhaka Stock Exchange's modernized data infrastructure (`https://new.dsebd.org`) into **StockSimulatorBD**.

Whenever working on market sync, stock detail pages, the trading terminal, or external VPS tasks, activate and reference this skill to ensure consistency, zero database bloat, and peak frontend craft.

---

## 1. Discovered API Matrix & Data Sources

| Endpoint / Page | Data Extracted | Usage in StockSimulatorBD | Latency / Frequency |
| :--- | :--- | :--- | :--- |
| **`/api/live/prices`** | 634 instruments with LTP, YCP, OHLC, volume, value, trades count, percent, category (`A/B/N/Z`), board (`PUBLIC/DEBT/YIELDDBT`), sector, assetType. | Primary price sync (`api/market_sync.py`) & category sync (`api/category_sync.py`). *Filters out 215 Treasury Bonds.* | ~200ms, CloudFront cached (`s-maxage=15`) |
| **`/api/live/market`** | Live official indices (`DSEX`, `DS30`, `DSES`), market breadth (`advanced`, `declined`, `unchanged`, `traded`), market totals (turnover, volume, trades), top movers. | Live DSE Index Bar (`MarketStrip.tsx`), Market Sentiment Bar, Top Gainers/Losers widget. | ~200ms, JSON (7 KB) |
| **`/api/live/depth?code=[symbol]`** | **Level 2 Market Depth (Order Book)**: Real-time bids & asks with price, quantity, order count, and spread. | Live Order Book widget on the `/trade` terminal for authentic simulation. | Real-time on demand |
| **`/api/live/news`** | 500-item live feed of Price Sensitive Information (PSI), dividend declarations, AGM notices, and market turnover announcements. | Stock page news tab (`/stocks/[symbol]`) & **Boss Tier Portfolio News Radar**. | Real-time live feed |
| **`/api/live/companies/search?q=`** | Scrip code to official legal company name mapping and full-text search. | Global search bar autocomplete (allows searching "Grameenphone" -> `GP`). | Instant JSON (< 50ms) |
| **`/company/[symbol]` (RSC Flight)** | Audited P/E ratio, annual EPS, NAVPS / book value, market cap, dividend yield %, 52-week high/low, 10-year dividend history, 8-year financials, 30-day P/E trend, shareholding pattern (% Sponsor, % Institute, % Foreign, % Public). | Company Fundamentals Card on `/stocks/[symbol]`. | Static ISR (cached 24h on Vercel CDN) |

---

## 2. Infrastructure & Cost Optimization: Dual Firebase & Oracle VPS

### The $0 Architecture Rule
To stay strictly within free-tier quotas and maintain sub-50ms latency across the globe:

1. **Primary Firebase (Production)**:
   - Reserved strictly for user state: auth, balances, coin transactions, active portfolio holdings, and the live market snapshot (`market_info/latest`).
   - Company fundamentals are **never** queried by the client SDK per pageview.
2. **Next.js Edge ISR (`revalidate = 86400`)**:
   - Stock pages ([`app/stocks/[symbol]/page.tsx`](file:///a:/StockSimulatorBD/app/stocks/%5Bsymbol%5D/page.tsx)) render company fundamentals statically on the server.
   - Vercel caches the generated HTML at the edge CDN for 24 hours. **Result: 0 Firebase reads for organic visitors.**
3. **Oracle Always Free Tier VPS (Strategic Superpower)**:
   - **Specs**: Up to 4 ARM Ampere cores, 24 GB RAM, 200 GB storage, static public IP, 100% free forever.
   - **Task 1 (Overnight Fundamentals Crawler)**: Crawls all 400 company profiles at 3:00 AM BST via a Python systemd service without Vercel's 60s execution timeout ceiling.
   - **Task 2 (Static Cache Mirror)**: Serves `https://api-mirror.stocksimulator.tech/fundamentals.json` or order book proxy via Caddy/Nginx with Brotli compression and sub-30ms response times.
   - **Task 3 (High-Frequency Trading Poller)**: Polls `/api/live/market` and `/api/live/prices` every 10–15 seconds during trading hours (10:00 to 14:30 BST), eliminating Vercel Hobby cron limitations.

---

## 3. Prioritized Implementation Roadmap (Least-Impacted to Deepest)

Following `/using-agent-skills` principles (*build in thin vertical slices, prefer simple obvious solutions, maximize ROI*):

### Slice 1: Live Company Name Search & Lookup (Fastest, High UX ROI)
- **Goal**: Enable users to search by full company name (e.g. typing "Square" finds `SQURPHARMA` and `SQUARETEXT`, typing "Grameenphone" finds `GP`).
- **Files**: `components/market/MarketSearchBar.tsx` or `components/shared/Navbar.tsx`, consuming `/api/live/companies/search?q=`.
- **Impact**: Zero database impact; instant usability improvement.

### Slice 2: Live DSE Index Bar & Market Breadth Gauge (`MarketStrip.tsx`)
- **Goal**: Replace static DSEX placeholders with live official exchange data:
  - `DSEX 5,540.32 ▼ -10.18 (-0.18%)`
  - `DS30 2,106.18 ▲ +0.26 (+0.01%)`
  - `DSES 1,108.57 ▲ +1.57 (+0.14%)`
  - Market Breadth multi-tone ratio bar: `🟢 114 Advancing · 🟡 60 Unchanged · 🔴 211 Declining`.
- **Files**: `components/app/MarketStrip.tsx`, `components/market/MarketBreadthBar.tsx`.
- **Impact**: Transforms the entire app shell into a real financial terminal.

### Slice 3: Company Fundamentals & Key Ratios Card (`/stocks/[symbol]`)
- **Goal**: Deliver deep fundamental analysis for every stock:
  - **Valuation Grid**: Audited P/E, Annual EPS, NAVPS, Dividend Yield %, Market Cap.
  - **52-Week Slider**: High/Low spectrum bar with glowing pinpoint at current price.
  - **Shareholding Breakdown**: Segmented bar (% Sponsor, % Institute, % Foreign, % Public).
  - **Dividend History**: Last 5 years cash and stock bonuses.
- **Files**: `components/stocks/CompanyFundamentalsCard.tsx`, `app/stocks/[symbol]/page.tsx`.
- **Impact**: Massive educational value for new investors transitioning from FDR/Sanchayapatra.

### Slice 4: Stock News & Boss Tier Portfolio News Radar
- **Goal**:
  - Public stock page: dedicated "Corporate News & Disclosures" tab showing official PSI announcements from `/api/live/news` for that ticker.
  - **Boss Tier Exclusive**: Personalized "Portfolio News Radar" on `/portfolio` scanning all stocks in the user's active holdings and alerting them to recent PSI, dividend declarations, or AGM dates!
- **Files**: `components/stocks/StockNewsSection.tsx`, `components/portfolio/PortfolioNewsRadar.tsx`.
- **Impact**: Strongest organic conversion hook for Boss Tier subscriptions (৳20/mo, ৳99/6mo).

### Slice 5: Redesigned Trading Terminal (`/trade`) with Level 2 Order Book
- **Goal**: Transform the trade page from a plain price list into an institutional-grade trading terminal:
  - Top: Market Breadth Gauge, DSEX index trajectory, and Top Movers ticker.
  - Center: Live Candlestick chart and active order execution panel.
  - Right/Bottom: **Level 2 Market Depth (Order Book)** displaying real-time live bids and asks with depth volume bars and spread calculator.
- **Files**: `app/trade/page.tsx`, `components/simulator/trade/MarketDepthWidget.tsx`.
- **Impact**: The ultimate paper-trading simulator in Bangladesh with authentic bid/ask dynamics.

---

## 4. Impeccable UI Craft Standards

Whenever authoring frontend components under this roadmap:
1. **Monospace Tabular Numerals**: Always apply `font-mono tabular-nums` (`tnum`) to all prices, percentages, indices, and share counts to prevent layout jitter during live updates.
2. **Subtle Color Palettes**:
   - Up / Gains: Emerald-600 (`text-emerald-600 dark:text-emerald-400 bg-emerald-500/10`)
   - Down / Losses: Rose-600 (`text-rose-600 dark:text-rose-400 bg-rose-500/10`)
   - Neutral / Unchanged: Amber-600 / Slate-500 (`text-amber-600 dark:text-amber-400 bg-amber-500/10`)
3. **No DevTools CSS-Blur Leaks**: Pro/Boss gated sections (like Portfolio News Radar) must be stripped from the React tree on the server for Bro tier accounts, exactly as defined in `AGENTS.md`.
4. **Responsive Integrity**: Test desktop (`1440px`), tablet (`768px`), and mobile (`375px`) viewports simultaneously. Collapsible trays and bottom sheets for mobile order books.
