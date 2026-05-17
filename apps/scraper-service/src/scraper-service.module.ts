import { Module } from '@nestjs/common';
import { ScraperServiceController } from './scraper-service.controller';
import { ScraperServiceService } from './scraper-service.service';

@Module({
  imports: [],
  controllers: [ScraperServiceController],
  providers: [ScraperServiceService],
})
export class ScraperServiceModule {}
