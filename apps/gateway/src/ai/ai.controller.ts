import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  MessageEvent,
  Param,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom, Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { requireSessionUserId } from '../utils/auth.utils';
import { GatewayAiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    private readonly aiService: GatewayAiService,
  ) {}

  @Get('conversations')
  async getConversations(@Req() request: Request) {
    const userId = requireSessionUserId(request);
    return firstValueFrom(
      this.usersServiceClient
        .send('user_get_conversations', userId)
        .pipe(timeout(5000)),
    );
  }

  @Post('conversations')
  async createConversation(
    @Req() request: Request,
    @Body() payload: { title: string },
  ) {
    const userId = requireSessionUserId(request);
    return firstValueFrom(
      this.usersServiceClient
        .send('user_create_conversation', { userId, title: payload.title })
        .pipe(timeout(5000)),
    );
  }

  @Get('conversations/:id')
  async getConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return firstValueFrom(
      this.usersServiceClient
        .send('user_get_conversation', { userId, conversationId })
        .pipe(timeout(5000)),
    );
  }

  @Post('conversations/:id/messages')
  async addMessage(
    @Req() request: Request,
    @Param('id') conversationId: string,
    @Body()
    payload: {
      role: 'user' | 'assistant' | 'system' | 'tool';
      content: string;
      tool_calls?: any[];
      tool_call_id?: string;
    },
  ) {
    const userId = requireSessionUserId(request);
    return firstValueFrom(
      this.usersServiceClient
        .send('user_add_message', {
          userId,
          conversationId,
          role: payload.role,
          content: payload.content,
          tool_calls: payload.tool_calls,
          tool_call_id: payload.tool_call_id,
        })
        .pipe(timeout(5000)),
    );
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return firstValueFrom(
      this.usersServiceClient
        .send('user_delete_conversation', { userId, conversationId })
        .pipe(timeout(5000)),
    );
  }

  @Get()
  async getAiGreeting(): Promise<string> {
    return 'AI gateway endpoint is ready';
  }

  @Post('verify')
  async verifyAiConnection(
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey: string;
    },
  ) {
    return firstValueFrom(
      this.aiServiceClient
        .send('ai_verify_connection', payload)
        .pipe(timeout(30000)),
    );
  }

  @Get('models')
  async listAiModels(
    @Query('provider') provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter',
    @Query('apiKey') apiKey?: string,
    @Req() request?: Request,
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      { provider, apiKey },
      request,
    );
    return firstValueFrom(
      this.aiServiceClient
        .send('ai_list_models', resolved)
        .pipe(timeout(30000)),
    );
  }

  @Post('models')
  async listAiModelsPost(
    @Body()
    payload: { provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter'; apiKey?: string },
    @Req() request?: Request,
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(payload, request);
    return firstValueFrom(
      this.aiServiceClient
        .send('ai_list_models', resolved)
        .pipe(timeout(30000)),
    );
  }

  @Post('prompt')
  async aiPrompt(
    @Req() request: Request,
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      model: string;
      messages: any[];
      conversationId?: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      forceMarkdown?: boolean;
    },
  ) {
    const userId = requireSessionUserId(request);
    const resolved = await this.aiService.resolveAiPayload(payload, request);
    return this.aiService.promptNonStream(userId, resolved, payload.conversationId);
  }

  @Post('prompt/stream')
  @Sse()
  aiPromptStream(
    @Req() request: Request,
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      model: string;
      messages: any[];
      conversationId?: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      forceMarkdown?: boolean;
    },
  ): Observable<MessageEvent> {
    return new Observable<any>((subscriber) => {
      (async () => {
        try {
          const userId = requireSessionUserId(request);
          const resolved = await this.aiService.resolveAiPayload(payload, request);
          await this.aiService.runStreamLoop(
            subscriber,
            userId,
            resolved,
            payload.conversationId,
          );
        } catch (err) {
          subscriber.error(err);
        }
      })();
    }).pipe(map((obj) => ({ data: obj }) as MessageEvent));
  }
}
