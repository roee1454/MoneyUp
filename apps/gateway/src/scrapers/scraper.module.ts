import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperSocketGateway } from './scraper-socket.gateway';

@Module({
  controllers: [ScraperController],
  providers: [ScraperSocketGateway],
})
export class ScraperModule {}
