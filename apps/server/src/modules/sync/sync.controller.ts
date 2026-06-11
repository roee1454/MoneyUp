import {
  Body,
  Controller,
  MessageEvent,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, Subject } from 'rxjs';
import { SyncJobService } from './sync-job.service';
import { requireSessionUserId } from '../../utils/auth.utils';

/**
 * NestJS Controller handling incoming HTTP requests for Sync.
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly syncJobService: SyncJobService) {}

  @Sse('events')
  streamSyncEvents(@Req() request: Request): Observable<MessageEvent> {
    const userId = requireSessionUserId(request);
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

  @Post('start')
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
    const userId = requireSessionUserId(request);
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
}
