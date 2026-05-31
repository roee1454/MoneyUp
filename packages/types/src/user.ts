export type UserPayload = {
  id: string;
  username: string;
  email: string;
  isLocked?: boolean;
  activeAiProvider?: 'openai' | 'claude' | 'gemini' | null;
  preferredModel?: string | null;
  configuredProviders?: Array<'openai' | 'claude' | 'gemini'>;
  scraperTimeoutRetryCount?: number;
  scraperAutoSyncCooldownSeconds?: number;
  scraperShowBrowser?: boolean;
  scraperLoginTimeoutSeconds?: number;
  scraperDefaultTimeoutSeconds?: number;
  scraperChromiumPath?: string | null;
  aiProviderConfigs?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

export type UserAiConfig = {
  activeAiProvider: 'openai' | 'claude' | 'gemini' | null;
  preferredModel: string | null;
  decryptedApiKey: string | null;
  aiProviderConfigs?: Record<string, any> | null;
};
