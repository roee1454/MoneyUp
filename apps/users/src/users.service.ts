import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { decrypt, encrypt } from './utils/crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    username: string;
    email: string;
    lockProfile?: boolean;
    unlockKey?: string;
  }): Promise<User> {
    const isLocked = !!data.lockProfile;
    const salt = isLocked ? randomBytes(16).toString('hex') : null;
    const hash =
      isLocked && data.unlockKey
        ? scryptSync(data.unlockKey, salt!, 64).toString('hex')
        : null;

    const user = this.userRepository.create({
      username: data.username,
      email: data.email,
      isLocked,
      unlockKeySalt: salt,
      unlockKeyHash: hash,
      openaiKeyEncrypted: null,
      claudeKeyEncrypted: null,
      geminiKeyEncrypted: null,
      preferredModel: null,
      activeAiProvider: null,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<(User & { configuredProviders: string[] }) | null> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) return null;

    const configuredProviders: string[] = [];
    if (user.openaiKeyEncrypted) configuredProviders.push('openai');
    if (user.claudeKeyEncrypted) configuredProviders.push('claude');
    if (user.geminiKeyEncrypted) configuredProviders.push('gemini');

    return { ...user, configuredProviders };
  }

  async update(
    id: string,
    data: Partial<{
      username: string;
      email: string;
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds: number;
    }>,
  ): Promise<User> {
    await this.userRepository.update(id, data);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  async deleteWithConfirmation(
    id: string,
    confirmationEmail: string,
  ): Promise<{ deleted: boolean }> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    if (user.email !== confirmationEmail) {
      throw new Error('Confirmation text does not match profile email');
    }
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  async verifyUnlockKey(
    id: string,
    unlockKey: string,
  ): Promise<{ valid: boolean }> {
    const user = await this.findOne(id);
    if (!user || !user.isLocked || !user.unlockKeyHash || !user.unlockKeySalt) {
      return { valid: false };
    }

    const derived = scryptSync(unlockKey, user.unlockKeySalt, 64).toString(
      'hex',
    );
    const left = Buffer.from(user.unlockKeyHash, 'hex');
    const right = Buffer.from(derived, 'hex');
    if (left.length !== right.length) return { valid: false };
    return { valid: timingSafeEqual(left, right) };
  }

  async saveAiConfig(
    id: string,
    data: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
      preferredModel: string;
      activeProvider?: 'openai' | 'claude' | 'gemini';
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
      };
    },
  ): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const encrypted = encrypt(data.apiKey);
    if (data.provider === 'openai') user.openaiKeyEncrypted = encrypted;
    if (data.provider === 'claude') user.claudeKeyEncrypted = encrypted;
    if (data.provider === 'gemini') user.geminiKeyEncrypted = encrypted;

    if (data.activeProvider) {
      user.activeAiProvider = data.activeProvider;
    } else if (!user.activeAiProvider) {
      user.activeAiProvider = data.provider;
    }
    
    user.preferredModel = data.preferredModel;

    if (data.config) {
      const configs = user.aiProviderConfigs || {};
      configs[data.provider] = data.config;
      user.aiProviderConfigs = configs;
    }

    return this.userRepository.save(user);
  }

  async deleteAiProvider(
    id: string,
    provider: 'openai' | 'claude' | 'gemini',
  ): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (provider === 'openai') user.openaiKeyEncrypted = null;
    if (provider === 'claude') user.claudeKeyEncrypted = null;
    if (provider === 'gemini') user.geminiKeyEncrypted = null;

    if (user.activeAiProvider === provider) {
      user.activeAiProvider = null;
    }

    if (user.aiProviderConfigs && user.aiProviderConfigs[provider]) {
      const configs = { ...user.aiProviderConfigs };
      delete configs[provider];
      user.aiProviderConfigs = configs;
    }

    return this.userRepository.save(user);
  }

  async getAiConfig(id: string): Promise<{
    activeAiProvider: 'openai' | 'claude' | 'gemini' | null;
    preferredModel: string | null;
    configuredProviders: Array<'openai' | 'claude' | 'gemini'>;
    aiProviderConfigs: Record<string, any> | null;
  }> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const configuredProviders: Array<'openai' | 'claude' | 'gemini'> = [];
    if (user.openaiKeyEncrypted) configuredProviders.push('openai');
    if (user.claudeKeyEncrypted) configuredProviders.push('claude');
    if (user.geminiKeyEncrypted) configuredProviders.push('gemini');

    return {
      activeAiProvider: (user.activeAiProvider as 'openai' | 'claude' | 'gemini' | null) ?? null,
      preferredModel: user.preferredModel,
      configuredProviders,
      aiProviderConfigs: user.aiProviderConfigs,
    };
  }

  async saveScraperSettings(
    id: string,
    data: {
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
    },
  ): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const retryCount = Number.isFinite(data.scraperTimeoutRetryCount)
      ? Math.max(0, Math.min(5, Math.floor(data.scraperTimeoutRetryCount)))
      : 1;
    const cooldownSeconds = Number.isFinite(data.scraperAutoSyncCooldownSeconds)
      ? Math.max(0, Math.min(86400, Math.floor(data.scraperAutoSyncCooldownSeconds!)))
      : 1800;

    user.scraperTimeoutRetryCount = retryCount;
    user.scraperAutoSyncCooldownSeconds = cooldownSeconds;

    if (typeof data.scraperShowBrowser === 'boolean') {
      user.scraperShowBrowser = data.scraperShowBrowser;
    }

    if (Number.isFinite(data.scraperLoginTimeoutSeconds)) {
      user.scraperLoginTimeoutSeconds = Math.max(
        10,
        Math.min(300, Math.floor(data.scraperLoginTimeoutSeconds!)),
      );
    }

    if (Number.isFinite(data.scraperDefaultTimeoutSeconds)) {
      user.scraperDefaultTimeoutSeconds = Math.max(
        10,
        Math.min(300, Math.floor(data.scraperDefaultTimeoutSeconds!)),
      );
    }

    return this.userRepository.save(user);
  }
}
