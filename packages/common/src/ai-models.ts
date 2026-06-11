export type AgentProvider = "openai" | "gemini" | "claude" | "openrouter" | "ollama";

export const AgentProvider = {
  OpenAI: "openai" as const,
  Gemini: "gemini" as const,
  Claude: "claude" as const,
  OpenRouter: "openrouter" as const,
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
  
]

export const ModelTags: Record<string, string> = {
  'gpt-4o-mini': 'token efficient',
  'gpt-4o': 'token efficient',
  'gpt-5.4-mini': 'thinking',
  'gpt-5.4': 'thinking',
  'gemini-2.5-flash': 'balanced',
  'gemini-2.5-flash-lite': 'lightweight',
  'gemini-3.1-flash-lite': 'lightweight',
  'gemini-3.1-pro-preview': 'reasoning',
  'gemini-3.5-flash': 'balanced',
};

