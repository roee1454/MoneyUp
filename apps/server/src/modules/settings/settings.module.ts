import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSettingsEntity } from './entities/ai-settings.entity';
import { ScraperSettingsEntity } from './entities/scraper-settings.entity';
import { AccountSettingsEntity } from './entities/account-settings.entity';
import { AiSettingsService } from './services/ai-settings.service';
import { ScraperSettingsService } from './services/scraper-settings.service';
import { AccountSettingsService } from './services/account-settings.service';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiSettingsEntity,
      ScraperSettingsEntity,
      AccountSettingsEntity,
    ]),
  ],
  providers: [
    AiSettingsService,
    ScraperSettingsService,
    AccountSettingsService,
    SettingsService,
  ],
  exports: [
    AiSettingsService,
    ScraperSettingsService,
    AccountSettingsService,
    SettingsService,
  ],
})
export class SettingsModule {}
