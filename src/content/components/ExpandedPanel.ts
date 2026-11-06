// BullzAI Expanded overlay panel: docked to the right edge of the viewport,
// full height, rendered in its own Shadow DOM. Shows LTP/day-change,
// 52-Week Range Bar, institutional valuation metrics, multi-timeframe
// candlestick chart (1M, 3M, 6M, 1Y via lightweight-charts), and
// BullzAI AI Sentiment Radar with material news summaries.

import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import css from './ExpandedPanel.css';
import type { ChartRange, GetStockNewsResponse, NewsItem, Quote } from '../../shared/types';
import type { MiniPopupContext } from './MiniPopup';
import { getChartData, getStockNews } from '../../shared/messaging';
import { isInWishlist, toggleWishlist, onWishlistChanged } from '../../shared/wishlistStore';

const NEWS_SHOW_LABEL = 'BullzAI Sentiment & Material News';
const NEWS_HIDE_LABEL = 'Hide BullzAI Sentiment & News';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildSparkIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'bullz-spark-icon');
  svg.setAttribute('aria-hidden', 'true');

  for (const d of [
    'M10 2.5l1.7 4.8 4.8 1.7-4.8 1.7L10 15.5 8.3 10.7 3.5 9l4.8-1.7L10 2.5z',
    'M18 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z',
  ]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
  }
  return svg;
}

function buildExternalIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('style', 'width:11px; height:11px;');
  svg.setAttribute('aria-hidden', 'true');

  for (const d of ['M14 4h6v6', 'M20 4l-8.5 8.5', 'M18 14.5V19a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h4.5']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }
  return svg;
}

function buildChevron(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'bullz-chevron');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 9l6 6 6-6');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}

export class ExpandedPanel {
  private hostEl: HTMLDivElement;
  private shadow: ShadowRoot;
  private tickerEl: HTMLSpanElement;
  private nameEl: HTMLDivElement;
  private ltpEl: HTMLSpanElement;
  private changeEl: HTMLSpanElement;
  private tvLinkEl: HTMLAnchorElement;
  private rangeCard: HTMLDivElement;
  private rangeLabels: HTMLDivElement;
  private rangeProgress: HTMLDivElement;
  private rangePin: HTMLDivElement;
  private metricsGrid: HTMLDivElement;
  private mcapValEl: HTMLDivElement;
  private peValEl: HTMLDivElement;
  private dayRangeValEl: HTMLDivElement;
  private starBtn: HTMLButtonElement;
  private chartSection: HTMLDivElement;
  private tfButtons: Map<ChartRange, HTMLButtonElement> = new Map();
  private currentTimeframe: ChartRange = '6mo';
  private newsContainer: HTMLDivElement;
  private newsToggle: HTMLButtonElement;
  private newsLabel: HTMLSpanElement;
  private newsBody: HTMLDivElement;

  private currentTvSymbol: string | null = null;
  private currentYahooSymbol: string | null = null;
  private currentContext: MiniPopupContext | null = null;

  private newsPromise: Promise<GetStockNewsResponse> | null = null;
  private newsExpanded = false;
  private newsRequestId = 0;

  private chart: IChartApi | null = null;
  private series: ISeriesApi<'Candlestick'> | null = null;
  private chartEl: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private chartRequestId = 0;

  constructor(private onClose?: () => void) {
    this.hostEl = document.createElement('div');
    Object.assign(this.hostEl.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      zIndex: '2147483646',
      display: 'none',
    });
    document.documentElement.appendChild(this.hostEl);
    this.shadow = this.hostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = css;
    this.shadow.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'bullz-panel';

    const header = document.createElement('div');
    header.className = 'bullz-panel-header';

    // Top Bar: BullzAI Brand badge + Actions (Star, Close)
    const topBar = document.createElement('div');
    topBar.className = 'bullz-panel-top-bar';

    const brandBadge = document.createElement('div');
    brandBadge.className = 'bullz-brand-badge';
    brandBadge.innerHTML = '<span>\u26A1</span> BULLZ AI PRO';

    const actions = document.createElement('div');
    actions.className = 'bullz-panel-actions';

    this.starBtn = document.createElement('button');
    this.starBtn.type = 'button';
    this.starBtn.className = 'bullz-panel-star';
    this.starBtn.addEventListener('click', () => {
      const context = this.currentContext;
      if (!context) return;
      void toggleWishlist(context).then((starred) => this.paintStar(starred));
    });
    this.paintStar(false);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'bullz-panel-close';
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => this.hide());

    actions.append(this.starBtn, closeBtn);
    topBar.append(brandBadge, actions);

    // Title Row: Ticker & TradingView link
    const titleRow = document.createElement('div');
    titleRow.className = 'bullz-panel-title-row';

    this.tickerEl = document.createElement('span');
    this.tickerEl.className = 'bullz-panel-ticker';

    this.tvLinkEl = document.createElement('a');
    this.tvLinkEl.className = 'bullz-panel-tv-link';
    this.tvLinkEl.target = '_blank';
    this.tvLinkEl.rel = 'noopener noreferrer';
    this.tvLinkEl.title = 'Open interactive chart on TradingView';
    this.tvLinkEl.append(document.createTextNode('TradingView'), buildExternalIcon());

    titleRow.append(this.tickerEl, this.tvLinkEl);

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'bullz-panel-name';

    // Price Row
    const priceRow = document.createElement('div');
    priceRow.className = 'bullz-panel-price-row';

    const priceLeft = document.createElement('div');
    priceLeft.className = 'bullz-price-left';

    this.ltpEl = document.createElement('span');
    this.ltpEl.className = 'bullz-panel-ltp';

    this.changeEl = document.createElement('span');
    this.changeEl.className = 'bullz-panel-change';

    priceLeft.append(this.ltpEl, this.changeEl);
    priceRow.append(priceLeft);

    // 52-Week Range Bar Card
    this.rangeCard = document.createElement('div');
    this.rangeCard.className = 'bullz-range-card';

    this.rangeLabels = document.createElement('div');
    this.rangeLabels.className = 'bullz-range-labels';

    const track = document.createElement('div');
    track.className = 'bullz-range-track';

    this.rangeProgress = document.createElement('div');
    this.rangeProgress.className = 'bullz-range-progress';

    this.rangePin = document.createElement('div');
    this.rangePin.className = 'bullz-range-pin';

    track.append(this.rangeProgress, this.rangePin);
    this.rangeCard.append(this.rangeLabels, track);

    // Institutional Metrics Grid
    this.metricsGrid = document.createElement('div');
    this.metricsGrid.className = 'bullz-metrics-grid';

    // Metric 1: Market Cap
    const mcapBox = document.createElement('div');
    mcapBox.className = 'bullz-metric-box';
    const mcapTitle = document.createElement('div');
    mcapTitle.className = 'bullz-metric-title';
    mcapTitle.textContent = 'MARKET CAP';
    this.mcapValEl = document.createElement('div');
    this.mcapValEl.className = 'bullz-metric-val';
    mcapBox.append(mcapTitle, this.mcapValEl);

    // Metric 2: P/E Ratio
    const peBox = document.createElement('div');
    peBox.className = 'bullz-metric-box';
    const peTitle = document.createElement('div');
    peTitle.className = 'bullz-metric-title';
    peTitle.textContent = 'P/E RATIO';
    this.peValEl = document.createElement('div');
    this.peValEl.className = 'bullz-metric-val';
    peBox.append(peTitle, this.peValEl);

    // Metric 3: Day's Range
    const dayBox = document.createElement('div');
    dayBox.className = 'bullz-metric-box';
    const dayTitle = document.createElement('div');
    dayTitle.className = 'bullz-metric-title';
    dayTitle.textContent = "DAY'S RANGE";
    this.dayRangeValEl = document.createElement('div');
    this.dayRangeValEl.className = 'bullz-metric-val';
    dayBox.append(dayTitle, this.dayRangeValEl);

    this.metricsGrid.append(mcapBox, peBox, dayBox);

    header.append(topBar, titleRow, this.nameEl, priceRow, this.rangeCard, this.metricsGrid);

    // AI Sentiment & News Section
    this.newsContainer = document.createElement('div');
    this.newsContainer.className = 'bullz-panel-news';

    this.newsToggle = document.createElement('button');
    this.newsToggle.type = 'button';
    this.newsToggle.className = 'bullz-news-toggle';
    this.newsLabel = document.createElement('span');
    this.newsToggle.append(buildSparkIcon(), this.newsLabel, buildChevron());
    this.newsToggle.addEventListener('click', () => this.toggleNews());

    this.newsBody = document.createElement('div');
    this.newsBody.className = 'bullz-news-body';

    this.newsContainer.append(this.newsToggle, this.newsBody);

    // Chart Section with Timeframe Selector
    this.chartSection = document.createElement('div');
    this.chartSection.className = 'bullz-chart-section';

    const tfBar = document.createElement('div');
    tfBar.className = 'bullz-timeframe-bar';

    const timeframes: ChartRange[] = ['1mo', '3mo', '6mo', '1y'];
    for (const tf of timeframes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bullz-tf-btn' + (tf === this.currentTimeframe ? ' active' : '');
      btn.textContent = tf.toUpperCase();
      btn.addEventListener('click', () => {
        if (this.currentTimeframe === tf) return;
        this.currentTimeframe = tf;
        this.tfButtons.forEach((b, k) => b.classList.toggle('active', k === tf));
        if (this.currentYahooSymbol) {
          void this.loadChartCandles(this.currentYahooSymbol, tf);
        }
      });
      this.tfButtons.set(tf, btn);
      tfBar.appendChild(btn);
    }

    this.chartSection.appendChild(tfBar);

    panel.append(header, this.newsContainer, this.chartSection);
    this.shadow.appendChild(panel);

    onWishlistChanged((items) => {
      const symbol = this.currentContext?.yahooSymbol;
      if (!symbol) return;
      this.paintStar(items.some((item) => item.yahooSymbol === symbol));
    });
  }

  show(quote: Quote, context: MiniPopupContext): void {
    if (!this.hostEl.isConnected) document.documentElement.appendChild(this.hostEl);
    this.render(quote, context);
    this.hostEl.style.display = 'block';
  }

  updateInPlace(quote: Quote, context: MiniPopupContext): void {
    this.render(quote, context);
  }

  hide(): void {
    this.hostEl.style.display = 'none';
    this.onClose?.();
  }

  isOpen(): boolean {
    return this.hostEl.style.display !== 'none';
  }

  private paintStar(starred: boolean): void {
    this.starBtn.classList.toggle('starred', starred);
    this.starBtn.textContent = starred ? '\u2605' : '\u2606';
    this.starBtn.title = starred ? 'Remove from BullzAI Watchlist' : 'Add to BullzAI Watchlist';
    this.starBtn.setAttribute('aria-label', this.starBtn.title);
    this.starBtn.setAttribute('aria-pressed', String(starred));
  }

  private render(quote: Quote, context: MiniPopupContext): void {
    this.currentContext = context;
    this.currentYahooSymbol = context.yahooSymbol;
    this.tickerEl.textContent = quote.ticker;
    this.nameEl.textContent = context.companyName;
    this.ltpEl.textContent = formatLevel(quote);
    this.tvLinkEl.href = `https://www.tradingview.com/symbols/${context.tvSymbol.replace(':', '-')}/`;

    this.paintStar(false);
    void isInWishlist(context.yahooSymbol).then((starred) => {
      if (this.currentContext?.yahooSymbol === context.yahooSymbol) this.paintStar(starred);
    });

    const direction = quote.change > 0 ? 'positive' : quote.change < 0 ? 'negative' : 'neutral';
    this.changeEl.className = `bullz-panel-change ${direction}`;
    const arrow = quote.change > 0 ? '\u25B2 ' : quote.change < 0 ? '\u25BC ' : '';
    const sign = quote.change > 0 ? '+' : '';
    this.changeEl.textContent = `${arrow}${sign}${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)`;

    const isIndex = quote.kind === 'index';

    // 52-Week Range Bar calculation
    if (quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow) {
      this.rangeCard.style.display = 'block';
      const lowStr = formatCurrency(quote.fiftyTwoWeekLow, quote.currency);
      const highStr = formatCurrency(quote.fiftyTwoWeekHigh, quote.currency);
      this.rangeLabels.innerHTML = `<span>52W L: ${lowStr}</span><span>52W H: ${highStr}</span>`;

      const pct = Math.max(0, Math.min(100, ((quote.ltp - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100));
      this.rangeProgress.style.width = `${pct}%`;
      this.rangePin.style.left = `${pct}%`;
    } else {
      this.rangeCard.style.display = 'none';
    }

    // Institutional Metrics
    this.metricsGrid.style.display = isIndex ? 'none' : 'grid';
    if (!isIndex) {
      this.mcapValEl.textContent = quote.marketCap ? formatMarketCap(quote.marketCap) : '\u2014';
      this.peValEl.textContent = quote.peRatio && quote.peRatio > 0 ? `${quote.peRatio.toFixed(1)}x` : '\u2014';
      if (quote.dayLow && quote.dayHigh) {
        this.dayRangeValEl.textContent = `${formatCompactNum(quote.dayLow)} \u2013 ${formatCompactNum(quote.dayHigh)}`;
      } else if (quote.volume) {
        this.dayRangeValEl.textContent = formatVolume(quote.volume);
      } else {
        this.dayRangeValEl.textContent = '\u2014';
      }
    }

    if (this.currentTvSymbol !== context.tvSymbol) {
      this.currentTvSymbol = context.tvSymbol;
      void this.mountChart(context.yahooSymbol, this.currentTimeframe);
      this.resetNews(context);
    }
  }

  private resetNews(context: MiniPopupContext): void {
    this.newsRequestId++;
    this.newsExpanded = false;
    this.newsBody.innerHTML = '';
    this.newsBody.style.display = 'none';
    this.newsLabel.textContent = NEWS_SHOW_LABEL;
    this.newsToggle.classList.remove('bullz-news-open');

    this.newsContainer.style.display = '';
    this.newsPromise = getStockNews(context.yahooSymbol, context.ticker, context.companyName);
  }

  private toggleNews(): void {
    if (this.newsExpanded) {
      this.newsExpanded = false;
      this.newsBody.style.display = 'none';
      this.newsLabel.textContent = NEWS_SHOW_LABEL;
      this.newsToggle.classList.remove('bullz-news-open');
      return;
    }

    this.newsExpanded = true;
    this.newsBody.style.display = '';
    this.newsLabel.textContent = NEWS_HIDE_LABEL;
    this.newsToggle.classList.add('bullz-news-open');

    const pending = this.newsPromise;
    if (!pending) return;

    this.newsBody.innerHTML = '';
    this.newsBody.appendChild(buildNewsStatus('Analyzing BullzAI Market Intelligence\u2026'));

    const requestId = this.newsRequestId;
    void pending.then((response) => {
      if (requestId !== this.newsRequestId || !this.newsExpanded) return;
      this.renderNews(response);
    });
  }

  private renderNews(response: GetStockNewsResponse): void {
    this.newsBody.innerHTML = '';

    if (!response.ok) {
      this.newsBody.appendChild(buildNewsStatus(response.error));
      return;
    }

    if (response.items.length === 0) {
      this.newsBody.appendChild(buildNewsStatus('No material company updates detected in the last 48 hours.'));
      return;
    }

    // BullzAI Sentiment Radar Banner
    if (response.summarized && (response.sentiment || response.verdict)) {
      const sentimentCard = document.createElement('div');
      sentimentCard.className = 'bullz-sentiment-card';

      const sHeader = document.createElement('div');
      sHeader.className = 'bullz-sentiment-header';

      const sBadge = document.createElement('div');
      const sentiment = response.sentiment || 'neutral';
      sBadge.className = `bullz-sentiment-badge ${sentiment}`;
      const icon = sentiment === 'bullish' ? '\uD83D\uDC02' : sentiment === 'bearish' ? '\uD83D\uDC3B' : '\u2696\uFE0F';
      const score = response.sentimentScore ? ` (${response.sentimentScore}%)` : '';
      sBadge.textContent = `${icon} ${sentiment.toUpperCase()} BIAS${score}`;

      sHeader.appendChild(sBadge);

      const gauge = document.createElement('div');
      gauge.className = 'bullz-sentiment-gauge';
      const gaugeFill = document.createElement('div');
      gaugeFill.className = `bullz-gauge-fill ${sentiment}`;
      gaugeFill.style.width = `${response.sentimentScore ?? 65}%`;
      gauge.appendChild(gaugeFill);

      sentimentCard.append(sHeader, gauge);

      if (response.verdict) {
        const quoteEl = document.createElement('div');
        quoteEl.className = 'bullz-verdict-quote';
        quoteEl.textContent = `\u201C${response.verdict}\u201D`;
        sentimentCard.appendChild(quoteEl);
      }

      this.newsBody.appendChild(sentimentCard);
    } else if (!response.summarized) {
      const note = document.createElement('div');
      note.className = 'bullz-news-status';
      note.textContent = 'Showing raw Google News headlines (AI ranking key inactive).';
      this.newsBody.appendChild(note);
    }

    // Material Ranked News
    const list = document.createElement('div');
    list.className = 'bullz-news-list';
    for (const item of response.items) {
      list.appendChild(buildNewsItem(item));
    }
    this.newsBody.appendChild(list);
  }

  private teardownChart(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.chart?.remove();
    this.chart = null;
    this.series = null;
    if (this.chartEl && this.chartEl.parentNode) {
      this.chartEl.parentNode.removeChild(this.chartEl);
    }
    this.chartEl = null;
  }

  private async mountChart(yahooSymbol: string, range: ChartRange): Promise<void> {
    this.teardownChart();

    const chartEl = document.createElement('div');
    chartEl.className = 'bullz-chart-canvas';
    this.chartSection.appendChild(chartEl);
    this.chartEl = chartEl;

    const chart = createChart(chartEl, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0d14' },
        textColor: '#8b949e',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
      timeScale: { borderColor: 'rgba(255, 255, 255, 0.08)' },
      crosshair: { mode: 0 },
      width: chartEl.clientWidth,
      height: chartEl.clientHeight,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff3366',
      borderUpColor: '#00e676',
      borderDownColor: '#ff3366',
      wickUpColor: '#00e676',
      wickDownColor: '#ff3366',
    });

    this.chart = chart;
    this.series = series;

    const resizeObserver = new ResizeObserver(() => {
      if (!this.chart || !this.chartEl) return;
      this.chart.applyOptions({
        width: this.chartEl.clientWidth,
        height: this.chartEl.clientHeight,
      });
    });
    resizeObserver.observe(chartEl);
    this.resizeObserver = resizeObserver;

    await this.loadChartCandles(yahooSymbol, range);
  }

  private async loadChartCandles(yahooSymbol: string, range: ChartRange): Promise<void> {
    const requestId = ++this.chartRequestId;
    const response = await getChartData(yahooSymbol, range);

    if (requestId !== this.chartRequestId || !this.series || !this.chart) return;

    if (response.ok && response.candles.length > 0) {
      this.series.setData(
        response.candles.map((candle) => ({
          time: candle.time as UTCTimestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))
      );
      this.chart.timeScale().fitContent();
    }
  }
}

function buildNewsStatus(text: string): HTMLDivElement {
  const status = document.createElement('div');
  status.className = 'bullz-news-status';
  status.textContent = text;
  return status;
}

function buildNewsItem(item: NewsItem): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'bullz-news-item';

  const title = document.createElement('a');
  title.className = 'bullz-news-title';
  title.href = item.url;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = item.title;
  wrapper.appendChild(title);

  if (item.summary) {
    const summary = document.createElement('p');
    summary.className = 'bullz-news-summary';
    summary.textContent = item.summary;
    wrapper.appendChild(summary);
  }

  const meta = document.createElement('a');
  meta.className = 'bullz-news-meta';
  meta.href = item.url;
  meta.target = '_blank';
  meta.rel = 'noopener noreferrer';
  meta.textContent = item.publishedAt
    ? `${item.source} \u00b7 ${formatAge(item.publishedAt)}`
    : item.source;
  wrapper.appendChild(meta);

  return wrapper;
}

function formatAge(publishedAt: number): string {
  const minutes = Math.round((Date.now() - publishedAt) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatCurrency(value: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '\u20b9' : '';
  return `${symbol}${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactNum(value: number): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });
}

function formatLevel(quote: Quote): string {
  if (quote.kind === 'index') {
    return quote.ltp.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return formatCurrency(quote.ltp, quote.currency);
}

function formatMarketCap(value: number): string {
  const crore = value / 1e7;
  if (crore >= 1e5) return `\u20b9${(crore / 1e5).toFixed(2)} Lakh Cr`;
  return `\u20b9${crore.toFixed(0)} Cr`;
}

function formatVolume(value: number): string {
  if (value >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  return value.toLocaleString('en-IN');
}
