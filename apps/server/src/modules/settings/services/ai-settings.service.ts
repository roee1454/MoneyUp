import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSettingsEntity } from '../entities/ai-settings.entity';
import { AgentProvider } from '@money-up/common';
import { encryptUserConfig as encrypt, decryptUserConfig as decrypt } from '../../../utils/crypto.utils';

@Injectable()
export class AiSettingsService {
  constructor(
    @InjectRepository(AiSettingsEntity)
    private readonly aiSettingsRepository: Repository<AiSettingsEntity>,
  ) {}

  async getOrCreate(userId: string): Promise<AiSettingsEntity> {
    let settings = await this.aiSettingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = this.aiSettingsRepository.create({
        userId,
        openaiKeyEncrypted: null,
        claudeKeyEncrypted: null,
        geminiKeyEncrypted: null,
        ollamaKeyEncrypted: null,
        preferredModel: null,
        activeAiProvider: null,
        aiProviderConfigs: null,
      });
      settings = await this.aiSettingsRepository.save(settings);
    }
    return settings;
  }

  async saveAiConfig(
    userId: string,
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
  ): Promise<AiSettingsEntity> {
    const settings = await this.getOrCreate(userId);

    if (data.apiKey && data.apiKey !== '***') {
      const encrypted = encrypt(data.apiKey);
      if (data.provider === 'openai') settings.openaiKeyEncrypted = encrypted;
      if (data.provider === 'claude') settings.claudeKeyEncrypted = encrypted;
      if (data.provider === 'gemini') settings.geminiKeyEncrypted = encrypted;
      if (data.provider === 'ollama') settings.ollamaKeyEncrypted = encrypted;
    }

    if (data.activeProvider) {
      settings.activeAiProvider = data.activeProvider;
    } else if (!settings.activeAiProvider) {
      settings.activeAiProvider = data.provider;
    }

    settings.preferredModel = data.preferredModel;

    if (data.config) {
      const configs = settings.aiProviderConfigs || {};
      configs[data.provider] = data.config;
      settings.aiProviderConfigs = configs;
    }

    return this.aiSettingsRepository.save(settings);
  }

  async deleteAiProvider(userId: string, provider: AgentProvider): Promise<AiSettingsEntity> {
    const settings = await this.getOrCreate(userId);

    if (provider === 'openai') settings.openaiKeyEncrypted = null;
    if (provider === 'claude') settings.claudeKeyEncrypted = null;
    if (provider === 'gemini') settings.geminiKeyEncrypted = null;
    if (provider === 'ollama') settings.ollamaKeyEncrypted = null;

    if (settings.activeAiProvider === provider) {
      settings.activeAiProvider = null;
    }

    if (settings.aiProviderConfigs && settings.aiProviderConfigs[provider]) {
      const configs = { ...settings.aiProviderConfigs };
      delete configs[provider];
      settings.aiProviderConfigs = configs;
    }

    return this.aiSettingsRepository.save(settings);
  }

  async getAiConfig(userId: string): Promise<{
    activeAiProvider: AgentProvider | null;
    preferredModel: string | null;
    configuredProviders: Array<AgentProvider>;
    aiProviderConfigs: Record<string, any> | null;
    forceMarkdown: boolean;
    decryptedApiKey: string | null;
    decryptedApiKeys: Record<string, string | null>;
  }> {
    const settings = await this.getOrCreate(userId);

    const configuredProviders: Array<AgentProvider> = [];
    const decryptedApiKeys: Record<string, string | null> = {};
    let decryptedApiKey: string | null = null;

    if (settings.openaiKeyEncrypted) {
      configuredProviders.push('openai');
      decryptedApiKeys.openai = decrypt(settings.openaiKeyEncrypted);
      if (settings.activeAiProvider === 'openai') {
        decryptedApiKey = decryptedApiKeys.openai;
      }
    }
    if (settings.claudeKeyEncrypted) {
      configuredProviders.push('claude');
      decryptedApiKeys.claude = decrypt(settings.claudeKeyEncrypted);
      if (settings.activeAiProvider === 'claude') {
        decryptedApiKey = decryptedApiKeys.claude;
      }
    }
    if (settings.geminiKeyEncrypted) {
      configuredProviders.push('gemini');
      decryptedApiKeys.gemini = decrypt(settings.geminiKeyEncrypted);
      if (settings.activeAiProvider === 'gemini') {
        decryptedApiKey = decryptedApiKeys.gemini;
      }
    }
    if (settings.ollamaKeyEncrypted) {
      configuredProviders.push('ollama');
      decryptedApiKeys.ollama = decrypt(settings.ollamaKeyEncrypted);
      if (settings.activeAiProvider === 'ollama') {
        decryptedApiKey = decryptedApiKeys.ollama;
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
      activeAiProvider: (settings.activeAiProvider as AgentProvider | null) ?? null,
      preferredModel: settings.preferredModel,
      configuredProviders,
      aiProviderConfigs: settings.aiProviderConfigs,
      forceMarkdown: settings.aiProviderConfigs?.forceMarkdown !== false,
      decryptedApiKey,
      decryptedApiKeys,
    };
  }

  async updateAiSettings(userId: string, forceMarkdown: boolean): Promise<AiSettingsEntity> {
    const settings = await this.getOrCreate(userId);
    const configs = settings.aiProviderConfigs || {};
    configs.forceMarkdown = forceMarkdown;
    settings.aiProviderConfigs = configs;
    return this.aiSettingsRepository.save(settings);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.aiSettingsRepository.delete({ userId });
  }
}
