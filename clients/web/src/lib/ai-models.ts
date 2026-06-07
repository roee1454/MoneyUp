export function getFriendlyModelName(modelId: string): string {
  const modelNameMap: Record<string, string> = {
    // OpenAI
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
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
    'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  };

  return modelNameMap[modelId] || modelId;
}
