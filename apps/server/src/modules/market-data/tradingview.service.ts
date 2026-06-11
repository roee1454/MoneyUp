import { Injectable, Logger } from '@nestjs/common';

/**
 * Service providing business logic and database access for TradingView.
 */
@Injectable()
export class TradingViewService {
  private readonly logger = new Logger(TradingViewService.name);

  // Simple in-memory cache to prevent rate limiting
  private cache = new Map<string, { data: any; expiry: number }>();

  private computeRecommendation(value: number | null): string {
    if (value === null) return '';
    if (value <= -0.5) return 'STRONG_SELL';
    if (value <= -0.1) return 'SELL';
    if (value <= 0.1) return 'NEUTRAL';
    if (value <= 0.5) return 'BUY';
    return 'STRONG_BUY';
  }

  async getTechnicalAnalysis(ticker: string, exchange: string = 'NASDAQ') {
    // Some AI models provide the ticker as EXCHANGE:TICKER, let's normalize it
    if (ticker.includes(':')) {
      const parts = ticker.split(':');
      exchange = parts[0];
      ticker = parts[1];
    }

    const symbol = `${exchange}:${ticker}`;
    const cacheKey = symbol;
    const now = Date.now();

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > now) {
        this.logger.log(`Returning cached TradingView TA for ${symbol}`);
        return cached.data;
      }
    }

    this.logger.log(`Fetching TradingView Technical Analysis for ${symbol}`);

    let screener = 'america';
    if (exchange === 'TASE') screener = 'israel';
    else if (['LSE', 'LONDON'].includes(exchange)) screener = 'uk';
    else if (['XETRA', 'FWB'].includes(exchange)) screener = 'germany';

    const payload = {
      symbols: { tickers: [symbol] },
      columns: ['Recommend.Other', 'Recommend.All', 'Recommend.MA', 'RSI', 'close', 'SMA50', 'change_abs'],
    };

    try {
      const response = await fetch(
        `https://scanner.tradingview.com/${screener}/scan`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(
          `TradingView API responded with status: ${response.status}`,
        );
      }

      const data = (await response.json()) as any;

      if (!data.data || data.data.length === 0) {
        throw new Error(`Symbol ${symbol} not found on TradingView.`);
      }

      const d = data.data[0].d;

      const result = {
        ticker,
        exchange,
        currentPrice: d[4] ? parseFloat(d[4].toFixed(2)) : null,
        avgPrice: d[5] ? parseFloat(d[5].toFixed(2)) : null, // Mocking average purchase price using SMA50
        dailyChange: d[6] ? parseFloat(d[6].toFixed(2)) : 0, // Absolute price change today
        summary: {
          RECOMMENDATION: this.computeRecommendation(d[1]),
        },
        oscillators: {
          RECOMMENDATION: this.computeRecommendation(d[0]),
          RSI: d[3] ? parseFloat(d[3].toFixed(2)) : null,
        },
        movingAverages: {
          RECOMMENDATION: this.computeRecommendation(d[2]),
        },
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, { data: result, expiry: now + 5 * 60 * 1000 });

      return result;
    } catch (e: any) {
      this.logger.error(`Error fetching TA for ${symbol}: ${e.message}`);
      throw e;
    }
  }
}
