import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { BrowserManagerService } from './browser-manager.service';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { CalScraper } from './scrapers/credit/cal';
import { ScraperFactory } from './scraper-factory.service';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ScrapedCoverageEntity } from './entities/coverage.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/vault.db',
      entities: [
        VaultEntity,
        ScrapedCacheEntity,
        MerchantAnnotationEntity,
        TransactionEntity,
        ScrapedCoverageEntity,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      VaultEntity,
      ScrapedCacheEntity,
      MerchantAnnotationEntity,
      TransactionEntity,
      ScrapedCoverageEntity,
    ]),
  ],
  controllers: [ScraperController],
  providers: [
    BrowserManagerService,
    ScraperService,
    HapoalimScraper,
    MaxScraper,
    IsracardScraper,
    CalScraper,
    ScraperFactory,
  ],
})
export class ScraperModule {}
