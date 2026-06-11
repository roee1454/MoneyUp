import { Module, forwardRef } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [forwardRef(() => MarketDataModule)],
  providers: [BrokerService],
  exports: [BrokerService],
})
/**
 * NestJS Module configuring declarations and providers for Broker.
 */
export class BrokerModule {}
