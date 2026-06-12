import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentProvider } from '@money-up/common';
import { requireSessionUserId } from '../../utils/auth.utils';
import { AiService } from './ai.service';
import { UsersService } from '../users/users.service';

/**
 * NestJS Controller handling incoming HTTP requests for Ai.
 */
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
  ) {}

  @Get('conversations')
  async getConversations(@Req() request: Request) {
    const userId = requireSessionUserId(request);
    return this.usersService.getConversations(userId);
  }

  @Post('conversations')
  async createConversation(
    @Req() request: Request,
    @Body() payload: { title: string },
  ) {
    const userId = requireSessionUserId(request);
    return this.usersService.createConversation(userId, payload.title);
  }

  @Get('conversations/:id')
  async getConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.usersService.getConversation(userId, conversationId);
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
    return this.usersService.addMessage(
      userId,
      conversationId,
      payload.role,
      payload.content,
      payload.tool_calls,
      payload.tool_call_id,
    );
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.usersService.deleteConversation(userId, conversationId);
  }

  @Delete('conversations/:id/messages/:messageId/truncate')
  async truncateConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.usersService.truncateConversationAtMessage(userId, conversationId, messageId);
  }

  @Get()
  getAiGreeting(): string {
    return 'AI gateway endpoint is ready';
  }

  @Post('verify')
  async verifyAiConnection(
    @Body()
    payload: {
      provider: AgentProvider;
      apiKey: string;
    },
  ) {
    const providerInstance = this.aiService.getProvider(
      payload.provider,
      payload.apiKey,
    );
    return { success: await providerInstance.verifyConnection() };
  }

  @Get('models')
  async listAiModels(
    @Query('provider')
    provider: AgentProvider,
    @Query('apiKey') apiKey?: string,
    @Req() request?: Request,
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      { provider, apiKey },
      request,
    );
    const providerInstance = this.aiService.getProvider(
      resolved.provider,
      resolved.apiKey,
    );
    return providerInstance.listModels();
  }

  @Post('models')
  async listAiModelsPost(
    @Body()
    payload: {
      provider: AgentProvider;
      apiKey?: string;
    },
    @Req() request?: Request,
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      payload,
      request,
    );
    const providerInstance = this.aiService.getProvider(
      resolved.provider,
      resolved.apiKey,
    );
    return providerInstance.listModels();
  }

  @Post('prompt')
  async aiPrompt(
    @Req() request: Request,
    @Body()
    payload: {
      provider: AgentProvider;
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
    return this.aiService.promptNonStream(
      userId,
      resolved,
      payload.conversationId,
    );
  }

  @Post('prompt/stream')
  @Sse()
  aiPromptStream(
    @Req() request: Request,
    @Body()
    payload: {
      provider: AgentProvider;
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
          const resolved = await this.aiService.resolveAiPayload(
            payload,
            request,
          );
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
    }).pipe(map((obj) => ({ data: obj })));
  }
}
