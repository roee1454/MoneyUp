import {
  Body,
  Controller,
  Get,
  Inject,
  MessageEvent,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom, Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { UserAiConfig } from '../types/gateway.types';
import { verifyJwtToken } from '../utils/auth.utils';

@Controller('ai')
export class AiController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) {}

  @Get()
  async getAiGreeting(): Promise<string> {
    return 'AI gateway endpoint is ready';
  }

  @Post('verify')
  async verifyAiConnection(
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
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
    @Query('provider') provider: 'openai' | 'claude' | 'gemini',
    @Query('apiKey') apiKey?: string,
    @Req() request?: Request,
  ) {
    const resolved = await this.resolveAiModelsPayload(
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
    payload: { provider: 'openai' | 'claude' | 'gemini'; apiKey?: string },
    @Req() request?: Request,
  ) {
    const resolved = await this.resolveAiModelsPayload(payload, request);
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
      provider: 'openai' | 'claude' | 'gemini';
      model: string;
      prompt: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ) {
    const resolved = await this.resolveAiPayload(payload, request);
    return firstValueFrom(
      this.aiServiceClient.send('ai_prompt', resolved).pipe(timeout(180000)),
    );
  }

  @Sse('prompt/stream')
  aiPromptStream(
    @Query('provider') provider: 'openai' | 'claude' | 'gemini',
    @Query('model') model: string,
    @Query('prompt') prompt: string,
    @Query('apiKey') apiKey?: string,
    @Query('temperature') temperature?: string,
    @Query('maxTokens') maxTokens?: string,
    @Req() request?: Request,
  ): Observable<MessageEvent> {
    const stream$ = new Observable<string>((subscriber) => {
      (async () => {
        try {
          const parsedTemperature = this.parseOptionalNumber(temperature);
          const parsedMaxTokens = this.parseOptionalNumber(maxTokens);
          const payload = await this.resolveAiPayload(
            {
              provider,
              model,
              prompt,
              apiKey,
              temperature: parsedTemperature,
              maxTokens: parsedMaxTokens,
            },
            request,
          );
          this.aiServiceClient
            .send<string>('ai_prompt_stream', payload)
            .subscribe({
              next: (v) => subscriber.next(v),
              error: (e) => subscriber.error(e),
              complete: () => subscriber.complete(),
            });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });

    return stream$.pipe(map((chunk) => ({ data: chunk })));
  }

  private async resolveAiPayload(
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
      model: string;
      prompt: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    },
    request?: Request,
  ): Promise<{
    provider: 'openai' | 'claude' | 'gemini';
    model: string;
    prompt: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }> {
    if (payload.apiKey && typeof payload.stream !== 'undefined') {
      return payload;
    }
    if (!request) {
      return payload;
    }

    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      return payload;
    }
    const session = verifyJwtToken(sessionToken);

    const cfg = await firstValueFrom(
      this.usersServiceClient
        .send<UserAiConfig>('user_get_ai_config', session.userId)
        .pipe(timeout(30000)),
    );

    const userConfig =
      (cfg.aiProviderConfigs && cfg.aiProviderConfigs[payload.provider]) || {};

    const resolvedPayload = { ...payload };

    if (cfg.decryptedApiKey && cfg.activeAiProvider === payload.provider) {
      resolvedPayload.apiKey = cfg.decryptedApiKey;
    }

    if (
      typeof payload.temperature === 'undefined' &&
      typeof userConfig.temperature !== 'undefined'
    ) {
      resolvedPayload.temperature = userConfig.temperature;
    }
    if (
      typeof payload.maxTokens === 'undefined' &&
      typeof userConfig.maxTokens !== 'undefined'
    ) {
      resolvedPayload.maxTokens = userConfig.maxTokens;
    }
    if (
      typeof payload.stream === 'undefined' &&
      typeof userConfig.stream !== 'undefined'
    ) {
      resolvedPayload.stream = userConfig.stream;
    }

    return resolvedPayload;
  }

  private async resolveAiModelsPayload(
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey?: string;
    },
    request?: Request,
  ): Promise<{
    provider: 'openai' | 'claude' | 'gemini';
    apiKey?: string;
  }> {
    if (payload.apiKey) {
      return payload;
    }
    if (!request) {
      return payload;
    }

    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      return payload;
    }

    const session = verifyJwtToken(sessionToken);
    const cfg = await firstValueFrom(
      this.usersServiceClient
        .send<UserAiConfig>('user_get_ai_config', session.userId)
        .pipe(timeout(30000)),
    );

    if (cfg.decryptedApiKey && cfg.activeAiProvider === payload.provider) {
      return {
        ...payload,
        apiKey: cfg.decryptedApiKey,
      };
    }

    return payload;
  }

  private parseOptionalNumber(value?: string): number | undefined {
    if (typeof value === 'undefined') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
