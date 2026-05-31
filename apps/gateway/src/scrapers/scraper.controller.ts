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
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom, Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { SyncJobService } from '../sync/sync-job.service';
import { UserPayload } from '../types/gateway.types';
import { requireSessionUserId, verifyJwtToken } from '../utils/auth.utils';
import { ConnectScraperDto, SubmitChallengeDto } from '@money-up/types';

@Controller('scrapers')
export class ScraperController {
  constructor(
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
    private readonly syncJobService: SyncJobService,
  ) {}

  @Get()
  async getScrapersList() {
    return firstValueFrom(
      this.scraperServiceClient.send('scrapers_list', {}).pipe(timeout(2000)),
    );
  }

  @Get('detect')
  async detectScraperChromium(@Req() request: Request) {
    requireSessionUserId(request);
    return firstValueFrom(
      this.scraperServiceClient
        .send('scraper_detect_chromium', {})
        .pipe(timeout(10000)),
    );
  }

  @Post('install')
  async installScraperChromium(@Req() request: Request) {
    requireSessionUserId(request);
    return firstValueFrom(
      this.scraperServiceClient
        .send('scraper_install_chromium', {})
        .pipe(timeout(600000)), // 10 minutes timeout for download
    );
  }

  @Sse('install/stream')
  installScraperChromiumStream(
    @Req() request: Request,
  ): Observable<MessageEvent> {
    requireSessionUserId(request);
    return this.scraperServiceClient
      .send('scraper_install_chromium_stream', {})
      .pipe(map((data) => ({ data }) as MessageEvent));
  }

  @Get('accounts')
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
    const user = verifyJwtToken(sessionToken);
    const forceFresh = String(fresh ?? '').toLowerCase() === 'true';

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send<{ accounts: any[]; isCovered: boolean }>(
          'get_connected_accounts',
          {
            userId: user.userId,
            fresh: forceFresh,
            startDate,
            endDate,
          },
        )
        .pipe(timeout(60000)),
    );

    if (forceFresh || !response.isCovered) {
      const source: 'manual' | 'initial' = forceFresh ? 'manual' : 'initial';
      const canAutoStartInitial =
        source !== 'initial' ||
        this.syncJobService.canAutoStartInitial(
          user.userId,
          startDate,
          endDate,
        );

      if (!this.syncJobService.isRunning(user.userId) && canAutoStartInitial) {
        this.syncJobService.startOrReuseSyncJob(
          user.userId,
          source,
          startDate,
          endDate,
        );
      }
    }

    return response.accounts;
  }

  @Post('sync')
  async syncAccounts(
    @Req() request: Request,
    @Body() payload?: { startDate?: string; endDate?: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = requireSessionUserId(request);
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

  @Post('connect')
  async connectScraper(
    @Body() payload: ConnectScraperDto,
    @Req() request: Request,
  ) {
    const userId = requireSessionUserId(request);

    // Fetch user settings to pass them to the scraper
    const profile = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', userId)
        .pipe(timeout(5000)),
    );

    const response = await firstValueFrom(
      this.scraperServiceClient
        .send('scrape_and_connect', {
          userId,
          bankId: payload.bankId,
          credentials: payload.credentials,
          startDate: payload.startDate,
          showBrowser: profile?.scraperShowBrowser,
          loginTimeoutSeconds: profile?.scraperLoginTimeoutSeconds,
          defaultTimeoutSeconds: profile?.scraperDefaultTimeoutSeconds,
          executablePath: profile?.scraperChromiumPath,
        })
        .pipe(timeout(180000)),
    );

    return response;
  }

  @Get('status')
  async getScraperStatus(
    @Query('sessionId') sessionId: string,
    @Req() request: Request,
  ) {
    requireSessionUserId(request);

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

  @Post('challenge/submit')
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
}
