import type { AiProvider } from './ai';
export type AiProviderConfigs = Record<
  string,
  {
    model: string;
    preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    forceMarkdown?: boolean;
  }
> | null;

export type UserPayload = {
  id: string;
  username: string;
  email: string;
  isLocked?: boolean;
  activeAiProvider?: AiProvider | null;
  preferredModel?: string | null;
  configuredProviders?: Array<AiProvider>;
  scraperTimeoutRetryCount?: number;
  scraperAutoSyncCooldownSeconds?: number;
  scraperShowBrowser?: boolean;
  scraperLoginTimeoutSeconds?: number;
  scraperDefaultTimeoutSeconds?: number;
  scraperChromiumPath?: string | null;
  aiProviderConfigs?: AiProviderConfigs;
  forceMarkdown?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type User = UserPayload;

export type UserAiConfig = {
  activeAiProvider: AiProvider | null;
  preferredModel: string | null;
  decryptedApiKey: string | null;
  decryptedApiKeys?: Record<string, string | null>;
  configuredProviders?: Array<AiProvider>;
  aiProviderConfigs?: AiProviderConfigs;
  forceMarkdown?: boolean;
};
