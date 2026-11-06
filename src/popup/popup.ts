// BullzAI Toolbar popup: lists starred stocks from chrome.storage.sync,
// fetches live quotes on-demand, provides real-time search filtering,
// discovers un-saved stocks from the NSE dictionary to add with 1 click,
// and displays a live market pulse banner for Nifty 50 and Sensex.

import { getQuote } from '../shared/messaging';
import { getWishlist, removeFromWishlist, addToWishlist, onWishlistChanged } from '../shared/wishlistStore';
import type { CompanyEntry, Quote, WishlistItem } from '../shared/types';
import companiesData from '../data/companies.json';
import indicesData from '../data/indices.json';

const EMPTY_MESSAGE =
  'No stocks saved to BullzAI yet. Hover any stock name on financial news sites and tap the star to add it here.';

const listEl = document.getElementById('wl-list') as HTMLDivElement;
const searchInput = document.getElementById('bullz-search') as HTMLInputElement | null;
const niftyValEl = document.getElementById('nifty-val') as HTMLSpanElement | null;
const sensexValEl = document.getElementById('sensex-val') as HTMLSpanElement | null;

const allUniverse: CompanyEntry[] = [
  ...(companiesData as CompanyEntry[]),
  ...(indicesData as CompanyEntry[]),
];

let allItems: WishlistItem[] = [];
let searchQuery = '';
let renderId = 0;

function filterAndRender(): void {
  const q = searchQuery.trim().toLowerCase();
  const currentRender = ++renderId;
  listEl.innerHTML = '';

  const savedMatches = q
    ? allItems.filter(
        (item) =>
          item.ticker.toLowerCase().includes(q) ||
          item.companyName.toLowerCase().includes(q)
      )
    : allItems;

  if (savedMatches.length > 0) {
    if (q) {
      const sec = document.createElement('div');
      sec.className = 'wl-section-title';
      sec.textContent = 'SAVED IN WATCHLIST';
      listEl.appendChild(sec);
    }
    for (const item of [...savedMatches].reverse()) {
      listEl.appendChild(buildRow(item, currentRender));
    }
  } else if (!q) {
    const empty = document.createElement('p');
    empty.className = 'wl-empty';
    empty.textContent = EMPTY_MESSAGE;
    listEl.appendChild(empty);
    return;
  }

  // If user searched, show discoverable matches from universe that aren't yet saved
  if (q.length >= 1) {
    const savedSymbols = new Set(allItems.map((i) => i.yahooSymbol));
    const discoverable = allUniverse
      .filter((c) => {
        if (savedSymbols.has(c.yahooSymbol)) return false;
        const inTicker = c.ticker.toLowerCase().includes(q);
        const inName = c.canonicalName.toLowerCase().includes(q);
        const inAliases = (c.aliases || []).some((a) => a.toLowerCase().includes(q));
        return inTicker || inName || inAliases;
      })
      .slice(0, 5);

    if (discoverable.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'wl-section-title';
      sec.textContent = 'DISCOVER & ADD';
      listEl.appendChild(sec);

      for (const entry of discoverable) {
        listEl.appendChild(buildDiscoverRow(entry));
      }
    } else if (savedMatches.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'wl-empty';
      empty.textContent = `No stocks found matching "${searchQuery}".`;
      listEl.appendChild(empty);
    }
  }
}

function buildRow(item: WishlistItem, currentRender: number): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'wl-row';

  const identity = document.createElement('div');
  identity.className = 'wl-identity';
  const ticker = document.createElement('div');
  ticker.className = 'wl-ticker';
  ticker.textContent = item.ticker;
  const name = document.createElement('div');
  name.className = 'wl-name';
  name.textContent = item.companyName;
  name.title = item.companyName;
  identity.append(ticker, name);

  const quoteEl = document.createElement('div');
  quoteEl.className = 'wl-quote';
  const ltpEl = document.createElement('div');
  ltpEl.className = 'wl-ltp';
  ltpEl.textContent = '\u2026';
  const changeEl = document.createElement('div');
  changeEl.className = 'wl-change';
  quoteEl.append(ltpEl, changeEl);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'wl-remove';
  removeBtn.textContent = '\u2715';
  removeBtn.title = `Remove ${item.ticker} from BullzAI watchlist`;
  removeBtn.setAttribute('aria-label', removeBtn.title);
  removeBtn.addEventListener('click', () => {
    void removeFromWishlist(item.yahooSymbol);
  });

  row.append(identity, quoteEl, removeBtn);

  void getQuote(item.yahooSymbol, item.kind, item.ticker).then((response) => {
    if (currentRender !== renderId) return;
    if (!response.ok) {
      ltpEl.textContent = 'N/A';
      return;
    }
    paintQuote(response.quote, ltpEl, changeEl);
  });

  return row;
}

function buildDiscoverRow(entry: CompanyEntry): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'wl-row';

  const identity = document.createElement('div');
  identity.className = 'wl-identity';
  const ticker = document.createElement('div');
  ticker.className = 'wl-ticker';
  ticker.textContent = entry.ticker;
  const name = document.createElement('div');
  name.className = 'wl-name';
  name.textContent = entry.canonicalName;
  name.title = entry.canonicalName;
  identity.append(ticker, name);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'wl-add-btn';
  addBtn.textContent = '+ Add';
  addBtn.title = `Add ${entry.ticker} to BullzAI watchlist`;
  addBtn.addEventListener('click', () => {
    void addToWishlist({
      ticker: entry.ticker,
      companyName: entry.canonicalName,
      yahooSymbol: entry.yahooSymbol,
      tvSymbol: entry.tvSymbol,
      kind: entry.kind ?? 'equity',
    });
  });

  row.append(identity, addBtn);
  return row;
}

function paintQuote(quote: Quote, ltpEl: HTMLDivElement, changeEl: HTMLDivElement): void {
  ltpEl.textContent = formatLevel(quote);

  const direction = quote.change > 0 ? 'positive' : quote.change < 0 ? 'negative' : 'neutral';
  changeEl.className = `wl-change ${direction}`;
  const sign = quote.change > 0 ? '+' : '';
  changeEl.textContent = `${sign}${quote.changePercent.toFixed(2)}%`;
}

function formatLevel(quote: Quote): string {
  const formatted = quote.ltp.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (quote.kind === 'index') return formatted;
  return `${quote.currency === 'INR' || !quote.currency ? '\u20b9' : ''}${formatted}`;
}

// Fetch Market Pulse indices for the top banner
function loadMarketPulse(): void {
  void getQuote('^NSEI', 'index', 'NIFTY50').then((res) => {
    if (res.ok && niftyValEl) {
      const dir = res.quote.change >= 0 ? 'positive' : 'negative';
      const sign = res.quote.change >= 0 ? '+' : '';
      niftyValEl.className = `pulse-val ${dir}`;
      niftyValEl.textContent = `${res.quote.ltp.toFixed(0)} (${sign}${res.quote.changePercent.toFixed(1)}%)`;
    }
  });

  void getQuote('^BSESN', 'index', 'SENSEX').then((res) => {
    if (res.ok && sensexValEl) {
      const dir = res.quote.change >= 0 ? 'positive' : 'negative';
      const sign = res.quote.change >= 0 ? '+' : '';
      sensexValEl.className = `pulse-val ${dir}`;
      sensexValEl.textContent = `${res.quote.ltp.toFixed(0)} (${sign}${res.quote.changePercent.toFixed(1)}%)`;
    }
  });
}

// Search input listener
searchInput?.addEventListener('input', () => {
  searchQuery = searchInput.value;
  filterAndRender();
});

// Load initial watchlist and pulse
void getWishlist().then((items) => {
  allItems = items;
  filterAndRender();
});

onWishlistChanged((items) => {
  allItems = items;
  filterAndRender();
});

loadMarketPulse();
