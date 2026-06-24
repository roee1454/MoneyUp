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
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AgentProvider, AiTask } from '@money-up/common';
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
      task?: AiTask;
    },
  ) {
    const userId = requireSessionUserId(request);

    if (payload.provider === 'ollama') {
      const resolvedModels = await this.aiService.resolveAiModelsPayload(
        { provider: 'ollama' },
        request,
      );
      const loadedModels = await this.aiService.getOllamaRunningModels(resolvedModels.apiKey);
      const isRunning = loadedModels.includes(payload.model) || loadedModels.some(r => r.startsWith(payload.model + ':') || payload.model.startsWith(r + ':'));
      if (!isRunning) {
        throw new BadRequestException(`מודל Ollama "${payload.model}" אינו טעון בזיכרון. אנא הפעל אותו תחילה.`);
      }
    }

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
      task?: AiTask;
    },
  ): Observable<MessageEvent> {
    return new Observable<any>((subscriber) => {
      (async () => {
        try {
          const userId = requireSessionUserId(request);

          if (payload.provider === 'ollama') {
            const resolvedModels = await this.aiService.resolveAiModelsPayload(
              { provider: 'ollama' },
              request,
            );
            const loadedModels = await this.aiService.getOllamaRunningModels(resolvedModels.apiKey);
            const isRunning = loadedModels.includes(payload.model) || loadedModels.some(r => r.startsWith(payload.model + ':') || payload.model.startsWith(r + ':'));
            if (!isRunning) {
              throw new BadRequestException(`מודל Ollama "${payload.model}" אינו טעון בזיכרון. אנא הפעל אותו תחילה.`);
            }
          }

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

  @Get('ollama/running')
  async getOllamaRunningModels(@Req() request: Request) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      { provider: 'ollama' },
      request,
    );
    return this.aiService.getOllamaRunningModels(resolved.apiKey);
  }

  @Post('ollama/start')
  async startOllamaModel(
    @Req() request: Request,
    @Body() payload: { model: string },
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      { provider: 'ollama' },
      request,
    );
    return this.aiService.startOllamaModel(payload.model, resolved.apiKey);
  }

  @Post('ollama/stop')
  async stopOllamaModel(
    @Req() request: Request,
    @Body() payload: { model: string },
  ) {
    const resolved = await this.aiService.resolveAiModelsPayload(
      { provider: 'ollama' },
      request,
    );
    return this.aiService.stopOllamaModel(payload.model, resolved.apiKey);
  }
}
