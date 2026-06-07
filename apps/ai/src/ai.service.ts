import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './providers/ai-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { OpenRouterProvider } from './providers/openrouter-provider';

type ProviderName = 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  getProvider(providerName: ProviderName, customApiKey?: string): AIProvider {
    let apiKey =
      customApiKey ||
      this.configService.get<string>(`${providerName.toUpperCase()}_API_KEY`);

    if (!apiKey && providerName === 'ollama') {
      apiKey = 'http://localhost:11434/v1';
    }

    if (!apiKey) {
      throw new InternalServerErrorException(
        `API Key for ${providerName} is not configured`,
      );
    }

    switch (providerName) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'claude':
        return new ClaudeProvider(apiKey);
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'ollama':
        return new OllamaProvider(apiKey);
      case 'openrouter':
        return new OpenRouterProvider(apiKey);
      default:
        throw new InternalServerErrorException(
          `Unsupported provider: ${providerName}`,
        );
    }
  }
}
