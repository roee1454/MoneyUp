import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Post,
  Query,
  Req,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SyncJobService } from '../sync/sync-job.service';
import { ScraperService } from './scraper.service';
import { UsersService } from '../users/users.service';
import { requireSessionUserId, verifyJwtToken } from '../../utils/auth.utils';
import { ConnectScraperDto, SubmitChallengeDto } from '@money-up/types';

@Controller('scrapers')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly usersService: UsersService,
    private readonly syncJobService: SyncJobService,
  ) {}

  @Get()
  async getScrapersList() {
    return this.scraperService.getScrapersList();
  }

  @Get('detect')
  async detectScraperChromium(@Req() request: Request) {
    requireSessionUserId(request);
    return this.scraperService.detectChromium();
  }

  @Post('install')
  async installScraperChromium(@Req() request: Request) {
    requireSessionUserId(request);
    return this.scraperService.installChromium();
  }

  @Sse('install/stream')
  installScraperChromiumStream(
    @Req() request: Request,
  ): Observable<MessageEvent> {
    requireSessionUserId(request);
    return this.scraperService
      .installChromiumStream()
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

    const response = await this.scraperService.getConnectedAccounts({
      userId: user.userId,
      fresh: forceFresh,
      startDate,
      endDate,
    });

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
    const profile = await this.usersService.findOne(userId);

    const response = await this.scraperService.scrapeAndConnect({
      userId,
      bankId: payload.bankId,
      credentials: payload.credentials as any,
      startDate: payload.startDate,
      showBrowser: profile?.scraperShowBrowser,
      loginTimeoutSeconds: profile?.scraperLoginTimeoutSeconds,
      defaultTimeoutSeconds: profile?.scraperDefaultTimeoutSeconds,
      executablePath: profile?.scraperChromiumPath,
    });

    return response;
  }

  @Post('disconnect')
  async disconnectScraper(
    @Body() payload: { bankId: string },
    @Req() request: Request,
  ) {
    const userId = requireSessionUserId(request);
    return this.scraperService.disconnectScraper({
      userId,
      bankId: payload.bankId,
    });
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

    const response = await this.scraperService.getScraperStatus({ sessionId });
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

    const response = await this.scraperService.submitChallenge({
      sessionId: payload.sessionId,
      code: payload.code,
    });

    return response;
  }
}
