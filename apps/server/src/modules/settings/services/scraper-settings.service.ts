import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScraperSettingsEntity } from '../entities/scraper-settings.entity';

@Injectable()
export class ScraperSettingsService {
  constructor(
    @InjectRepository(ScraperSettingsEntity)
    private readonly scraperSettingsRepository: Repository<ScraperSettingsEntity>,
  ) {}

  async getOrCreate(userId: string): Promise<ScraperSettingsEntity> {
    let settings = await this.scraperSettingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.scraperSettingsRepository.create({
        userId,
        scraperTimeoutRetryCount: 1,
        scraperAutoSyncCooldownSeconds: 1800,
        scraperShowBrowser: false,
        scraperLoginTimeoutSeconds: 90,
        scraperDefaultTimeoutSeconds: 90,
        scraperChromiumPath: null,
      });
      settings = await this.scraperSettingsRepository.save(settings);
    }
    return settings;
  }

  async saveScraperSettings(
    userId: string,
    data: {
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
      scraperChromiumPath?: string | null;
    },
  ): Promise<ScraperSettingsEntity> {
    const settings = await this.getOrCreate(userId);

    const retryCount = Number.isFinite(data.scraperTimeoutRetryCount)
      ? Math.max(0, Math.min(5, Math.floor(data.scraperTimeoutRetryCount)))
      : settings.scraperTimeoutRetryCount;
    const cooldownSeconds = Number.isFinite(data.scraperAutoSyncCooldownSeconds)
      ? Math.max(
          0,
          Math.min(86400, Math.floor(data.scraperAutoSyncCooldownSeconds!)),
        )
      : settings.scraperAutoSyncCooldownSeconds;

    settings.scraperTimeoutRetryCount = retryCount;
    settings.scraperAutoSyncCooldownSeconds = cooldownSeconds;

    if (typeof data.scraperShowBrowser === 'boolean') {
      settings.scraperShowBrowser = data.scraperShowBrowser;
    }

    if (data.scraperChromiumPath !== undefined) {
      settings.scraperChromiumPath = data.scraperChromiumPath;
    }

    if (Number.isFinite(data.scraperLoginTimeoutSeconds)) {
      settings.scraperLoginTimeoutSeconds = Math.max(
        10,
        Math.min(300, Math.floor(data.scraperLoginTimeoutSeconds!)),
      );
    }

    if (Number.isFinite(data.scraperDefaultTimeoutSeconds)) {
      settings.scraperDefaultTimeoutSeconds = Math.max(
        10,
        Math.min(300, Math.floor(data.scraperDefaultTimeoutSeconds!)),
      );
    }

    return this.scraperSettingsRepository.save(settings);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.scraperSettingsRepository.delete({ userId });
  }
}
