import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperService } from './scraper.service';
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

// API/WS controllers
import { UsersModule } from '../users/users.module';
import { ScraperController } from './scraper.controller';
import { ScraperSocketGateway } from './scraper-socket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VaultEntity,
      ScrapedCacheEntity,
      MerchantAnnotationEntity,
      TransactionEntity,
      ScrapedCoverageEntity,
    ]),
    UsersModule,
  ],
  controllers: [ScraperController],
  providers: [
    ScraperService,
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
    ScraperSocketGateway,
  ],
  exports: [
    ScraperService,
    SyncService,
    CacheService,
    ScansService,
    BrowserService,
    CredentialsService,
    SessionService,
    CoverageService,
    ScraperFactory,
  ],
})
export class ScraperModule {}
