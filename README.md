<div align="center">

  <img src="public/favicon.svg" alt="StockSimulatorBD Logo" width="140" />

  <h1>StockSimulatorBD</h1>

  <h3>A Risk-Free Trading Simulator for the Dhaka Stock Exchange</h3>

  <br/>

  <a href="https://www.stocksimulator.tech/trade"><img src="https://img.shields.io/badge/🚀_Live_Demo-stocksimulatorbd-8b5cf6?style=for-the-badge" alt="Live Demo"/></a>
  <a href="https://github.com/zaifears/StockSimulatorBD/releases/latest/download/StockSimulatorBD.apk"><img src="https://img.shields.io/badge/📱_Download-APK-34D399?style=for-the-badge" alt="Download APK"/></a>

  <br/><br/>

  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/PWA-Ready-FF6F00?style=flat-square&logo=pwa&logoColor=white" alt="PWA"/>
  <img src="https://img.shields.io/github/license/zaifears/StockSimulatorBD?style=flat-square&color=green" alt="License"/>

  <br/><br/>

  <em>Practice DSE trading risk-free — for students and for new investors moving towards the stock market.</em>

</div>

<br/>

---

<br/>

StockSimulatorBD is a **risk-free paper-trading simulator** for the Dhaka Stock Exchange (DSE). It mirrors real market conditions — live prices, T+1 settlement, broker commission, market hours — using a virtual, non-monetary trading balance, so students and first-time investors (including people moving from safer instruments like Sanchayapatra or fixed deposits) can build confidence before risking real capital.

<br/>

## 📱 Download the App

> The web app is a full PWA. A TWA-wrapped Android APK is also published as a [GitHub Release](https://github.com/zaifears/StockSimulatorBD/releases) for a native-feeling install — search this repo's Releases page, or use the badge below, to get it.

<div align="center">
  <br/>
  <a href="https://github.com/zaifears/StockSimulatorBD/releases/latest/download/StockSimulatorBD.apk">
    <img src="https://img.shields.io/badge/📥_Download_StockSimulatorBD-APK-8b5cf6?style=for-the-badge&logoColor=white" alt="Download APK" />
  </a>
  <br/><br/>
</div>

| | |
|---|---|
| **Requirements** | Android 8.0+ |
| **Package** | `tech.stocksimulator.zaifears` |
| **Notes** | Not built by this repo's own build pipeline — packaged via [PWABuilder](https://www.pwabuilder.com/) as a Trusted Web Activity and distributed through this repo's [Releases](https://github.com/zaifears/StockSimulatorBD/releases). The badge link above always resolves to the newest release. |

<br/>

---

<br/>

## 📈 Main Features

### Stock Trading Simulator

<table>
  <tr>
    <td width="60"><strong>🚀</strong></td>
    <td><strong>Live DSE Prices</strong></td>
    <td>Market data is scraped from the DSE archive (<code>api/dse_chart.py</code>, <code>api/market_sync.py</code>) and cached in Firestore, including candlestick charts on each stock's page.</td>
  </tr>
  <tr>
    <td><strong>🔒</strong></td>
    <td><strong>Server-Side, Tamper-Proof Trades</strong></td>
    <td>Every BUY/SELL runs in an authoritative Firestore Admin SDK transaction (<code>app/api/simulator/trade</code>) — price, commission, and the T+1 rule are all re-derived and enforced server-side, not trusted from the client.</td>
  </tr>
  <tr>
    <td><strong>📅</strong></td>
    <td><strong>Market Calendar</strong></td>
    <td>Bangladesh public holidays and DSE trading hours (10:00–14:15, Fri/Sat weekend) are enforced on both client and server.</td>
  </tr>
  <tr>
    <td><strong>💰</strong></td>
    <td><strong>Virtual Currency via bKash</strong></td>
    <td>Recharge your simulator balance through an admin-reviewed bKash flow. Coins have no real-world monetary value — they're for practice only.</td>
  </tr>
  <tr>
    <td><strong>💾</strong></td>
    <td><strong>Offline-Capable PWA</strong></td>
    <td>A custom service worker keeps the app usable with poor connectivity; installable on desktop and Android.</td>
  </tr>
</table>

### 👑 Account Tiers: Bro vs. Boss

| Tier | Price | Who it's for | Key Capabilities |
|---|---|---|---|
| **Bro Tier** | **Free forever** | Beginners, students, cautious learners | 10,000 welcome coins, live DSE prices, candlestick charts, real-time portfolio holdings, and basic order history. |
| **Boss Tier** | **৳20 / Month** (31 days)<br/>**৳99 / 6 Months** (185 days) | Active learners & disciplined paper traders | **Portfolio Insights & Risk Radar** (banked realized P&L, 21-sector DSE exposure, concentration risk alerts, 0.4% commission tracking), **+10% free coins bonus** on every recharge, and gold profile recognition. |

> **Security & Privacy by Design**: Portfolio Insights are strictly isolated in memory and the DOM for Boss users only. Non-Boss accounts receive zero insight data in their React tree, preventing any client-side inspection bypass.

### Platform & Content

| Area | Description |
|---|---|
| **Auth** | Firebase Auth — email/password, Google Sign-In, and Google One Tap. Real-time `onSnapshot` tier synchronization. |
| **Boss Tier Hub** | `/boss` — transparent 1-month and 6-month plans, 14-feature audit comparison, mobile-friendly payment flow via bKash. |
| **DSE Learning Blog** | Headless-CMS-powered (Contentful) articles on BO account opening, brokers, and DSE investing basics. |
| **Admin Command Center** | `/admin` & `/admin/tier` — 1-click Boss tier approvals/rejections, user email/UID search & manual grant, recharge queue, tamperproof security audit, and site analytics. Firebase custom-claim gated. |

<br/>

---

<br/>

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│  Framework        Next.js 16 (App Router)                   │
│  Language         TypeScript 5 (strict)                     │
│  Styling          Tailwind CSS 3                             │
│  UI               React 19 + Lucide Icons                   │
├─────────────────────────────────────────────────────────────┤
│  Backend / DB     Firebase Firestore + Firebase Auth        │
│  Market Data      Python serverless scrapers (Vercel)       │
│  Content          Contentful (headless CMS, blog)           │
├─────────────────────────────────────────────────────────────┤
│  Monitoring       Sentry + Vercel Analytics/Speed Insights  │
│  Performance      Service Workers (PWA) + bundle analysis   │
│  Deployment       Vercel                                    │
└─────────────────────────────────────────────────────────────┘
```

<br/>

---

<br/>

## 🚀 Local Development

### Prerequisites

- **[Node.js](https://nodejs.org/)** — see `.nvmrc` for the exact version
- **[pnpm](https://pnpm.io/)** (package manager)
- **Git**
- A Firebase project (Auth + Firestore + a service account for the Admin SDK)

### Quick Start

```bash
# 1. Clone & enter
git clone https://github.com/zaifears/StockSimulatorBD.git
cd StockSimulatorBD

# 2. Install dependencies
pnpm install

# 3. Configure environment
# Create .env.local with your Firebase (client + admin), Contentful,
# reCAPTCHA, and Resend credentials. There's no .env.example in this repo -
# grep the codebase for `process.env.` to see every variable in use.

# 4. Launch dev server
pnpm dev
```

> Note: `api/dse_chart.py` and `api/market_sync.py` are Python serverless functions deployed by Vercel — they don't run under `next dev`, so live chart/market data only works against a real Vercel deployment (or `vercel dev`).

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm type-check` | Run TypeScript type checking |
| `pnpm lint` / `pnpm lint:fix` | Run ESLint |
| `pnpm analyze` | Analyze bundle size (webpack bundle analyzer) |
| `pnpm perf-test` | Lighthouse + bundle-size check against production |
| `pnpm security-audit` | `pnpm audit` at moderate severity and above |

<br/>

---

<br/>

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br/>

---

<br/>

<div align="center">

  <strong>🚀 Ready to master the market?</strong>

  <br/><br/>

  <a href="https://www.stocksimulator.tech/trade">Visit Live Simulator</a> &nbsp;·&nbsp; <a href="https://github.com/zaifears/StockSimulatorBD/issues">Report Issue</a> &nbsp;·&nbsp; <a href="mailto:hello@shahoriar.bd">Contact</a>

  <br/><br/>

  <sub>Built with ❤️ by <a href="https://github.com/zaifears">zaifears</a></sub>

</div>
