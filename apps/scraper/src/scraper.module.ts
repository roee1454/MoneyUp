import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperController } from './scraper.controller';
import { ScraperFactory } from './scraper-factory.service';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { LeumiScraper } from './scrapers/banks/leumi';
import { YahavScraper } from './scrapers/banks/yahav';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { CalScraper } from './scrapers/credit/cal';

// New Services
import { BrowserService } from './browser/browser.service';
import { SessionService } from './session/session.service';
import { CredentialsService } from './credentials/credentials.service';
import { SyncService } from './sync/sync.service';
import { CacheService } from './cache/cache.service';
import { CoverageService } from './coverage/coverage.service';
import { ScansService } from './scans/scans.service';

// Entities
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ScrapedCoverageEntity } from './entities/coverage.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    ScraperFactory,
    HapoalimScraper,
    LeumiScraper,
    YahavScraper,
    MaxScraper,
    IsracardScraper,
    CalScraper,
    // Domain Services
    BrowserService,
    SessionService,
    CredentialsService,
    SyncService,
    CacheService,
    CoverageService,
    ScansService,
  ],
  exports: [
    SyncService,
    CacheService,
    ScansService,
    BrowserService,
    CredentialsService,
  ],
})
export class ScraperModule {}
