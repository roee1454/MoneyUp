import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { ScraperFactory } from './scraper-factory.service';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/vault.db',
      entities: [VaultEntity, ScrapedCacheEntity, MerchantAnnotationEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([VaultEntity, ScrapedCacheEntity, MerchantAnnotationEntity]),
  ],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    HapoalimScraper,
    MaxScraper,
    IsracardScraper,
    ScraperFactory,
  ],
})
export class ScraperModule { }
