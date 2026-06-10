import { Module, forwardRef } from '@nestjs/common';
import { TradingViewService } from './tradingview.service';
import { MarketDataController } from './market-data.controller';
import { BrokerModule } from '../broker/broker.module';

@Module({
  imports: [forwardRef(() => BrokerModule)],
  controllers: [MarketDataController],
  providers: [TradingViewService],
  exports: [TradingViewService],
})
export class MarketDataModule {}
