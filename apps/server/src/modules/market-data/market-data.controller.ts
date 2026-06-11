import { Controller, Get, Inject, forwardRef } from '@nestjs/common';
import { BrokerService } from '../broker/broker.service';

/**
 * NestJS Controller handling incoming HTTP requests for MarketData.
 */
@Controller('market-data')
export class MarketDataController {
  constructor(
    @Inject(forwardRef(() => BrokerService))
    private readonly brokerService: BrokerService
  ) {}

  @Get('portfolio')
  async getPortfolio() {
    // Pass a dummy user ID for now, since auth is currently bypassed for this route
    return this.brokerService.getPortfolio('dummy-user');
  }
}
