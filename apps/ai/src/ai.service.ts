import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './providers/ai-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { GeminiProvider } from './providers/gemini-provider';

type ProviderName = 'openai' | 'claude' | 'gemini';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  getProvider(providerName: ProviderName, customApiKey?: string): AIProvider {
    const apiKey =
      customApiKey ||
      this.configService.get<string>(`${providerName.toUpperCase()}_API_KEY`);

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
      default:
        throw new InternalServerErrorException(
          `Unsupported provider: ${providerName}`,
        );
    }
  }
}
