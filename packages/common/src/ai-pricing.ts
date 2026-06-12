/**
 * Pricing information for a specific AI model.
 */
export interface TokenPricing {
  /** Cost in USD per 1,000,000 input tokens. */
  inputPer1M: number;
  /** Cost in USD per 1,000,000 output tokens. */
  outputPer1M: number;
}

/**
 * Registry of token pricing per 1,000,000 tokens for supported models.
 */
export const MODEL_PRICING: Record<string, TokenPricing> = {
  // OpenAI
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  'gpt-5.4-mini': { inputPer1M: 1.10, outputPer1M: 4.40 },
  'gpt-5.4': { inputPer1M: 7.00, outputPer1M: 28.00 },
  'gpt-5': { inputPer1M: 7.00, outputPer1M: 28.00 },
  'gpt-5-mini': { inputPer1M: 1.10, outputPer1M: 4.40 },

  // Gemini
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gemini-2.5-flash-lite': { inputPer1M: 0.10, outputPer1M: 0.40 },
  'gemini-3.1-flash-lite': { inputPer1M: 0.08, outputPer1M: 0.30 },
  'gemini-3.1-pro-preview': { inputPer1M: 1.25, outputPer1M: 5.00 },
  'gemini-3.5-flash': { inputPer1M: 0.30, outputPer1M: 1.00 },

  // Claude
  'claude-3-5-haiku-20241022': { inputPer1M: 0.80, outputPer1M: 4.00 },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'claude-3-opus-20240229': { inputPer1M: 15.00, outputPer1M: 75.00 },
};

/**
 * Retrieves pricing configuration for a given model ID.
 *
 * @param modelId The identifier of the AI model.
 * @returns Pricing configuration if known, or null otherwise.
 */
export function getModelPricing(modelId: string): TokenPricing | null {
  return MODEL_PRICING[modelId] || null;
}
