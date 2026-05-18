import {
  Body,
  Controller,
  Delete,
  Get,
  MessageEvent,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Request, Response } from 'express';
import { firstValueFrom, Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';

import { ConnectScraperDto, SubmitChallengeDto } from '@moneyup/types';

type UserPayload = {
  id: string;
  username: string;
  email: string;
  isLocked?: boolean;
  activeAiProvider?: 'openai' | 'claude' | 'gemini' | null;
  preferredModel?: string | null;
  createdAt: string;
  updatedAt: string;
};

@Controller()
export class AppController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) { }

  @Get('ai')
  async getAiGreeting(): Promise<string> {
    return 'AI gateway endpoint is ready';
  }

  @Post('ai/verify')
  async verifyAiConnection(
    @Body() payload: { provider: 'openai' | 'claude' | 'gemini'; apiKey: string },
  ) {
    return firstValueFrom(
      this.aiServiceClient.send('ai_verify_connection', payload).pipe(timeout(30000)),
    );
  }

  @Get('ai/models')
  async listAiModels(
    @Query('provider') provider: 'openai' | 'claude' | 'gemini',
    @Query('apiKey') apiKey?: string,
    @Req() request?: Request,
  ) {
    const resolved = await this.resolveAiModelsPayload({ provider, apiKey }, request);
    return firstValueFrom(
      this.aiServiceClient.send('ai_list_models', resolved).pipe(timeout(30000)),
    );
  }

  @Post('ai/models')
  async listAiModelsPost(
    @Body() payload: { provider: 'openai' | 'claude' | 'gemini'; apiKey?: string },
    @Req() request?: Request,
  ) {
    const resolved = await this.resolveAiModelsPayload(payload, request);
    return firstValueFrom(
      this.aiServiceClient.send('ai_list_models', resolved).pipe(timeout(30000)),
    );
  }

  @Post('ai/prompt')
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
    return firstValueFrom(this.aiServiceClient.send('ai_prompt', resolved).pipe(timeout(180000)));
  }

  @Sse('ai/prompt/stream')
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
          this.aiServiceClient.send<string>('ai_prompt_stream', payload).subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });

    return stream$.pipe(map((chunk) => ({ data: chunk } as MessageEvent)));
  }

  @Get('scraper')
  async getScraperGreeting(): Promise<string> {
    return firstValueFrom(
      this.scraperServiceClient.send<string>('scraper_hello', {}),
    );
  }

  @Get('scrapers')
  async getScrapersList() {
    return firstValueFrom(
      this.scraperServiceClient.send('scrapers_list', {}).pipe(timeout(2000)),
    );
  }

  @Get('scrapers/accounts')
  async getConnectedAccounts(@Req() request: Request) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }
    const user = this.verifyJwtToken(sessionToken);

    return firstValueFrom(
      this.scraperServiceClient
        .send('get_connected_accounts', { userId: user.userId })
        .pipe(timeout(60000)),
    );
  }

  @Post('scrapers/sync')
  async syncAccounts(@Req() request: Request) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }
    const user = this.verifyJwtToken(sessionToken);

    return firstValueFrom(
      this.scraperServiceClient
        .send('sync_accounts', { userId: user.userId })
        .pipe(timeout(120000)),
    );
  }

  @Post('scrapers/connect')
  async connectScraper(
    @Body() payload: ConnectScraperDto,
    @Req() request: Request,
  ) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }
    const user = this.verifyJwtToken(sessionToken);

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('scrape_and_connect', {
          userId: user.userId,
          bankId: payload.bankId,
          credentials: payload.credentials,
          startDate: payload.startDate,
        })
        .pipe(timeout(180000)),
    );

    return response;
  }

  @Get('scrapers/status')
  async getScraperStatus(
    @Query('sessionId') sessionId: string,
    @Req() request: Request,
  ) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }

    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('get_scraper_status', { sessionId })
        .pipe(timeout(10000)),
    );

    return response;
  }

  @Post('scrapers/challenge/submit')
  async submitChallenge(
    @Body() payload: SubmitChallengeDto,
    @Req() request: Request,
  ) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('submit_challenge', {
          sessionId: payload.sessionId,
          code: payload.code,
        })
        .pipe(timeout(60000)),
    );

    return response;
  }

  @Post('auth/login')
  async login(
    @Body() payload: { userId: string; username: string; unlockTicket?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', payload.userId)
        .pipe(timeout(2000)),
    );

    if (!user || user.username !== payload.username) {
      throw new NotFoundException('User profile not found');
    }

    if (user.isLocked) {
      const ticket = payload.unlockTicket;
      if (!ticket || !this.verifyUnlockTicket(ticket, user.id)) {
        throw new UnauthorizedException('Profile is locked. Unlock key required.');
      }
    }

    const { token } = await firstValueFrom(
      this.authServiceClient
        .send('auth_authenticate', {
          userId: payload.userId,
          username: payload.username,
        })
        .pipe(timeout(2000)),
    );

    response.cookie('moneyup_session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true, user: this.toPublicUser(user) };
  }

  @Get('auth/session')
  getSession(@Req() request: Request) {
    const token = request.cookies?.moneyup_session;
    if (!token) {
      throw new UnauthorizedException('No active session found');
    }

    return {
      isAuthenticated: true,
      user: this.verifyJwtToken(token),
    };
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('moneyup_session');
    return { success: true };
  }

  @Post('users')
  async createUser(
    @Body() payload: { username: string; email: string; lockProfile?: boolean; unlockKey?: string },
  ) {
    return firstValueFrom(
      this.usersServiceClient.send('user_create', payload).pipe(timeout(2000)),
    );
  }

  @Get('users')
  async findUsers() {
    const users = await firstValueFrom(
      this.usersServiceClient.send('user_find_all', {}).pipe(timeout(2000)),
    );
    return (users as UserPayload[]).map((u) => this.toPublicUser(u));
  }

  @Get('users/me')
  async getCurrentUserProfile(@Req() request: Request) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('No active session found');
    }
    const session = this.verifyJwtToken(sessionToken);
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', session.userId)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return this.toPublicUser(user);
  }

  @Get('users/:id')
  async findUser(@Param('id') id: string) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', id)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return this.toPublicUser(user);
  }

  @Post('users/ai-config')
  async saveAiConfig(
    @Req() request: Request,
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
      preferredModel: string;
    },
  ) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('No active session found');
    }
    const session = this.verifyJwtToken(sessionToken);

    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_save_ai_config', {
          id: session.userId,
          ...payload,
        })
        .pipe(timeout(30000)),
    );

    return this.toPublicUser(user);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: { username?: string; email?: string },
  ) {
    return firstValueFrom(
      this.usersServiceClient.send('user_update', { id, data }).pipe(timeout(2000)),
    );
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return firstValueFrom(
      this.usersServiceClient.send('user_delete', id).pipe(timeout(2000)),
    );
  }

  @Post('users/:id/delete-confirm')
  async deleteUserConfirmed(
    @Param('id') id: string,
    @Body() payload: { confirmationEmail: string },
  ) {
    return firstValueFrom(
      this.usersServiceClient
        .send('user_delete_confirmed', { id, confirmationEmail: payload.confirmationEmail })
        .pipe(timeout(2000)),
    );
  }

  @Post('auth/unlock')
  async unlockProfile(
    @Body() payload: { userId: string; unlockKey: string },
  ): Promise<{ success: boolean; unlockTicket: string }> {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', payload.userId)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    if (!user.isLocked) {
      return { success: true, unlockTicket: this.createUnlockTicket(user.id) };
    }

    const verification = await firstValueFrom(
      this.usersServiceClient
        .send<{ valid: boolean }>('user_verify_unlock', {
          id: payload.userId,
          unlockKey: payload.unlockKey,
        })
        .pipe(timeout(2000)),
    );

    if (!verification.valid) {
      throw new UnauthorizedException('Invalid unlocking key');
    }

    return { success: true, unlockTicket: this.createUnlockTicket(user.id) };
  }

  @Get('health')
  async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, 'up' | 'down'>;
    timestamp: string;
  }> {
    const serviceClients = {
      ai: this.aiServiceClient,
      scraper: this.scraperServiceClient,
      auth: this.authServiceClient,
      users: this.usersServiceClient,
    };

    const checks = Object.entries(serviceClients).map(
      async ([name, client]) => {
        try {
          await firstValueFrom(client.send<string>('ping', {}).pipe(timeout(500)));
          return [name, 'up'] as const;
        } catch {
          return [name, 'down'] as const;
        }
      },
    );

    const services = Object.fromEntries(await Promise.all(checks)) as Record<
      string,
      'up' | 'down'
    >;

    const clientUrl = process.env.CLIENT_URL;
    if (clientUrl) {
      try {
        await fetch(clientUrl, { signal: AbortSignal.timeout(500) });
        services.client = 'up';
      } catch {
        services.client = 'down';
      }
    }

    const isHealthy = Object.entries(services)
      .filter(([name]) => name !== 'client')
      .every(([_, status]) => status === 'up');

    const payload = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString(),
    } as const;

    if (!isHealthy) {
      throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return payload;
  }

  private verifyJwtToken(token: string): {
    userId: string;
    username: string;
    isAuthenticated: boolean;
    loginTime: string;
  } {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid session token');
    }

    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as {
        userId: string;
        username: string;
        isAuthenticated: boolean;
        loginTime: string;
      };

      if (!payload.userId || !payload.username) {
        throw new UnauthorizedException('Invalid session payload');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }
  }

  private createUnlockTicket(userId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        exp: Date.now() + 5 * 60 * 1000,
      }),
    ).toString('base64url');
    const signature = Buffer.from(`${payload}.moneyup-unlock`).toString('base64url');
    return `${payload}.${signature}`;
  }

  private verifyUnlockTicket(ticket: string, userId: string): boolean {
    const [payload, signature] = ticket.split('.');
    if (!payload || !signature) return false;
    const expectedSignature = Buffer.from(`${payload}.moneyup-unlock`).toString('base64url');
    if (signature !== expectedSignature) return false;

    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        userId: string;
        exp: number;
      };
      if (decoded.userId !== userId) return false;
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  }

  private async resolveAiPayload(
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
      model: string;
      prompt: string;
      apiKey?: string;
      temperature?: number;
      maxTokens?: number;
    },
    request?: Request,
  ): Promise<{
    provider: 'openai' | 'claude' | 'gemini';
    model: string;
    prompt: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
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
    const session = this.verifyJwtToken(sessionToken);

    const cfg = await firstValueFrom(
      this.usersServiceClient
        .send<{
          activeAiProvider: 'openai' | 'claude' | 'gemini' | null;
          preferredModel: string | null;
          decryptedApiKey: string | null;
        }>('user_get_ai_config', session.userId)
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

    const session = this.verifyJwtToken(sessionToken);
    const cfg = await firstValueFrom(
      this.usersServiceClient
        .send<{
          activeAiProvider: 'openai' | 'claude' | 'gemini' | null;
          decryptedApiKey: string | null;
        }>('user_get_ai_config', session.userId)
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

  private toPublicUser(user: UserPayload) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isLocked: user.isLocked ?? false,
      activeAiProvider: user.activeAiProvider ?? null,
      preferredModel: user.preferredModel ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private parseOptionalNumber(value?: string): number | undefined {
    if (typeof value === 'undefined') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
