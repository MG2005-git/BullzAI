# ⚡ BullzAI

> **Institutional-grade real-time stock intelligence, AI market sentiment, and interactive charts for Indian markets.**

BullzAI is a Manifest V3 Chrome Extension engineered for investors, traders, and financial readers. As you browse Indian financial publications (*The Economic Times*, *Moneycontrol*, *LiveMint*, *Business Standard*, *Reddit*, etc.), BullzAI scans the page, identifies NSE/BSE equities and market indices in real time, and equips you with actionable institutional telemetry.

---

## 🚀 Key Features & Uniqueness

- **⚡ Cyber-Fintech Obsidian Theme:** Custom dark glassmorphism aesthetic with high-contrast electric emerald (`#00e676`) and bearish crimson (`#ff3366`) accents, micro-animations, and subtle glowing article highlights.
- **🐂 BullzAI Sentiment Radar (Powered by Gemini):** Automatically ingests live headlines from Google News RSS, calculates a quantitative sentiment bias (`BULLISH`, `BEARISH`, or `NEUTRAL` with confidence score %), and synthesizes a 1-sentence **AI Market Verdict**.
- **📊 Interactive 52-Week Range Slider:** Visual price-position bar displaying exactly where the current price sits between 52-Week Low and 52-Week High with glowing precision callout.
- **📈 Multi-Timeframe Candlestick Charts:** Self-hosted interactive candlestick charting engine (via `lightweight-charts`) with rapid timeframe switching (**1M**, **3M**, **6M**, **1Y**), immune to host-page Content Security Policies (CSPs).
- **🏛️ Institutional Valuation Metrics:** Instant access to Trailing P/E ratio, Market Capitalization (formatted in ₹ Lakh Cr), Day's High/Low Range, and Volume vs 3-month average.
- **⚡ Quick-Action Mini Tooltip:** Hover card featuring 1-click **Ticker Copy to Clipboard** (`📋`), day change badge, watchlist star, and "View Pro Chart" launcher.
- **📱 Live Market Pulse & Watchlist Popup:** Browser toolbar dashboard displaying real-time Nifty 50 & Sensex indices, instant search filtering, and cloud-synced saved stocks.

---

## 🛠️ Setup & Build

```bash
# 1. Install dependencies
npm install

# 2. Build production bundle into dist/
npm run build

# 3. Development watch mode (rebuilds automatically on change)
npm run watch

# 4. Type check TypeScript
npm run typecheck

# 5. Run matching & disambiguation acceptance tests
npm test

# 6. Test BullzAI Sentiment & News pipeline
npm run verify:news

# 7. Generate custom BullzAI icons
npm run generate:icons
```

---

## 🔌 Load into Chrome

1. Run `npm run build` (generates the complete extension in the `dist/` directory).
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle switch).
4. Click **Load unpacked** and select the `dist/` folder from this repository.
5. Visit any financial news site (e.g. [LiveMint](https://www.livemint.com), [Moneycontrol](https://www.moneycontrol.com), or [Economic Times](https://economictimes.indiatimes.com)).
6. Hover over any highlighted company or index name to launch the BullzAI tooltip, or click "View Pro Chart" to expand the analytics panel.

---

## 🤖 Configuring Gemini AI Sentiment Analysis

BullzAI includes built-in support for Google's Gemini 3.6 Flash model:
1. Obtain a free API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Open `src/background/apiKeys.ts` and set:
   ```typescript
   export const GEMINI_API_KEY = 'YOUR_AI_STUDIO_API_KEY';
   ```
3. Run `npm run build` to package the key into the background worker.
4. If left blank, BullzAI gracefully falls back to showing raw RSS headlines without failing.

---

## 🏗️ Architecture

- **`src/content/scanner.ts`**: High-performance text node walker that matches against the NSE/BSE equity and index dictionary with financial context disambiguation (filtering ambiguous names and exchange venue mentions).
- **`src/content/components/MiniPopup.ts`**: Shadow DOM hover tooltip with instant price, percentage badge, ticker copy button, and watchlist toggle.
- **`src/content/components/ExpandedPanel.ts`**: Full-height right overlay panel with the 52-week range slider, P/E ratio, Market Cap, multi-timeframe candlestick chart, and BullzAI Sentiment Radar.
- **`src/background/service-worker.ts`**: Service worker that proxies cross-origin requests for Yahoo Finance (`v7/finance/quote`, `v8/finance/chart`), Google News RSS, and Gemini API through memory & session TTL caches.
- **`src/popup/popup.ts`**: Toolbar popup featuring live Nifty 50 and Sensex market pulse banners and an interactive searchable watchlist.
