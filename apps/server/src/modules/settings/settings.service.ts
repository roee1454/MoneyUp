import { Injectable } from '@nestjs/common';
import { AiSettingsService } from './services/ai-settings.service';
import { ScraperSettingsService } from './services/scraper-settings.service';
import { AccountSettingsService } from './services/account-settings.service';
import { AgentProvider } from '@money-up/common';

@Injectable()
export class SettingsService {
  constructor(
    public readonly ai: AiSettingsService,
    public readonly scraper: ScraperSettingsService,
    public readonly account: AccountSettingsService,
  ) {}

  async deleteForUser(userId: string): Promise<void> {
    await this.ai.deleteForUser(userId);
    await this.scraper.deleteForUser(userId);
    await this.account.deleteForUser(userId);
  }
}
