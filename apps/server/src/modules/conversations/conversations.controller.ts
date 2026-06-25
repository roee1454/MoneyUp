import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { requireSessionUserId } from '../../utils/auth.utils';
import { ConversationsService } from './conversations.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';
import { OllamaService } from '../ai/ollama.service';

@Controller('ai/conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AiService))
    private readonly aiService: AiService,
    @Inject(forwardRef(() => OllamaService))
    private readonly ollamaService: OllamaService,
  ) {}

  @Get()
  async getConversations(@Req() request: Request) {
    const userId = requireSessionUserId(request);
    return this.conversationsService.getConversations(userId);
  }

  @Post()
  async createConversation(
    @Req() request: Request,
    @Body() payload: { title: string },
  ) {
    const userId = requireSessionUserId(request);
    return this.conversationsService.createConversation(userId, payload.title);
  }

  @Get(':id')
  async getConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.conversationsService.getConversation(userId, conversationId);
  }

  @Post(':id/messages')
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

    if (payload.role === 'user') {
      const userConfig = await this.usersService.getAiConfig(userId);
      if (userConfig.activeAiProvider === 'ollama') {
        const modelName = userConfig.preferredModel;
        if (modelName) {
          const resolved = await this.aiService.resolveAiModelsPayload(
            { provider: 'ollama' },
            request,
          );
          const loadedModels = await this.ollamaService.getOllamaRunningModels(resolved.apiKey);
          const isRunning = loadedModels.includes(modelName) || loadedModels.some(r => r.startsWith(modelName + ':') || modelName.startsWith(r + ':'));
          if (!isRunning) {
            throw new BadRequestException(`מודל Ollama "${modelName}" אינו טעון בזיכרון. אנא הפעל אותו תחילה.`);
          }
        }
      }
    }

    return this.conversationsService.addMessage(
      userId,
      conversationId,
      payload.role,
      payload.content,
      payload.tool_calls,
      payload.tool_call_id,
    );
  }

  @Delete(':id')
  async deleteConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.conversationsService.deleteConversation(userId, conversationId);
  }

  @Delete(':id/messages/:messageId/truncate')
  async truncateConversation(
    @Req() request: Request,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const userId = requireSessionUserId(request);
    return this.conversationsService.truncateConversationAtMessage(userId, conversationId, messageId);
  }
}
