export type AgentProvider = "openai" | "gemini" | "claude" | "ollama";

export const AgentProvider = {
  OpenAI: "openai" as const,
  Gemini: "gemini" as const,
  Claude: "claude" as const,
  Ollama: "ollama" as const
};

export const OpenAiModels = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.4-mini',
  'gpt-5.4',
];

export const GeminiModels = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
];

export const ClaudeModels = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
];

export const OllamaModels: string[] = [];

/** All supported provider identifiers, in display order. */
export const ALL_PROVIDERS: AgentProvider[] = [
  'gemini',
  'openai',
  'claude',
  'ollama',
];

export const ModelTags: Record<string, string> = {
  'gpt-4o-mini': 'יעיל בטוקנים',
  'gpt-4o': 'יעיל בטוקנים',
  'gpt-5.4-mini': 'חשיבה',
  'gpt-5.4': 'חשיבה',
  'gemini-2.5-flash': 'מאוזן',
  'gemini-2.5-flash-lite': 'קל משקל',
  'gemini-3.1-flash-lite': 'קל משקל',
  'gemini-3.1-pro-preview': 'חשיבה עמוקה',
  'gemini-3.5-flash': 'מאוזן',
};

export function getFriendlyModelName(modelId: string): string {
  const modelNameMap: Record<string, string> = {
    // OpenAI
    'gpt-4o-mini': "GPT-4o Mini",
    'gpt-4o': 'GPT-4o',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'o1-mini': 'o1 Mini',
    'o3-mini': 'o3 Mini',
    'o4-mini': 'o4 Mini',
    'gpt-5.4': 'GPT-5.4',
    'gpt-5.4-mini': 'GPT-5.4 Mini',
    // Claude
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-opus-20240229': 'Claude 3 Opus',
    // Gemini
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
    'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
    'gemini-3.1-pro-preview': 'Gemini 3.1 Pro Preview',
    'gemini-3.5-flash': 'Gemini 3.5 Flash',
  };

  return modelNameMap[modelId] || modelId;
}

export type AiTask = 'chat' | 'classification' | 'investments';

export function resolveAutoModel(
  provider: string,
  task: AiTask,
  availableModels?: string[]
): string {
  switch (provider) {
    case 'openai':
      if (task === 'classification') {
        return 'gpt-4o-mini';
      }
      if (task === 'investments') {
        return 'gpt-5.4';
      }
      return 'gpt-4o';
    case 'claude':
      if (task === 'classification') {
        return 'claude-3-5-haiku-20241022';
      }
      if (task === 'investments') {
        return 'claude-3-5-sonnet-20241022';
      }
      return 'claude-3-5-sonnet-20241022';
    case 'gemini':
      if (task === 'classification') {
        return 'gemini-2.5-flash';
      }
      if (task === 'investments') {
        return 'gemini-3.1-pro-preview';
      }
      return 'gemini-3.5-flash';
    case 'ollama':
      if (availableModels && availableModels.length > 0) {
        const intelligentKeywords = ['qwen2.5', 'llama3.1', 'mistral', 'gemma2'];
        for (const kw of intelligentKeywords) {
          const match = availableModels.find(m => m.toLowerCase().includes(kw));
          if (match) return match;
        }
        return availableModels[0];
      }
      return 'llama3.1:8b';
    default:
      return '';
  }
}

