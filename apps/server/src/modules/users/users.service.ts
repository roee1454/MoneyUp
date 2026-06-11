import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity, MessageRole } from './entities/message.entity';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { encryptUserConfig as encrypt, decryptUserConfig as decrypt } from '../../utils/crypto.utils';
import { AgentProvider } from '@money-up/common';

/**
 * Service managing user profiles, configurations, and chat session histories.
 * Handles credential encryption, lock/unlock keys via scrypt, AI provider details,
 * and database storage for conversations and message logs.
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
  ) {}

  /**
   * Creates a new user profile with optional security locking.
   * Checks for duplicate usernames and emails.
   *
   * @param data Details including username, email, optional lock profile settings, and unlockKey passcode.
   * @returns Promise<User> The created user entity.
   * @throws Error if email or username is already taken, or if passcode requirements are not met.
   */
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

  /**
   * Fetches all registered users from the database.
   *
   * @returns Promise<User[]> Array of user entities.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Finds a single user by ID and calculates their configured AI providers.
   *
   * @param id The user ID to retrieve.
   * @returns Promise<User & { configuredProviders: string[] }> The user details with configured provider flags, or null if not found.
   */
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

  /**
   * Updates partial metadata fields on the user profile.
   *
   * @param id User ID to update.
   * @param data Configuration overrides (e.g., scraper retry limits, cooldown).
   * @returns Promise<User> The updated user entity.
   * @throws NotFoundException if user is not found.
   */
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

  /**
   * Deletes a user by ID.
   *
   * @param id User ID to remove.
   * @returns Promise<{ deleted: boolean }>
   */
  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  /**
   * Deletes a user profile with email validation protection.
   *
   * @param id User ID to delete.
   * @param confirmationEmail Confirmation text representing the user email.
   * @returns Promise<{ deleted: boolean }>
   * @throws NotFoundException if user is not found, or Error if email confirmation mismatch.
   */
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

  /**
   * Verifies the user unlock key (passcode) using timing-safe scrypt validation.
   *
   * @param id User ID.
   * @param unlockKey Raw passcode string to test.
   * @returns Promise<{ valid: boolean }>
   */
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

  /**
   * Saves or updates an AI configuration block for the user.
   * Automatically encrypts the API key before DB storage.
   *
   * @param id User ID.
   * @param data Provider details, api keys, and preset configurations.
   * @returns Promise<User> The updated user entity.
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

  /**
   * Deletes the configured AI provider credentials and keys for a user.
   *
   * @param id User ID.
   * @param provider The target AI provider to wipe.
   * @returns Promise<User> The updated user entity.
   */
  async deleteAiProvider(
    id: string,
    provider: AgentProvider,
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

  /**
   * Retrieves the decrypted AI configurations and API keys for a user.
   * Wipes temporary or dummy keys ('***') from display results.
   *
   * @param id User ID.
   * @returns AI configurations, preferred model name, active provider, and decrypted API keys dictionary.
   * @throws NotFoundException if user is not found.
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
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const configuredProviders: Array<AgentProvider> = [];
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
        (user.activeAiProvider as AgentProvider | null) ??
        null,
      preferredModel: user.preferredModel,
      configuredProviders,
      aiProviderConfigs: user.aiProviderConfigs,
      forceMarkdown: user.aiProviderConfigs?.forceMarkdown !== false,
      decryptedApiKey,
      decryptedApiKeys,
    };
  }

  /**
   * Toggles the force markdown flag inside user AI settings.
   *
   * @param id User ID.
   * @param forceMarkdown Set true to mandate markdown response format.
   * @returns Promise<User> The updated user entity.
   */
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

  /**
   * Saves scraper operational configurations for the user.
   * Imposes safe min/max bounds on retry counts and cooldown ranges.
   *
   * @param id User ID.
   * @param data Retry limits, auto sync cooldown periods, and timeout parameters.
   * @returns Promise<User> The updated user entity.
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

  /**
   * Fetches all chat conversations belonging to a user, sorted by update date descending.
   *
   * @param userId User ID.
   * @returns Promise<ConversationEntity[]> List of conversations.
   */
  async getConversations(userId: string): Promise<ConversationEntity[]> {
    return this.conversationRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single conversation metadata along with its chronological messages list.
   *
   * @param userId User ID.
   * @param conversationId Target conversation ID.
   * @returns Promise with conversation details and messages.
   * @throws NotFoundException if the conversation does not exist or belong to the user.
   */
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

  /**
   * Creates a new chat conversation session.
   *
   * @param userId Target user ID.
   * @param title Title of the conversation.
   * @returns Promise<ConversationEntity>
   */
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

  /**
   * Appends a new message log to a conversation session and updates the conversation's updatedAt timestamp.
   *
   * @param userId The ID of the conversation owner.
   * @param conversationId Target conversation ID.
   * @param role The message sender role ('system', 'user', 'assistant', 'tool').
   * @param content Message text contents.
   * @param tool_calls Optional array of tool calls generated by the model.
   * @param tool_call_id Optional tool call reference identifier.
   * @returns Promise<MessageEntity> The persisted message log entity.
   */
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

  /**
   * Deletes a conversation session along with all its associated message records.
   *
   * @param userId Target user ID.
   * @param conversationId Conversation ID to remove.
   * @returns Promise<{ success: boolean }>
   */
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

  /**
   * Truncates a conversation session history by deleting a target message and all subsequent messages.
   * Useful for rewinding conversation flow.
   *
   * @param userId User ID.
   * @param conversationId Target conversation ID.
   * @param messageId The ID of the message to truncate from.
   * @returns Promise<{ success: boolean }>
   */
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
