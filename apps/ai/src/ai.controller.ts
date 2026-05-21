import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @MessagePattern('ai_verify_connection')
  async verifyConnection(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
    },
  ) {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    return { success: await p.verifyConnection() };
  }

  @MessagePattern('ai_list_models')
  async listModels(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey?: string;
    },
  ) {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    return p.listModels();
  }

  @MessagePattern('ai_prompt')
  async prompt(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini';
      model: string;
      prompt: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ) {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    const result = await p.prompt(data.model, data.prompt, {
      stream: false,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
    });
    return { text: result as string };
  }

  @MessagePattern('ai_prompt_stream')
  async promptStream(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini';
      model: string;
      prompt: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<Observable<string>> {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    const result = await p.prompt(data.model, data.prompt, {
      stream: true,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
    });
    return result as Observable<string>;
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}
