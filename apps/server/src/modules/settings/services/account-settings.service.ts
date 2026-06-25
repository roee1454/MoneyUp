import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountSettingsEntity } from '../entities/account-settings.entity';
import { scryptSync, timingSafeEqual, randomBytes } from 'crypto';

@Injectable()
export class AccountSettingsService {
  constructor(
    @InjectRepository(AccountSettingsEntity)
    private readonly accountSettingsRepository: Repository<AccountSettingsEntity>,
  ) {}

  async getOrCreate(userId: string): Promise<AccountSettingsEntity> {
    let settings = await this.accountSettingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.accountSettingsRepository.create({
        userId,
        isLocked: false,
        unlockKeyHash: null,
        unlockKeySalt: null,
      });
      settings = await this.accountSettingsRepository.save(settings);
    }
    return settings;
  }

  async verifyUnlockKey(
    userId: string,
    unlockKey: string,
  ): Promise<{ valid: boolean }> {
    const settings = await this.getOrCreate(userId);
    if (!settings.isLocked || !settings.unlockKeyHash || !settings.unlockKeySalt) {
      return { valid: false };
    }

    const derived = scryptSync(unlockKey, settings.unlockKeySalt, 64).toString(
      'hex',
    );
    const left = Buffer.from(settings.unlockKeyHash, 'hex');
    const right = Buffer.from(derived, 'hex');
    if (left.length !== right.length) return { valid: false };
    return { valid: timingSafeEqual(left, right) };
  }

  async updateLockSettings(
    userId: string,
    isLocked: boolean,
    unlockKeyHash: string | null,
    unlockKeySalt: string | null,
  ): Promise<AccountSettingsEntity> {
    const settings = await this.getOrCreate(userId);
    settings.isLocked = isLocked;
    settings.unlockKeyHash = unlockKeyHash;
    settings.unlockKeySalt = unlockKeySalt;
    return this.accountSettingsRepository.save(settings);
  }

  async updateGeneralSettings(
    userId: string,
    data: Partial<{
      initialLandingPage: string;
      accentColor: string;
      defaultCurrency: string;
      sessionTimeoutMinutes: number;
    }>,
  ): Promise<AccountSettingsEntity> {
    const settings = await this.getOrCreate(userId);
    if (data.initialLandingPage !== undefined) {
      settings.initialLandingPage = data.initialLandingPage;
    }
    if (data.accentColor !== undefined) {
      settings.accentColor = data.accentColor;
    }
    if (data.defaultCurrency !== undefined) {
      settings.defaultCurrency = data.defaultCurrency;
    }
    if (data.sessionTimeoutMinutes !== undefined) {
      settings.sessionTimeoutMinutes = data.sessionTimeoutMinutes;
    }
    return this.accountSettingsRepository.save(settings);
  }

  async enableUnlockKey(userId: string, unlockKey: string): Promise<AccountSettingsEntity> {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(unlockKey, salt, 64).toString('hex');
    return this.updateLockSettings(userId, true, hash, salt);
  }

  async disableUnlockKey(userId: string, unlockKey: string): Promise<AccountSettingsEntity> {
    const verified = await this.verifyUnlockKey(userId, unlockKey);
    if (!verified.valid) {
      throw new Error('קוד פתיחה שגוי');
    }
    return this.updateLockSettings(userId, false, null, null);
  }

  async updateUnlockKey(
    userId: string,
    oldUnlockKey: string,
    newUnlockKey: string,
  ): Promise<AccountSettingsEntity> {
    const verified = await this.verifyUnlockKey(userId, oldUnlockKey);
    if (!verified.valid) {
      throw new Error('קוד פתיחה ישן שגוי');
    }
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(newUnlockKey, salt, 64).toString('hex');
    return this.updateLockSettings(userId, true, hash, salt);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.accountSettingsRepository.delete({ userId });
  }
}
