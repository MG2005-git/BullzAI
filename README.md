<div align="center">
  <img src="icons/icon128.png" width="76" height="76" alt="BullzAI Logo" />
  <h1>BullzAI</h1>
  <p><b>Live Indian stock prices, candlestick charts, and AI-curated sentiment directly on financial news pages.</b></p>

  <p>
    <img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-10b981?style=flat-square" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/TypeScript-5.5-3b82f6?style=flat-square" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tests-32%20Passing-10b981?style=flat-square" alt="Tests Passing" />
    <img src="https://img.shields.io/badge/Markets-NSE%20%2F%20BSE-f59e0b?style=flat-square" alt="NSE / BSE" />
  </p>
</div>

<br />

## Overview

When reading Indian financial news on sites like **Moneycontrol**, **LiveMint**, or **The Economic Times**, verifying an equity's current price, valuation, or chart usually means opening multiple browser tabs, searching broker terminals, and sifting through clickbait headlines.

**BullzAI** is a Manifest V3 Chrome extension that solves this friction directly in the reader's workflow:

1. **Auto-detects stock and index mentions** on curated financial websites.
2. **Displays a lightweight hover card** with current price, session change, and a quick ticker copy button.
3. **Opens an in-page analytics sidebar** with self-hosted candlestick charts, a 52-week high/low range bar, valuation metrics, and Gemini-powered sentiment summaries.

---

## Core Capabilities

| Feature | What it does | How it works |
| :--- | :--- | :--- |
| **In-Situ Hover Cards** | Instant stock snapshot on hover. | Renders in an isolated Shadow DOM; fetches live quote without page slowdown. |
| **3-Tier Disambiguation** | Eliminates false-positive highlights (~95% accuracy). | Filters common words (e.g. bare *"nifty"*), exchange venue mentions (*"BSE-listed"*), and ambiguous names via proximity keyword checks. |
| **Pro Candlestick Charts** | Interactive historical charts with **1M, 3M, 6M, and 1Y** timeframes. | Built with `lightweight-charts` on HTML5 Canvas—runs completely offline without external iframe CSP blocks. |
| **52-Week Range Bar** | Visual price positioning within 52W extremes. | Dynamic slider showing current price pin between 52-Week Low and High, plus Trailing P/E and Day's Range. |
| **AI Sentiment Radar** | Analyzes whether recent news is Bullish, Bearish, or Neutral. | Fetches recent headlines from Google News RSS and prompts Gemini 3.6 Flash to output a sentiment score and a 1-sentence verdict. |
| **Watchlist & Market Pulse** | Toolbar dashboard tracking saved stocks and indices. | Displays real-time **Nifty 50** & **Sensex** benchmarks with instant client-side search and 1-click stock discovery. |

---

## Supported Sites

BullzAI currently runs on curated Indian financial publications:

- Economic Times (`economictimes.indiatimes.com`)
- Moneycontrol (`moneycontrol.com`)
- LiveMint (`livemint.com`)
- Business Standard (`business-standard.com`)
- CNBC-TV18 (`cnbctv18.com`)
- Financial Express (`financialexpress.com`)
- NDTV Profit (`ndtvprofit.com`)
- Business Today (`businesstoday.in`)
- The Hindu BusinessLine (`thehindubusinessline.com`)
- Zee Business (`zeebiz.com`)
- Reuters India & Reddit finance communities

*(Sites can be added or adjusted under `content_scripts.matches` in `manifest.json`.)*

---

## Quickstart

### Prerequisites
- Node.js (v18 or higher)
- Google Chrome (or any Chromium browser like Brave or Edge)

### 1. Installation & Build

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/BullzAI.git
cd BullzAI

# Install dependencies
npm install

# Build the extension into dist/
npm run build
```

### 2. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the **`dist/`** directory inside this project folder.
4. Open an article on [LiveMint](https://www.livemint.com) or [Moneycontrol](https://www.moneycontrol.com) and hover over any stock mention!

---

## Adding Gemini AI News Summaries (Optional)

BullzAI runs smoothly out of the box without any API keys (it displays verified raw Google News headlines). 

To enable AI sentiment scoring and headline summaries:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Create/edit `src/background/apiKeys.ts`:
   ```typescript
   export const GEMINI_API_KEY = 'YOUR_AI_STUDIO_API_KEY';
   ```
3. Rebuild the extension:
   ```bash
   npm run build
   ```
4. Reload the extension in `chrome://extensions`.

*(Note: `apiKeys.ts` is automatically gitignored so your personal API key is never committed to GitHub.)*

---

## Repository Structure

```
├── manifest.json            # Chrome Manifest V3 configuration
├── build.mjs                # Fast esbuild bundler script
├── popup.html               # Extension toolbar popup interface
├── icons/                   # Custom geometric BullzAI icons (16, 32, 48, 128px)
├── src/
│   ├── background/          # MV3 service worker, API clients, and TTL caches
│   │   ├── aiClient.ts      # Gemini prompt and anti-hallucination index parser
│   │   ├── cache.ts         # In-memory & session storage cache
│   │   ├── newsClient.ts    # Google News RSS ingestion
│   │   └── yahooFinanceClient.ts  # Quote & valuation telemetry
│   ├── content/             # In-page scripts and UI components
│   │   ├── disambiguation.ts# 3-tier contextual relevance filter
│   │   ├── scanner.ts       # Non-blocking DOM walker and highlighter
│   │   └── components/      # MiniPopup and ExpandedPanel (Shadow DOM)
│   ├── popup/               # Watchlist dashboard logic and styling
│   └── shared/              # Shared TypeScript interfaces and store helpers
└── scripts/                 # Acceptance tests, symbol verifiers, and icon builders
```

---

## Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds production bundles into `dist/` |
| `npm run watch` | Automatically rebuilds on source file changes |
| `npm test` | Runs 32 offline acceptance tests for entity matching and gating |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm run verify:news` | Live test of Google News feed and Gemini sentiment output |
| `npm run verify:indices`| Checks index symbols against live market feeds |

---

<!-- ## License

This project is licensed under the [MIT License](LICENSE). -->
