import { Module, forwardRef } from '@nestjs/common';
import { SpendingController } from './spending.controller';
import { SpendingService } from './spending.service';
import { AiModule } from '../ai/ai.module';
import { ScraperModule } from '../scraper/scraper.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => AiModule), ScraperModule, UsersModule],
  controllers: [SpendingController],
  providers: [SpendingService],
  exports: [SpendingService],
})
/**
 * NestJS Module configuring declarations and providers for Spending.
 */
export class SpendingModule {}
