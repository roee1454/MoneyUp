import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity, MessageRole } from './entities/message.entity';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { decrypt, encrypt } from './utils/crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async create(data: {
    username: string;
    email: string;
    lockProfile?: boolean;
    unlockKey?: string;
  }): Promise<User> {
    const existingEmail = await this.userRepository.findOneBy({
      email: data.email,
    });
    if (existingEmail) {
      throw new Error('אימייל זה כבר רשום במערכת');
    }

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
      email: data.email,
      isLocked,
      unlockKeySalt: salt,
      unlockKeyHash: hash,
      openaiKeyEncrypted: null,
      claudeKeyEncrypted: null,
      geminiKeyEncrypted: null,
      ollamaKeyEncrypted: null,
      openrouterKeyEncrypted: null,
      preferredModel: null,
      activeAiProvider: null,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(
    id: string,
  ): Promise<(User & { configuredProviders: string[] }) | null> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) return null;

    const configuredProviders: string[] = [];
    if (user.openaiKeyEncrypted) configuredProviders.push('openai');
    if (user.claudeKeyEncrypted) configuredProviders.push('claude');
    if (user.geminiKeyEncrypted) configuredProviders.push('gemini');
    if (user.ollamaKeyEncrypted) configuredProviders.push('ollama');
    if (user.openrouterKeyEncrypted) configuredProviders.push('openrouter');

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
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey: string;
      preferredModel: string;
      activeProvider?: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
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
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.apiKey && data.apiKey !== '***') {
      const encrypted = encrypt(data.apiKey);
      if (data.provider === 'openai') user.openaiKeyEncrypted = encrypted;
      if (data.provider === 'claude') user.claudeKeyEncrypted = encrypted;
      if (data.provider === 'gemini') user.geminiKeyEncrypted = encrypted;
      if (data.provider === 'ollama') user.ollamaKeyEncrypted = encrypted;
      if (data.provider === 'openrouter') user.openrouterKeyEncrypted = encrypted;
    }

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
    provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter',
  ): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (provider === 'openai') user.openaiKeyEncrypted = null;
    if (provider === 'claude') user.claudeKeyEncrypted = null;
    if (provider === 'gemini') user.geminiKeyEncrypted = null;
    if (provider === 'ollama') user.ollamaKeyEncrypted = null;
    if (provider === 'openrouter') user.openrouterKeyEncrypted = null;

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
    activeAiProvider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter' | null;
    preferredModel: string | null;
    configuredProviders: Array<'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'>;
    aiProviderConfigs: Record<string, any> | null;
    forceMarkdown: boolean;
    decryptedApiKey: string | null;
    decryptedApiKeys: Record<string, string | null>;
  }> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const configuredProviders: Array<'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'> = [];
    const decryptedApiKeys: Record<string, string | null> = {};
    let decryptedApiKey: string | null = null;

    if (user.openaiKeyEncrypted) {
      configuredProviders.push('openai');
      decryptedApiKeys.openai = decrypt(user.openaiKeyEncrypted);
      if (user.activeAiProvider === 'openai') {
        decryptedApiKey = decryptedApiKeys.openai;
      }
    }
    if (user.claudeKeyEncrypted) {
      configuredProviders.push('claude');
      decryptedApiKeys.claude = decrypt(user.claudeKeyEncrypted);
      if (user.activeAiProvider === 'claude') {
        decryptedApiKey = decryptedApiKeys.claude;
      }
    }
    if (user.geminiKeyEncrypted) {
      configuredProviders.push('gemini');
      decryptedApiKeys.gemini = decrypt(user.geminiKeyEncrypted);
      if (user.activeAiProvider === 'gemini') {
        decryptedApiKey = decryptedApiKeys.gemini;
      }
    }
    if (user.ollamaKeyEncrypted) {
      configuredProviders.push('ollama');
      decryptedApiKeys.ollama = decrypt(user.ollamaKeyEncrypted);
      if (user.activeAiProvider === 'ollama') {
        decryptedApiKey = decryptedApiKeys.ollama;
      }
    }
    if (user.openrouterKeyEncrypted) {
      configuredProviders.push('openrouter');
      decryptedApiKeys.openrouter = decrypt(user.openrouterKeyEncrypted);
      if (user.activeAiProvider === 'openrouter') {
        decryptedApiKey = decryptedApiKeys.openrouter;
      }
    }

    if (decryptedApiKey === '***') {
      decryptedApiKey = null;
    }

    // Strip placeholder values
    for (const key in decryptedApiKeys) {
      if (decryptedApiKeys[key] === '***') {
        decryptedApiKeys[key] = null;
      }
    }

    return {
      activeAiProvider:
        (user.activeAiProvider as 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter' | null) ??
        null,
      preferredModel: user.preferredModel,
      configuredProviders,
      aiProviderConfigs: user.aiProviderConfigs,
      forceMarkdown: user.aiProviderConfigs?.forceMarkdown !== false,
      decryptedApiKey,
      decryptedApiKeys,
    };
  }

  async updateAiSettings(id: string, forceMarkdown: boolean): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const configs = user.aiProviderConfigs || {};
    configs.forceMarkdown = forceMarkdown;
    user.aiProviderConfigs = configs;

    return this.userRepository.save(user);
  }

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
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const retryCount = Number.isFinite(data.scraperTimeoutRetryCount)
      ? Math.max(0, Math.min(5, Math.floor(data.scraperTimeoutRetryCount)))
      : 1;
    const cooldownSeconds = Number.isFinite(data.scraperAutoSyncCooldownSeconds)
      ? Math.max(
          0,
          Math.min(86400, Math.floor(data.scraperAutoSyncCooldownSeconds!)),
        )
      : 1800;

    user.scraperTimeoutRetryCount = retryCount;
    user.scraperAutoSyncCooldownSeconds = cooldownSeconds;

    if (typeof data.scraperShowBrowser === 'boolean') {
      user.scraperShowBrowser = data.scraperShowBrowser;
    }

    if (data.scraperChromiumPath !== undefined) {
      user.scraperChromiumPath = data.scraperChromiumPath;
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

  // AI Conversation Management
  async getConversations(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ conversation: ConversationEntity; messages: MessageEntity[] }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
    return { conversation, messages };
  }

  async createConversation(
    userId: string,
    title: string,
  ): Promise<ConversationEntity> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const conversation = this.conversationRepository.create({
      userId,
      title,
    });
    return this.conversationRepository.save(conversation);
  }

  async addMessage(
    userId: string,
    conversationId: string,
    role: MessageRole,
    content: string,
    tool_calls?: any[],
    tool_call_id?: string,
  ): Promise<MessageEntity> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = this.messageRepository.create({
      conversationId,
      role,
      content,
      tool_calls: tool_calls ?? null,
      tool_call_id: tool_call_id ?? null,
    });
    await this.messageRepository.save(message);

    conversation.updatedAt = new Date();
    await this.conversationRepository.save(conversation);

    return message;
  }

  async deleteConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.messageRepository.delete({ conversationId });
    await this.conversationRepository.delete({ id: conversationId });

    return { success: true };
  }

  async truncateConversationAtMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const targetMessage = await this.messageRepository.findOne({
      where: { id: messageId, conversationId },
    });
    if (!targetMessage) {
      throw new NotFoundException('Message not found');
    }

    // Delete the target message and all subsequent messages
    await this.messageRepository
      .createQueryBuilder()
      .delete()
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('"createdAt" >= :createdAt', { createdAt: targetMessage.createdAt })
      .execute();

    return { success: true };
  }
}
