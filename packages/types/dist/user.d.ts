export type UserPayload = {
    id: string;
    username: string;
    email: string;
    isLocked?: boolean;
    activeAiProvider?: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter' | null;
    preferredModel?: string | null;
    configuredProviders?: Array<'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'>;
    scraperTimeoutRetryCount?: number;
    scraperAutoSyncCooldownSeconds?: number;
    scraperShowBrowser?: boolean;
    scraperLoginTimeoutSeconds?: number;
    scraperDefaultTimeoutSeconds?: number;
    scraperChromiumPath?: string | null;
    aiProviderConfigs?: Record<string, any> | null;
    forceMarkdown?: boolean;
    createdAt: string;
    updatedAt: string;
};
export type UserAiConfig = {
    activeAiProvider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter' | null;
    preferredModel: string | null;
    decryptedApiKey: string | null;
    decryptedApiKeys?: Record<string, string | null>;
    configuredProviders?: Array<'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'>;
    aiProviderConfigs?: Record<string, any> | null;
    forceMarkdown?: boolean;
};
