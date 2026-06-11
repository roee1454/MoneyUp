import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { BrokerService } from '../../broker/broker.service';
import { ToolRunner, ToolRegistry } from './tool-registry';

/**
 * AI Tool Runner executing tasks for GetPortfolio.
 */
@Injectable()
export class GetPortfolioRunner implements ToolRunner {
  readonly name = 'get_portfolio';

  constructor(
    @Inject(forwardRef(() => BrokerService))
    private readonly brokerService: BrokerService,
    private readonly registry: ToolRegistry,
  ) {
    this.registry.register(this);
  }

  async execute(userId: string, args: any): Promise<any> {
    try {
      const portfolio = await this.brokerService.getPortfolio(userId);
      return portfolio;
    } catch (e) {
      console.error(`Tool ${this.name} execution failed`, e);
      return { error: 'Failed to fetch portfolio data from broker.' };
    }
  }
}
