import { Module } from '@nestjs/common';
import { SpendingController } from './spending.controller';
import { SpendingService } from './spending.service';
import { AiModule } from '../ai/ai.module';
import { ScraperModule } from '../scraper/scraper.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AiModule, ScraperModule, UsersModule],
  controllers: [SpendingController],
  providers: [SpendingService],
})
export class SpendingModule {}
