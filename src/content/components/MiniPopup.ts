// Lightweight hover popup for BullzAI: ticker, brand tag, full company name,
// LTP, day change %, copy ticker button, and a "View Chart" button.
// No heavy chart is loaded here -- that happens on-demand in ExpandedPanel.

import css from './MiniPopup.css';
import type { EntryKind, Quote } from '../../shared/types';
import { isInWishlist, toggleWishlist } from '../../shared/wishlistStore';

export interface MiniPopupContext {
  ticker: string;
  companyName: string;
  yahooSymbol: string;
  tvSymbol: string;
  kind: EntryKind;
}

export type ViewChartHandler = (context: MiniPopupContext) => void;

const POPUP_WIDTH = 220;
const ESTIMATED_HEIGHT = 175;
const VIEWPORT_MARGIN = 8;

export class MiniPopup {
  private hostEl: HTMLDivElement;
  private shadow: ShadowRoot;
  private tickerEl: HTMLParagraphElement;
  private copyBtn: HTMLButtonElement;
  private nameEl: HTMLParagraphElement;
  private bodyEl: HTMLDivElement;
  private context: MiniPopupContext | null = null;
  private hideTimeout: number | undefined;

  constructor(private onViewChart: ViewChartHandler) {
    this.hostEl = document.createElement('div');
    Object.assign(this.hostEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      top: '0',
      left: '0',
    });
    document.documentElement.appendChild(this.hostEl);
    this.shadow = this.hostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = css;
    this.shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'bullz-mini-popup';

    const headerRow = document.createElement('div');
    headerRow.className = 'bullz-header-row';

    const tickerWrap = document.createElement('div');
    tickerWrap.className = 'bullz-ticker-wrap';

    this.tickerEl = document.createElement('p');
    this.tickerEl.className = 'bullz-ticker';

    this.copyBtn = document.createElement('button');
    this.copyBtn.type = 'button';
    this.copyBtn.className = 'bullz-copy-btn';
    this.copyBtn.title = 'Copy ticker';
    this.copyBtn.textContent = '\u29C9';
    this.copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.context?.ticker) {
        navigator.clipboard.writeText(this.context.ticker).then(() => {
          this.copyBtn.textContent = '\u2713';
          setTimeout(() => {
            this.copyBtn.textContent = '\u29C9';
          }, 1200);
        }).catch(() => {});
      }
    });

    tickerWrap.append(this.tickerEl, this.copyBtn);

    const brandTag = document.createElement('span');
    brandTag.className = 'bullz-brand-tag';
    brandTag.textContent = '\u26A1 BULLZ';

    headerRow.append(tickerWrap, brandTag);

    this.nameEl = document.createElement('p');
    this.nameEl.className = 'bullz-name';

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'bullz-body';

    card.append(headerRow, this.nameEl, this.bodyEl);
    this.shadow.appendChild(card);

    // Keep the popup open while the cursor is over it
    this.hostEl.addEventListener('mouseenter', () => this.cancelHide());
    this.hostEl.addEventListener('mouseleave', () => this.scheduleHide());
  }

  scheduleHide(delay = 200): void {
    this.cancelHide();
    this.hideTimeout = window.setTimeout(() => this.hide(), delay);
  }

  cancelHide(): void {
    if (this.hideTimeout !== undefined) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  showLoading(anchorRect: DOMRect, context: MiniPopupContext): void {
    if (!this.hostEl.isConnected) document.documentElement.appendChild(this.hostEl);

    this.context = context;
    this.tickerEl.textContent = context.ticker;
    this.nameEl.textContent = context.companyName;
    this.bodyEl.innerHTML = '';

    const loading = document.createElement('div');
    loading.className = 'bullz-loading';
    loading.textContent = 'Fetching BullzAI Quote...';
    this.bodyEl.appendChild(loading);

    this.position(anchorRect);
    this.hostEl.style.display = 'block';
    this.cancelHide();
  }

  renderQuote(yahooSymbol: string, quote: Quote): void {
    if (!this.context || this.context.yahooSymbol !== yahooSymbol) return;
    this.bodyEl.innerHTML = '';

    const priceBox = document.createElement('div');
    priceBox.className = 'bullz-price-box';

    const ltp = document.createElement('p');
    ltp.className = 'bullz-ltp';
    ltp.textContent = formatLevel(quote);

    const changeBadge = document.createElement('span');
    const direction = quote.change > 0 ? 'positive' : quote.change < 0 ? 'negative' : 'neutral';
    changeBadge.className = `bullz-change-badge ${direction}`;
    const arrow = quote.change > 0 ? '\u25B2 ' : quote.change < 0 ? '\u25BC ' : '';
    const sign = quote.change > 0 ? '+' : '';
    changeBadge.textContent = `${arrow}${sign}${quote.changePercent.toFixed(2)}%`;

    priceBox.append(ltp, changeBadge);

    const divider = document.createElement('hr');
    divider.className = 'bullz-divider';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bullz-view-chart-btn';
    btn.textContent = 'View Pro Chart';
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.context) this.onViewChart(this.context);
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'bullz-action-row';
    actionRow.append(btn, this.buildStarButton(this.context));

    this.bodyEl.append(priceBox, divider, actionRow);
  }

  private buildStarButton(context: MiniPopupContext): HTMLButtonElement {
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.className = 'bullz-star-btn';

    const paint = (starred: boolean) => {
      starBtn.classList.toggle('starred', starred);
      starBtn.textContent = starred ? '\u2605' : '\u2606';
      starBtn.title = starred ? 'Remove from BullzAI Watchlist' : 'Add to BullzAI Watchlist';
      starBtn.setAttribute('aria-label', starBtn.title);
      starBtn.setAttribute('aria-pressed', String(starred));
    };
    paint(false);

    void isInWishlist(context.yahooSymbol).then((starred) => {
      if (this.context?.yahooSymbol === context.yahooSymbol) paint(starred);
    });

    starBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void toggleWishlist(context).then(paint);
    });

    return starBtn;
  }

  renderError(yahooSymbol: string, message: string): void {
    if (!this.context || this.context.yahooSymbol !== yahooSymbol) return;
    this.bodyEl.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'bullz-error';
    err.textContent = message || 'Market data temporarily unavailable';
    this.bodyEl.appendChild(err);
  }

  hide(): void {
    this.hostEl.style.display = 'none';
    this.context = null;
  }

  isShowing(): boolean {
    return this.hostEl.style.display !== 'none';
  }

  getActiveSymbol(): string | null {
    return this.context?.yahooSymbol ?? null;
  }

  private position(anchorRect: DOMRect): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.left;
    if (left + POPUP_WIDTH + VIEWPORT_MARGIN > viewportWidth) {
      left = Math.max(VIEWPORT_MARGIN, viewportWidth - POPUP_WIDTH - VIEWPORT_MARGIN);
    }

    let top = anchorRect.bottom + VIEWPORT_MARGIN;
    if (top + ESTIMATED_HEIGHT > viewportHeight) {
      top = Math.max(VIEWPORT_MARGIN, anchorRect.top - ESTIMATED_HEIGHT - VIEWPORT_MARGIN);
    }

    this.hostEl.style.left = `${left}px`;
    this.hostEl.style.top = `${top}px`;
  }
}

function formatLevel(quote: Quote): string {
  const prefix = quote.kind === 'index' ? '' : quote.currency === 'INR' ? '\u20b9' : '';
  return `${prefix}${quote.ltp.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
