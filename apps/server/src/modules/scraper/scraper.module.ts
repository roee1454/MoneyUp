import { Module, forwardRef } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperFactory } from './scraper-factory.service';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { LeumiScraper } from './scrapers/banks/leumi';
import { YahavScraper } from './scrapers/banks/yahav';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { CalScraper } from './scrapers/credit/cal';

// Local Services
import { SessionService } from './session/session.service';
import { SyncService } from './sync/sync.service';

// API/WS controllers and Gateways
import { ScraperController } from './scraper.controller';
import { ScraperSocketGateway } from './scraper-socket.gateway';

// Imported Modules
import { UsersModule } from '../users/users.module';
import { ChromiumModule } from '../chromium/chromium.module';
import { AccountsModule } from '../accounts/accounts.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    ChromiumModule,
    forwardRef(() => AccountsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => SettingsModule),
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
    SessionService,
    SyncService,
    ScraperSocketGateway,
  ],
  exports: [
    ScraperService,
    SyncService,
    SessionService,
    ScraperFactory,
  ],
})
export class ScraperModule {}
