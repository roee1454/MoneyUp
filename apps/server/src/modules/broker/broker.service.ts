import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { TradingViewService } from '../market-data/tradingview.service';

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);

  constructor(
    @Inject(forwardRef(() => TradingViewService))
    private readonly tradingViewService: TradingViewService
  ) {}

  // Will connect to IBKR Client Portal API (Interactive IL) in production.
  async getPortfolio(userId: string) {
    this.logger.log(`Fetching dynamic portfolio for user: ${userId}`);
    
    const positions = [
      { ticker: 'AAPL', shares: 10 },
      { ticker: 'MSFT', shares: 5 },
      { ticker: 'TSLA', shares: 20 },
    ];

    // Fetch live prices
    const enrichedPositions = await Promise.all(
      positions.map(async (pos) => {
        try {
          const ta = await this.tradingViewService.getTechnicalAnalysis(pos.ticker, 'NASDAQ');
          if (ta && ta.currentPrice && ta.avgPrice) {
            return { ...pos, currentPrice: ta.currentPrice, avgPrice: ta.avgPrice, dailyChange: ta.dailyChange || 0 };
          }
          return { ...pos, currentPrice: 0, avgPrice: 0, dailyChange: 0 };
        } catch (e) {
          return { ...pos, currentPrice: 0, avgPrice: 0, dailyChange: 0 };
        }
      })
    );

    const totalValue = enrichedPositions.reduce((acc, pos) => acc + (pos.shares * pos.currentPrice), 0);
    const totalCost = enrichedPositions.reduce((acc, pos) => acc + (pos.shares * pos.avgPrice), 0);
    const dailyPnL = enrichedPositions.reduce((acc, pos) => acc + (pos.shares * pos.dailyChange), 0);
    const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    const totalProfit = totalValue - totalCost;

    return {
      balance: parseFloat(totalValue.toFixed(2)),
      currency: 'USD',
      dailyPnL: parseFloat(dailyPnL.toFixed(2)),
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      positions: enrichedPositions
    };
  }
}
