import { Inject, Injectable, MessageEvent } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';

export type SyncPhase =
  | 'initializing'
  | 'syncing_scrapers'
  | 'recomputing_spending'
  | 'finalizing';

export type SyncStatus = 'idle' | 'running' | 'done' | 'failed';

export type SyncJobSnapshot = {
  jobId: string;
  status: SyncStatus;
  phase: SyncPhase | null;
  progress: number;
  message: string;
  source: 'initial' | 'manual';
  syncPolicy?: 'initial_delta' | 'manual_range' | 'full_fallback';
  startDate?: string;
  endDate?: string;
  sourcesChecked?: number;
  sourcesScraped?: number;
  sourcesSkippedCovered?: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
  cooldownBlockedUntil?: string;
  cooldownRemainingMs?: number;
  currentlySyncing?: string | null;
};

type SyncListener = (event: string, snapshot: SyncJobSnapshot) => void;

@Injectable()
export class SyncJobService {
  private readonly defaultInitialAutoSyncCooldownMs = 30 * 60 * 1000;
  private readonly syncJobs = new Map<string, SyncJobSnapshot>();
  private readonly syncRunningPromises = new Map<string, Promise<void>>();
  private readonly syncStreams = new Map<string, Set<Subject<MessageEvent>>>();
  private readonly syncListeners = new Map<string, Set<SyncListener>>();
  private readonly initialAutoSyncBlockedUntil = new Map<string, number>();

  constructor(
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('USERS_SERVICE')
    private readonly usersServiceClient: ClientProxy,
  ) {}

  getIdleSnapshot(source: 'initial' | 'manual' = 'manual'): SyncJobSnapshot {
    const now = new Date().toISOString();
    return {
      jobId: '',
      status: 'idle',
      phase: null,
      progress: 0,
      message: '',
      source,
      startedAt: now,
      updatedAt: now,
      currentlySyncing: null,
    };
  }

  getSnapshot(userId: string): SyncJobSnapshot {
    const snapshot = this.syncJobs.get(userId) ?? this.getIdleSnapshot();
    return this.decorateSnapshotWithCooldown(userId, snapshot);
  }

  isRunning(userId: string): boolean {
    return this.syncJobs.get(userId)?.status === 'running';
  }

  canAutoStartInitial(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): boolean {
    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    const blockedUntil = this.initialAutoSyncBlockedUntil.get(key);
    if (!blockedUntil) return true;
    if (Date.now() >= blockedUntil) {
      this.initialAutoSyncBlockedUntil.delete(key);
      return true;
    }
    return false;
  }

  private markInitialAutoSyncFailure(
    userId: string,
    startDate?: string,
    endDate?: string,
    cooldownMs?: number,
  ): void {
    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    this.initialAutoSyncBlockedUntil.set(
      key,
      Date.now() + (cooldownMs ?? this.defaultInitialAutoSyncCooldownMs),
    );
  }

  private clearInitialAutoSyncFailure(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): void {
    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    this.initialAutoSyncBlockedUntil.delete(key);
  }

  private buildInitialAutoSyncKey(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): string {
    return `${userId}|${startDate ?? ''}|${endDate ?? ''}`;
  }

  private getInitialAutoSyncCooldownInfo(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): { cooldownBlockedUntil: string; cooldownRemainingMs: number } | null {
    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    const blockedUntil = this.initialAutoSyncBlockedUntil.get(key);
    if (!blockedUntil) return null;
    if (Date.now() >= blockedUntil) {
      this.initialAutoSyncBlockedUntil.delete(key);
      return null;
    }

    return {
      cooldownBlockedUntil: new Date(blockedUntil).toISOString(),
      cooldownRemainingMs: Math.max(0, blockedUntil - Date.now()),
    };
  }

  private decorateSnapshotWithCooldown(
    userId: string,
    snapshot: SyncJobSnapshot,
  ): SyncJobSnapshot {
    if (snapshot.source !== 'initial' || snapshot.status !== 'failed') {
      return {
        ...snapshot,
        cooldownBlockedUntil: undefined,
        cooldownRemainingMs: undefined,
      };
    }

    const cooldown = this.getInitialAutoSyncCooldownInfo(
      userId,
      snapshot.startDate,
      snapshot.endDate,
    );
    if (!cooldown) {
      return {
        ...snapshot,
        cooldownBlockedUntil: undefined,
        cooldownRemainingMs: undefined,
      };
    }

    return {
      ...snapshot,
      ...cooldown,
    };
  }

  subscribeStream(userId: string, stream: Subject<MessageEvent>): () => void {
    const streams =
      this.syncStreams.get(userId) ?? new Set<Subject<MessageEvent>>();
    streams.add(stream);
    this.syncStreams.set(userId, streams);

    stream.next({
      type: 'job_snapshot',
      data: this.getSnapshot(userId),
    });

    return () => {
      const currentStreams = this.syncStreams.get(userId);
      if (!currentStreams) return;
      currentStreams.delete(stream);
      if (currentStreams.size === 0) {
        this.syncStreams.delete(userId);
      }
    };
  }

  subscribeListener(userId: string, listener: SyncListener): () => void {
    const listeners = this.syncListeners.get(userId) ?? new Set<SyncListener>();
    listeners.add(listener);
    this.syncListeners.set(userId, listeners);
    listener('job_snapshot', this.getSnapshot(userId));

    return () => {
      const currentListeners = this.syncListeners.get(userId);
      if (!currentListeners) return;
      currentListeners.delete(listener);
      if (currentListeners.size === 0) {
        this.syncListeners.delete(userId);
      }
    };
  }

  startOrReuseSyncJob(
    userId: string,
    source: 'initial' | 'manual',
    startDate?: string,
    endDate?: string,
  ): { snapshot: SyncJobSnapshot; reused: boolean } {
    const running = this.syncRunningPromises.get(userId);
    const current = this.syncJobs.get(userId);

    if (running && current?.status === 'running') {
      if (current.source !== source) {
        this.patchSyncJob(userId, {
          source,
          startDate: startDate ?? current.startDate,
          endDate: endDate ?? current.endDate,
        });
      }
      return {
        snapshot: this.syncJobs.get(userId) ?? current,
        reused: true,
      };
    }

    const now = new Date().toISOString();
    const fresh: SyncJobSnapshot = {
      jobId: `${userId}:${Date.now()}`,
      status: 'running',
      phase: 'initializing',
      progress: 2,
      message: 'מכין סנכרון נתונים',
      source,
      syncPolicy:
        source === 'initial'
          ? 'initial_delta'
          : startDate || endDate
            ? 'manual_range'
            : 'full_fallback',
      startDate,
      endDate,
      startedAt: now,
      updatedAt: now,
      currentlySyncing: null,
    };
    this.publishSyncEvent(userId, 'job_update', fresh);
    const promise = this.runSyncJob(userId);
    this.syncRunningPromises.set(userId, promise);
    return { snapshot: fresh, reused: false };
  }

  private publishSyncEvent(
    userId: string,
    event: string,
    snapshot: SyncJobSnapshot,
  ): void {
    const decorated = this.decorateSnapshotWithCooldown(userId, snapshot);
    this.syncJobs.set(userId, decorated);

    const streams = this.syncStreams.get(userId);
    if (streams) {
      for (const stream of streams) {
        stream.next({
          type: event,
          data: decorated,
        });
      }
    }

    const listeners = this.syncListeners.get(userId);
    if (listeners) {
      for (const listener of listeners) {
        listener(event, decorated);
      }
    }
  }

  patchSyncJob(
    userId: string,
    patch: Partial<SyncJobSnapshot>,
    event = 'job_update',
  ): SyncJobSnapshot {
    const prev = this.syncJobs.get(userId) ?? this.getIdleSnapshot();
    const next: SyncJobSnapshot = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.publishSyncEvent(userId, event, next);
    return next;
  }

  private startPhaseProgressTicker(
    userId: string,
    floor: number,
    cap: number,
    message: string,
  ): () => void {
    const timer = setInterval(() => {
      const current = this.syncJobs.get(userId);
      if (!current || current.status !== 'running') return;
      const base = Number.isFinite(current.progress) ? current.progress : floor;
      if (base >= cap) return;
      const step = Math.max(0.4, Math.min(2.4, (cap - base) * 0.12));
      this.patchSyncJob(userId, {
        progress: Math.min(cap, base + step),
        message,
      });
    }, 900);
    return () => clearInterval(timer);
  }

  private async runSyncJob(userId: string): Promise<void> {
    const existing = this.syncJobs.get(userId);
    const syncSource = existing?.source ?? 'manual';
    const startedAt = new Date().toISOString();
    let initialAutoSyncCooldownMs = this.defaultInitialAutoSyncCooldownMs;

    this.patchSyncJob(userId, {
      status: 'running',
      phase: 'initializing',
      progress: 8,
      message:
        syncSource === 'initial'
          ? 'בודק כיסוי נתונים שמור ומכין סנכרון דלתא'
          : 'מתחיל סנכרון נתונים',
      startedAt,
      updatedAt: startedAt,
    });

    try {
      const { count } = await firstValueFrom(
        this.scraperServiceClient
          .send<{ count: number }>('get_user_connections_count', { userId })
          .pipe(timeout(5000)),
      );

      if (count === 0) {
        this.patchSyncJob(
          userId,
          {
            status: 'done',
            phase: null,
            progress: 100,
            message: 'לא נמצאו חשבונות לסנכרון',
            currentlySyncing: null,
          },
          'job_done',
        );
        return;
      }

      this.patchSyncJob(userId, {
        status: 'running',
        phase: 'syncing_scrapers',
        progress: 45,
        message: 'מסנכרן חשבונות ותנועות ממקורות מחוברים',
      });

      const profile = await firstValueFrom(
        this.usersServiceClient
          .send<{
            scraperTimeoutRetryCount?: number;
            scraperAutoSyncCooldownSeconds?: number;
            scraperShowBrowser?: boolean;
            scraperLoginTimeoutSeconds?: number;
            scraperDefaultTimeoutSeconds?: number;
            scraperChromiumPath?: string;
          } | null>('user_find_one', userId)
          .pipe(timeout(5000)),
      );
      const timeoutRetryCount = Math.max(
        0,
        Math.min(5, Number(profile?.scraperTimeoutRetryCount ?? 1)),
      );
      initialAutoSyncCooldownMs = Math.max(
        0,
        Math.min(
          1440 * 60 * 1000,
          Number(profile?.scraperAutoSyncCooldownSeconds ?? 1800) * 1000,
        ),
      );
      const stopScrapersTicker = this.startPhaseProgressTicker(
        userId,
        45,
        72,
        'מסנכרן חשבונות ותנועות ממקורות מחוברים',
      );

      try {
        const latest = this.syncJobs.get(userId);

        await firstValueFrom(
          this.scraperServiceClient
            .send<unknown[]>('sync_accounts', {
              userId,
              mode: syncSource,
              startDate: latest?.startDate,
              endDate: latest?.endDate,
              timeoutRetryCount,
              showBrowser: profile?.scraperShowBrowser,
              loginTimeoutSeconds: profile?.scraperLoginTimeoutSeconds,
              defaultTimeoutSeconds: profile?.scraperDefaultTimeoutSeconds,
              executablePath: profile?.scraperChromiumPath,
              sessionId: latest?.jobId,
            })
            .pipe(timeout(120000)),
        );
      } finally {
        stopScrapersTicker();
      }

      this.patchSyncJob(userId, {
        status: 'running',
        phase: 'recomputing_spending',
        progress: 78,
        message: 'מכין נתוני הוצאות מעודכנים',
      });
      const stopRecomputeTicker = this.startPhaseProgressTicker(
        userId,
        78,
        91,
        'מכין נתוני הוצאות מעודכנים',
      );
      await new Promise((resolve) => setTimeout(resolve, 900));
      stopRecomputeTicker();

      this.patchSyncJob(userId, {
        status: 'running',
        phase: 'finalizing',
        progress: 95,
        message: 'מסיים את הסנכרון',
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.patchSyncJob(
        userId,
        {
          status: 'done',
          phase: null,
          progress: 100,
          message: 'הסנכרון הושלם בהצלחה',
          currentlySyncing: null,
        },
        'job_done',
      );
      if (syncSource === 'initial') {
        const latest = this.syncJobs.get(userId);
        this.clearInitialAutoSyncFailure(
          userId,
          latest?.startDate,
          latest?.endDate,
        );
      }
    } catch (error: any) {
      if (syncSource === 'initial') {
        const latest = this.syncJobs.get(userId);
        this.markInitialAutoSyncFailure(
          userId,
          latest?.startDate,
          latest?.endDate,
          initialAutoSyncCooldownMs,
        );
      }
      this.patchSyncJob(
        userId,
        {
          status: 'failed',
          phase: null,
          progress: 100,
          message: 'הסנכרון נכשל',
          error: error?.message ?? 'unknown_error',
          currentlySyncing: null,
        },
        'job_failed',
      );
    } finally {
      this.syncRunningPromises.delete(userId);
    }
  }
}
