import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TradingViewService } from '../../market-data/tradingview.service';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for GetTechnicalAnalysis.
 */
@Injectable()
export class GetTechnicalAnalysisRunner implements ToolRunner {
  readonly name = 'get_technical_analysis';

  constructor(
    @Inject(forwardRef(() => TradingViewService))
    private readonly tradingViewService: TradingViewService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      if (!args.ticker) {
        return { error: 'Missing ticker symbol. Please provide a ticker like AAPL or TASE:POALIM' };
      }
      
      const data = await this.tradingViewService.getTechnicalAnalysis(args.ticker, args.exchange);
      return data;
    } catch (e: any) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { 
        error: `Failed to fetch technical analysis from TradingView. Reason: ${e.message}. IMPORTANT: Do not retry with a different exchange. Proceed with your analysis based on fundamental knowledge or web search without technical data.` 
      };
    }
  }
}
