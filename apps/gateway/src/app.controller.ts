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
import { firstValueFrom, Observable, Subject } from 'rxjs';
import { map, timeout } from 'rxjs/operators';

import { ConnectScraperDto, SubmitChallengeDto } from '@moneyup/types';
import { SyncJobService } from './sync-job.service';

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

type SpendingScanCategory = {
  name: string;
  amount: number;
  count: number;
};

type SpendingScansResponse = {
  totalIncome: number;
  totalExpenses: number;
  categories: SpendingScanCategory[];
  categoryTransactions: Record<
    string,
    Array<{
      transactionId: string;
      bankId: string;
      accountNumber: string;
      cardLast4?: string;
      merchant: string;
      date: string;
      amount: number;
      reason: string;
      confidence: number;
      tags: string[];
    }>
  >;
  unresolvedMerchants?: Array<{
    normalizedMerchant: string;
    displayMerchant: string;
  }>;
  debugTrace?: {
    period: 'current' | 'previous' | 'both';
    periodStartIso: string;
    periodEndIso: string;
    accountsSummary: Array<{
      bankId: string;
      accountNumber: string;
      isCreditCompany: boolean;
      transactionCount: number;
    }>;
    transactions: Array<{
      bankId: string;
      accountNumber: string;
      transactionId: string;
      date: string;
      amount: number;
      description: string;
      dedupKey: string;
      isCreditCompany: boolean;
      status: string;
      category?: string;
      reason: string;
    }>;
    finalTotals: {
      totalIncome: number;
      totalExpenses: number;
      categories: SpendingScanCategory[];
    };
  };
};

type UserAiConfig = {
  activeAiProvider: 'openai' | 'claude' | 'gemini' | null;
  preferredModel: string | null;
  decryptedApiKey: string | null;
};

@Controller()
export class AppController {
  private readonly spendingScansDebugEnabled =
    String(
      process.env.MONEYUP_SPENDING_SCANS_DEBUG ??
      process.env.MONEYUP_AI_SCANS_DEBUG ??
      '',
    ).toLowerCase() === 'true';
  private readonly aiCategoryBatchSize = Math.max(
    1,
    Number(process.env.MONEYUP_AI_CATEGORY_BATCH_SIZE ?? 50),
  );
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
    private readonly syncJobService: SyncJobService,
  ) { }

  @Get('ai')
  async getAiGreeting(): Promise<string> {
    return 'AI gateway endpoint is ready';
  }

  @Get('spending/scans')
  async getSpendingScans(
    @Req() request: Request,
    @Query('period') period?: 'current' | 'previous' | 'both',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpendingScansResponse> {
    const userId = this.requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(period);
    return this.computeSpendingScans(
      userId,
      undefined,
      normalizedPeriod,
      false,
      startDate,
      endDate,
    );
  }

  @Get('spending/scans/debug')
  async getSpendingScansDebug(
    @Req() request: Request,
    @Query('period') period?: 'current' | 'previous' | 'both',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpendingScansResponse> {
    const userId = this.requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(period);
    return this.computeSpendingScans(
      userId,
      undefined,
      normalizedPeriod,
      true,
      startDate,
      endDate,
    );
  }

  @Post('spending/scans/annotate')
  async annotateSpendingScans(
    @Req() request: Request,
    @Body()
    payload: {
      period?: 'current' | 'previous' | 'both';
      startDate?: string;
      endDate?: string;
    },
  ): Promise<SpendingScansResponse> {
    const userId = this.requireSessionUserId(request);
    const normalizedPeriod = this.normalizePeriod(payload.period);
    const result = await this.runSpendingAnnotationPass(
      userId,
      normalizedPeriod,
      payload.startDate,
      payload.endDate,
    );
    return result;
  }

  @Post('ai/verify')
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

  @Get('ai/models')
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

  @Post('ai/models')
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
    return firstValueFrom(
      this.aiServiceClient.send('ai_prompt', resolved).pipe(timeout(180000)),
    );
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
  async getConnectedAccounts(
    @Req() request: Request,
    @Query('fresh') fresh?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('לא נמצא סשן פעיל. אנא התחבר מחדש.');
    }
    const user = this.verifyJwtToken(sessionToken);
    const forceFresh = String(fresh ?? '').toLowerCase() === 'true';

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send<{ accounts: any[]; isCovered: boolean }>('get_connected_accounts', {
          userId: user.userId,
          fresh: forceFresh,
          startDate,
          endDate,
        })
        .pipe(timeout(60000)),
    );

    if (forceFresh || !response.isCovered) {
        if (!this.syncJobService.isRunning(user.userId)) {
            this.syncJobService.startOrReuseSyncJob(
                user.userId,
                forceFresh ? 'manual' : 'initial',
                startDate,
                endDate,
            );
        }
    }

    return response.accounts;
  }

  @Sse('sync/events')
  streamSyncEvents(@Req() request: Request): Observable<MessageEvent> {
    const userId = this.requireSessionUserId(request);
    const stream$ = new Subject<MessageEvent>();
    const unsubscribe = this.syncJobService.subscribeStream(userId, stream$);

    return new Observable<MessageEvent>((subscriber) => {
      const subscription = stream$.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        unsubscribe();
      };
    });
  }

  @Post('sync/start')
  async startSync(
    @Req() request: Request,
    @Body()
    payload?: {
      mode?: 'initial' | 'manual';
      startDate?: string;
      endDate?: string;
    },
    @Query('mode') mode?: 'initial' | 'manual',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = this.requireSessionUserId(request);
    const resolvedMode: 'initial' | 'manual' =
      mode === 'initial' || payload?.mode === 'initial' ? 'initial' : 'manual';
    const resolvedStartDate = startDate ?? payload?.startDate;
    const resolvedEndDate = endDate ?? payload?.endDate;
    const { snapshot, reused } = this.syncJobService.startOrReuseSyncJob(
      userId,
      resolvedMode,
      resolvedStartDate,
      resolvedEndDate,
    );
    return {
      jobId: snapshot.jobId,
      reused,
      status: snapshot.status,
      phase: snapshot.phase,
      progress: snapshot.progress,
      message: snapshot.message,
      source: snapshot.source,
      syncPolicy: snapshot.syncPolicy,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      sourcesChecked: snapshot.sourcesChecked,
      sourcesScraped: snapshot.sourcesScraped,
      sourcesSkippedCovered: snapshot.sourcesSkippedCovered,
      startedAt: snapshot.startedAt,
      updatedAt: snapshot.updatedAt,
    };
  }

  @Post('scrapers/sync')
  async syncAccounts(
    @Req() request: Request,
    @Body() payload?: { startDate?: string; endDate?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = this.requireSessionUserId(request);
    const resolvedStartDate = startDate ?? payload?.startDate;
    const resolvedEndDate = endDate ?? payload?.endDate;
    const { snapshot, reused } = this.syncJobService.startOrReuseSyncJob(
      userId,
      'manual',
      resolvedStartDate,
      resolvedEndDate,
    );
    return {
      jobId: snapshot.jobId,
      reused,
      status: snapshot.status,
      phase: snapshot.phase,
      progress: snapshot.progress,
      message: snapshot.message,
      source: snapshot.source,
      syncPolicy: snapshot.syncPolicy,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      sourcesChecked: snapshot.sourcesChecked,
      sourcesScraped: snapshot.sourcesScraped,
      sourcesSkippedCovered: snapshot.sourcesSkippedCovered,
      startedAt: snapshot.startedAt,
      updatedAt: snapshot.updatedAt,
    };
  }

  @Post('scrapers/connect')
  async connectScraper(
    @Body() payload: ConnectScraperDto,
    @Req() request: Request,
  ) {
    const userId = this.requireSessionUserId(request);

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('scrape_and_connect', {
          userId,
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
    const userId = this.requireSessionUserId(request);

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
    @Body()
    payload: { userId: string; username: string; unlockTicket?: string },
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
        throw new UnauthorizedException(
          'Profile is locked. Unlock key required.',
        );
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
    @Body()
    payload: {
      username: string;
      email: string;
      lockProfile?: boolean;
      unlockKey?: string;
    },
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
    const userId = this.requireSessionUserId(request);

    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_save_ai_config', {
          id: userId,
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
      this.usersServiceClient
        .send('user_update', { id, data })
        .pipe(timeout(2000)),
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
        .send('user_delete_confirmed', {
          id,
          confirmationEmail: payload.confirmationEmail,
        })
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
          await firstValueFrom(
            client.send<string>('ping', {}).pipe(timeout(500)),
          );
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

  private requireSessionUserId(request: Request): string {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('No active session found');
    }
    return this.verifyJwtToken(sessionToken).userId;
  }

  private async computeSpendingScans(
    userId: string,
    accountsOverride?: Array<{
      bankId: string;
      accountNumber: string;
      balance?: number;
      transactions: any[];
    }>,
    period: 'current' | 'previous' | 'both' = 'current',
    debug = false,
    startDate?: string,
    endDate?: string,
  ): Promise<SpendingScansResponse> {
    let accounts: any[];

    if (accountsOverride) {
      accounts = accountsOverride;
    } else {
      const response = await firstValueFrom(
        this.scraperServiceClient
          .send<{ accounts: any[]; isCovered: boolean }>(
            'get_connected_accounts',
            {
              userId,
              startDate,
              endDate,
            },
          )
          .pipe(timeout(60000)),
      );
      accounts = response.accounts;

      if (!response.isCovered) {
        if (!this.syncJobService.isRunning(userId)) {
            this.syncJobService.startOrReuseSyncJob(userId, 'initial', startDate, endDate);
        }
      }
    }

    if (this.spendingScansDebugEnabled) {
      const accountsSummary = (accounts ?? []).map((account) => ({
        bankId: account?.bankId,
        accountNumber: account?.accountNumber,
        transactionCount: Array.isArray(account?.transactions)
          ? account.transactions.length
          : 0,
      }));
      console.log('[SPENDING_SCANS_DEBUG] raw_accounts', {
        userId,
        period,
        accountsCount: accountsSummary.length,
        accountsSummary,
      });
    }

    const scanResult = await firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug,
        })
        .pipe(timeout(180000)),
    );

    if (this.spendingScansDebugEnabled) {
      console.log('[SPENDING_SCANS_DEBUG] computed_categories', {
        userId,
        period,
        totalIncome: scanResult.totalIncome,
        totalExpenses: scanResult.totalExpenses,
        categories: scanResult.categories.map((category) => ({
          name: category.name,
          amount: category.amount,
          count: category.count,
          transactionCount:
            scanResult.categoryTransactions?.[category.name]?.length ?? 0,
        })),
      });
    }

    return scanResult;
  }

  private async runSpendingAnnotationPass(
    userId: string,
    period: 'current' | 'previous' | 'both',
    startDate?: string,
    endDate?: string,
  ): Promise<SpendingScansResponse> {
    const response = await firstValueFrom(
      this.scraperServiceClient
        .send<{ accounts: any[]; isCovered: boolean }>('get_connected_accounts', {
          userId,
          startDate,
          endDate,
        })
        .pipe(timeout(60000)),
    );
    const accounts = response.accounts ?? [];
    const initial = await firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug: false,
        })
        .pipe(timeout(180000)),
    );
    const unresolvedMerchants = initial.unresolvedMerchants ?? [];
    if (unresolvedMerchants.length === 0) {
      return initial;
    }
    const aiCategoryAnnotations = await this.classifyUnknownMerchantsWithAi(
      userId,
      unresolvedMerchants,
    );
    if (aiCategoryAnnotations.length === 0) {
      return initial;
    }
    await firstValueFrom(
      this.scraperServiceClient
        .send('spending_upsert_annotations', {
          annotations: aiCategoryAnnotations,
        })
        .pipe(timeout(60000)),
    );
    return firstValueFrom(
      this.scraperServiceClient
        .send<SpendingScansResponse>('spending_scan_income', {
          accounts,
          period,
          startDate,
          endDate,
          debug: false,
        })
        .pipe(timeout(180000)),
    );
  }

  private async classifyUnknownMerchantsWithAi(
    userId: string,
    unresolved: Array<{ normalizedMerchant: string; displayMerchant: string }>,
  ): Promise<
    Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      source: 'ai';
      model?: string;
      confidence?: number;
    }>
  > {
    const cfg = await this.resolveUserAiConfig(userId);
    if (!cfg.activeAiProvider || !cfg.decryptedApiKey || !cfg.preferredModel) {
      return [];
    }

    const uniqueMap = new Map<string, string>();
    for (const item of unresolved) {
      const key = String(item.normalizedMerchant ?? '').trim();
      if (!key || uniqueMap.has(key)) continue;
      uniqueMap.set(key, item.displayMerchant || key);
    }
    const uniqueUnknowns = Array.from(uniqueMap.entries()).map(
      ([normalizedMerchant, displayMerchant]) => ({
        normalizedMerchant,
        displayMerchant,
      }),
    );
    const results: Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      source: 'ai';
      model?: string;
      confidence?: number;
    }> = [];

    for (let i = 0; i < uniqueUnknowns.length; i += this.aiCategoryBatchSize) {
      const chunk = uniqueUnknowns.slice(i, i + this.aiCategoryBatchSize);
      const prompt = this.buildMerchantCategorizationPrompt(chunk);
      const response = await firstValueFrom(
        this.aiServiceClient
          .send<{ text: string }>('ai_prompt', {
            provider: cfg.activeAiProvider,
            model: cfg.preferredModel,
            prompt,
            apiKey: cfg.decryptedApiKey,
            temperature: 0,
            maxTokens: 1200,
          })
          .pipe(timeout(120000)),
      );
      const parsed = this.parseCategoryAiResponse(response?.text ?? '');
      for (const item of chunk) {
        const match = parsed.get(item.normalizedMerchant);
        results.push({
          normalizedMerchant: item.normalizedMerchant,
          displayMerchant: item.displayMerchant,
          category: this.normalizeCategory(match?.category),
          source: 'ai',
          model: cfg.preferredModel,
          confidence: match?.confidence,
        });
      }
    }
    return results;
  }

  private buildMerchantCategorizationPrompt(
    items: Array<{ normalizedMerchant: string; displayMerchant: string }>,
  ): string {
    const categories = [
      'מזון',
      'ביגוד',
      'בידור',
      'בילויים',
      'אלקטרוניקה',
      'אונליין',
      'דלק/תחבורה',
      'סופר',
      'מנויים',
      'לא מסווג',
    ];
    return [
      'You classify merchants into one category.',
      `Allowed categories: ${categories.join(', ')}`,
      'Return ONLY strict JSON array with objects: { "normalizedMerchant": string, "category": string, "confidence": number }.',
      'If unsure, set category to "לא מסווג".',
      JSON.stringify(items),
    ].join('\n');
  }

  private parseCategoryAiResponse(
    raw: string,
  ): Map<string, { category: string; confidence?: number }> {
    const direct =
      this.tryParseJsonArray(raw) ??
      this.tryParseJsonArray(this.extractJsonBlock(raw));
    const map = new Map<string, { category: string; confidence?: number }>();
    for (const entry of direct ?? []) {
      if (!entry || typeof entry !== 'object') continue;
      const normalizedMerchant = String(
        (entry as any).normalizedMerchant ?? '',
      ).trim();
      if (!normalizedMerchant) continue;
      const category = String((entry as any).category ?? '').trim();
      const confidenceRaw = Number((entry as any).confidence);
      map.set(normalizedMerchant, {
        category,
        confidence: Number.isFinite(confidenceRaw) ? confidenceRaw : undefined,
      });
    }
    return map;
  }

  private tryParseJsonArray(
    value: string,
  ): Array<Record<string, unknown>> | null {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? (parsed as Array<Record<string, unknown>>)
        : null;
    } catch {
      return null;
    }
  }

  private extractJsonBlock(value: string): string {
    const start = value.indexOf('[');
    const end = value.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return '';
    return value.slice(start, end + 1);
  }

  private normalizeCategory(category: string | undefined): string {
    const allowed = new Set([
      'מזון',
      'ביגוד',
      'בידור',
      'בילויים',
      'אלקטרוניקה',
      'אונליין',
      'דלק/תחבורה',
      'סופר',
      'מנויים',
      'לא מסווג',
    ]);
    if (!category) return 'לא מסווג';
    return allowed.has(category) ? category : 'לא מסווג';
  }

  private normalizePeriod(period?: string): 'current' | 'previous' | 'both' {
    if (period === 'previous' || period === 'both' || period === 'current') {
      return period;
    }
    return 'current';
  }

  private async resolveUserAiConfig(userId: string): Promise<UserAiConfig> {
    return firstValueFrom(
      this.usersServiceClient
        .send<UserAiConfig>('user_get_ai_config', userId)
        .pipe(timeout(30000)),
    );
  }

  private createUnlockTicket(userId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        exp: Date.now() + 5 * 60 * 1000,
      }),
    ).toString('base64url');
    const signature = Buffer.from(`${payload}.moneyup-unlock`).toString(
      'base64url',
    );
    return `${payload}.${signature}`;
  }

  private verifyUnlockTicket(ticket: string, userId: string): boolean {
    const [payload, signature] = ticket.split('.');
    if (!payload || !signature) return false;
    const expectedSignature = Buffer.from(`${payload}.moneyup-unlock`).toString(
      'base64url',
    );
    if (signature !== expectedSignature) return false;

    try {
      const decoded = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as {
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

    const cfg = await this.resolveUserAiConfig(session.userId);

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
    const cfg = await this.resolveUserAiConfig(session.userId);

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
