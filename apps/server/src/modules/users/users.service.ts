import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { ConversationEntity } from '../conversations/entities/conversation.entity';
import { MessageEntity, MessageRole } from '../conversations/entities/message.entity';
import { VaultEntity } from '../accounts/entities/vault.entity';
import { ScrapedCacheEntity } from '../accounts/entities/cache.entity';
import { ScrapedCoverageEntity } from '../accounts/entities/coverage.entity';
import { TransactionEntity } from '../accounts/entities/transaction.entity';
import { randomBytes, scryptSync } from 'crypto';
import { AgentProvider } from '@money-up/common';
import { AiSettingsService } from '../settings/services/ai-settings.service';
import { ScraperSettingsService } from '../settings/services/scraper-settings.service';
import { AccountSettingsService } from '../settings/services/account-settings.service';

/**
 * Service managing user profiles, configurations, and chat session histories.
 * Handles credential encryption, lock/unlock keys via scrypt and AI provider details.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
    @InjectRepository(ScrapedCoverageEntity)
    private readonly coverageRepository: Repository<ScrapedCoverageEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    private readonly aiSettings: AiSettingsService,
    private readonly scraperSettings: ScraperSettingsService,
    private readonly accountSettings: AccountSettingsService,
  ) {}

  /**
   * Creates a new user profile with optional security locking.
   * Checks for duplicate usernames.
   */
  async create(data: {
    username: string;
    lockProfile?: boolean;
    unlockKey?: string;
  }): Promise<User> {
    const existingUsername = await this.userRepository.findOneBy({
      username: data.username,
    });
    if (existingUsername) {
      throw new Error('שם משתמש זה כבר תפוס');
    }

    if (
      data.lockProfile &&
      (!data.unlockKey || data.unlockKey.trim().length < 4)
    ) {
      throw new Error('יש לספק קוד פתיחה בן 4 תווים לפחות לנעילת הפרופיל');
    }

    const isLocked = !!data.lockProfile;
    const salt = isLocked ? randomBytes(16).toString('hex') : null;
    const hash =
      isLocked && data.unlockKey
        ? scryptSync(data.unlockKey, salt!, 64).toString('hex')
        : null;

    const user = this.userRepository.create({
      username: data.username,
    });
    const savedUser = await this.userRepository.save(user);

    // Save account lock settings
    await this.accountSettings.updateLockSettings(savedUser.id, isLocked, hash, salt);

    return {
      ...savedUser,
      isLocked,
    } as any;
  }

  /**
   * Fetches all registered users from the database.
   */
  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find();
    return Promise.all(
      users.map(async (user) => {
        const account = await this.accountSettings.getOrCreate(user.id);
        return {
          ...user,
          isLocked: account.isLocked,
        } as any;
      }),
    );
  }

  /**
   * Finds a single user by ID and decorates it with settings from separate tables.
   */
  async findOne(
    id: string,
  ): Promise<(User & Record<string, any>) | null> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) return null;

    const [ai, scraper, account] = await Promise.all([
      this.aiSettings.getOrCreate(id),
      this.scraperSettings.getOrCreate(id),
      this.accountSettings.getOrCreate(id),
    ]);

    const configuredProviders: string[] = [];
    if (ai.openaiKeyEncrypted) configuredProviders.push('openai');
    if (ai.claudeKeyEncrypted) configuredProviders.push('claude');
    if (ai.geminiKeyEncrypted) configuredProviders.push('gemini');
    if (ai.ollamaKeyEncrypted) configuredProviders.push('ollama');

    return {
      ...user,
      isLocked: account.isLocked,
      activeAiProvider: ai.activeAiProvider,
      preferredModel: ai.preferredModel,
      configuredProviders,
      aiProviderConfigs: ai.aiProviderConfigs,
      scraperTimeoutRetryCount: scraper.scraperTimeoutRetryCount,
      scraperAutoSyncCooldownSeconds: scraper.scraperAutoSyncCooldownSeconds,
      scraperShowBrowser: scraper.scraperShowBrowser,
      scraperLoginTimeoutSeconds: scraper.scraperLoginTimeoutSeconds,
      scraperDefaultTimeoutSeconds: scraper.scraperDefaultTimeoutSeconds,
      scraperChromiumPath: scraper.scraperChromiumPath,
      initialLandingPage: account.initialLandingPage,
      accentColor: account.accentColor,
      defaultCurrency: account.defaultCurrency,
      sessionTimeoutMinutes: account.sessionTimeoutMinutes,
    };
  }

  /**
   * Updates partial metadata fields on the user profile.
   */
  async update(
    id: string,
    data: Partial<{
      username: string;
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds: number;
    }>,
  ): Promise<User> {
    if (data.username !== undefined) {
      await this.userRepository.update(id, { username: data.username });
    }
    if (data.scraperTimeoutRetryCount !== undefined || data.scraperAutoSyncCooldownSeconds !== undefined) {
      await this.scraperSettings.saveScraperSettings(id, {
        scraperTimeoutRetryCount: data.scraperTimeoutRetryCount!,
        scraperAutoSyncCooldownSeconds: data.scraperAutoSyncCooldownSeconds,
      });
    }
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  /**
   * Deletes a user by ID.
   */
  async remove(id: string): Promise<{ deleted: boolean }> {
    // 1. Delete all messages for user conversations
    const userConversations = await this.conversationRepository.find({
      where: { userId: id },
      select: ['id'],
    });
    const conversationIds = userConversations.map((c) => c.id);
    if (conversationIds.length > 0) {
      await this.messageRepository.delete({ conversationId: In(conversationIds) });
      await this.conversationRepository.delete({ id: In(conversationIds) });
    }

    // 2. Delete all scraper credentials and data
    await this.vaultRepository.delete({ userId: id });
    await this.cacheRepository.delete({ userId: id });
    await this.coverageRepository.delete({ userId: id });
    await this.transactionRepository.delete({ userId: id });

    // 3. Delete user settings
    await this.aiSettings.deleteForUser(id);
    await this.scraperSettings.deleteForUser(id);
    await this.accountSettings.deleteForUser(id);

    // 4. Delete user profile
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  /**
   * Deletes a user profile with user ID validation protection.
   */
  async deleteWithConfirmation(
    id: string,
    confirmationUserId: string,
  ): Promise<{ deleted: boolean }> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    if (user.id !== confirmationUserId) {
      throw new Error('Confirmation text does not match profile ID');
    }

    // 1. Delete all messages for user conversations
    const userConversations = await this.conversationRepository.find({
      where: { userId: id },
      select: ['id'],
    });
    const conversationIds = userConversations.map((c) => c.id);
    if (conversationIds.length > 0) {
      await this.messageRepository.delete({ conversationId: In(conversationIds) });
      await this.conversationRepository.delete({ id: In(conversationIds) });
    }

    // 2. Delete all scraper credentials and data
    await this.vaultRepository.delete({ userId: id });
    await this.cacheRepository.delete({ userId: id });
    await this.coverageRepository.delete({ userId: id });
    await this.transactionRepository.delete({ userId: id });

    // 3. Delete user settings
    await this.aiSettings.deleteForUser(id);
    await this.scraperSettings.deleteForUser(id);
    await this.accountSettings.deleteForUser(id);

    // 4. Delete user profile
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  /**
   * Verifies the user unlock key (passcode) using timing-safe scrypt validation.
   */
  async verifyUnlockKey(
    id: string,
    unlockKey: string,
  ): Promise<{ valid: boolean }> {
    return this.accountSettings.verifyUnlockKey(id, unlockKey);
  }

  /**
   * Saves or updates an AI configuration block for the user.
   */
  async saveAiConfig(
    id: string,
    data: {
      provider: AgentProvider;
      apiKey: string;
      preferredModel: string;
      activeProvider?: AgentProvider;
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        forceMarkdown?: boolean;
      };
    },
  ): Promise<User> {
    await this.aiSettings.saveAiConfig(id, data);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * Deletes the configured AI provider credentials and keys for a user.
   */
  async deleteAiProvider(
    id: string,
    provider: AgentProvider,
  ): Promise<User> {
    await this.aiSettings.deleteAiProvider(id, provider);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * Retrieves the decrypted AI configurations and API keys for a user.
   */
  async getAiConfig(id: string): Promise<{
    activeAiProvider: AgentProvider | null;
    preferredModel: string | null;
    configuredProviders: Array<AgentProvider>;
    aiProviderConfigs: Record<string, any> | null;
    forceMarkdown: boolean;
    decryptedApiKey: string | null;
    decryptedApiKeys: Record<string, string | null>;
  }> {
    return this.aiSettings.getAiConfig(id);
  }

  /**
   * Toggles the force markdown flag inside user AI settings.
   */
  async updateAiSettings(id: string, forceMarkdown: boolean): Promise<User> {
    await this.aiSettings.updateAiSettings(id, forceMarkdown);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * Saves scraper operational configurations for the user.
   */
  async saveScraperSettings(
    id: string,
    data: {
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
      scraperChromiumPath?: string;
    },
  ): Promise<User> {
    await this.scraperSettings.saveScraperSettings(id, data);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  /**
   * Saves general preferences settings (landing page, accent color, currency preference, inactivity auto-logout timeout)
   * and optionally updates username.
   */
  async saveGeneralSettings(
    id: string,
    data: {
      username?: string;
      initialLandingPage?: string;
      accentColor?: string;
      defaultCurrency?: string;
      sessionTimeoutMinutes?: number;
    },
  ): Promise<any> {
    if (data.username !== undefined && data.username.trim() !== '') {
      const normalized = data.username.trim();
      const existing = await this.userRepository.findOneBy({ username: normalized });
      if (existing && existing.id !== id) {
        throw new Error('שם משתמש זה כבר תפוס');
      }
      await this.userRepository.update(id, { username: normalized });
    }
    await this.accountSettings.updateGeneralSettings(id, data);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async enableProfileLock(id: string, unlockKey: string): Promise<any> {
    await this.accountSettings.enableUnlockKey(id, unlockKey);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async disableProfileLock(id: string, unlockKey: string): Promise<any> {
    await this.accountSettings.disableUnlockKey(id, unlockKey);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async updateProfileUnlockKey(id: string, oldUnlockKey: string, newUnlockKey: string): Promise<any> {
    await this.accountSettings.updateUnlockKey(id, oldUnlockKey, newUnlockKey);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
