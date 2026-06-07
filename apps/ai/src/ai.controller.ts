import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AiService } from './ai.service';
import { AiMessage, AiTool, StructuredResponse } from './providers/ai-provider';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @MessagePattern('ai_verify_connection')
  async verifyConnection(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
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
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
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
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      model: string;
      messages: AiMessage[];
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: AiTool[];
    },
  ): Promise<StructuredResponse> {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    const result = await p.prompt(data.model, data.messages, {
      stream: false,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      tools: data.tools,
    });
    return result as StructuredResponse;
  }

  @MessagePattern('ai_prompt_stream')
  async promptStream(
    @Payload()
    data: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      model: string;
      messages: AiMessage[];
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: AiTool[];
    },
  ): Promise<Observable<StructuredResponse>> {
    const p = this.aiService.getProvider(data.provider, data.apiKey);
    const result = await p.prompt(data.model, data.messages, {
      stream: true,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      tools: data.tools,
    });
    return result as Observable<StructuredResponse>;
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}
