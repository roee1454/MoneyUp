import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountSettingsEntity } from '../entities/account-settings.entity';
import { scryptSync, timingSafeEqual } from 'crypto';

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

  async deleteForUser(userId: string): Promise<void> {
    await this.accountSettingsRepository.delete({ userId });
  }
}
