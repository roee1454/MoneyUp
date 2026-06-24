import { Inject, Injectable, MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

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

import { ScraperService } from '../scraper/scraper.service';
import { UsersService } from '../users/users.service';

/**
 * Service orchestrating scraping synchronization jobs for users.
 * Manages active job state snapshots, progress tickers, job streams (RxJS Subjects),
 * listener callbacks, and auto-sync rate-limiting cooldown blocks.
 */
@Injectable()
export class SyncJobService {
  private readonly defaultInitialAutoSyncCooldownMs = 30 * 60 * 1000;
  private readonly syncJobs = new Map<string, SyncJobSnapshot>();
  private readonly syncRunningPromises = new Map<string, Promise<void>>();
  private readonly syncStreams = new Map<string, Set<Subject<MessageEvent>>>();
  private readonly syncListeners = new Map<string, Set<SyncListener>>();
  private readonly initialAutoSyncBlockedUntil = new Map<string, number>();

  constructor(
    private readonly scraperService: ScraperService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Generates a default static snapshot representing an idle sync job.
   *
   * @param source The sync job trigger source ('initial' or 'manual').
   * @returns SyncJobSnapshot representing the idle status.
   */
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

  /**
   * Retrieves the current sync job snapshot for a user, decorated with cooldown stats.
   *
   * @param userId Target user ID.
   * @returns SyncJobSnapshot representing the current job state.
   */
  getSnapshot(userId: string): SyncJobSnapshot {
    const snapshot = this.syncJobs.get(userId) ?? this.getIdleSnapshot();
    return this.decorateSnapshotWithCooldown(userId, snapshot);
  }

  /**
   * Checks whether a user currently has an active, running sync job.
   *
   * @param userId Target user ID.
   * @returns True if job status is 'running', false otherwise.
   */
  isRunning(userId: string): boolean {
    return this.syncJobs.get(userId)?.status === 'running';
  }

  /**
   * Evaluates if a user is permitted to auto-start an initial scraping job.
   * Checks if an active cooldown block exists.
   *
   * @param userId Target user ID.
   * @param startDate Optional sync start boundary.
   * @param endDate Optional sync end boundary.
   * @returns True if allowed to trigger immediately, false if blocked by cooldown.
   */
  canAutoStartInitial(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): boolean {
    const currentJob = this.syncJobs.get(userId);
    if (currentJob && currentJob.status === 'failed') {
      return false;
    }

    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    const blockedUntil = this.initialAutoSyncBlockedUntil.get(key);
    if (!blockedUntil) return true;
    if (Date.now() >= blockedUntil) {
      this.initialAutoSyncBlockedUntil.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Registers a cooldown block on initial auto-sync attempts after a scraping failure.
   */
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

  /**
   * Wipes any existing auto-sync cooldown blocks for a user.
   */
  private clearInitialAutoSyncFailure(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): void {
    const key = this.buildInitialAutoSyncKey(userId, startDate, endDate);
    this.initialAutoSyncBlockedUntil.delete(key);
  }

  /**
   * Formulates a unique tracking key for initial auto-sync tasks.
   */
  private buildInitialAutoSyncKey(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): string {
    return userId;
  }

  /**
   * Resolves timestamps for active cooldown periods on auto-sync tasks.
   */
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

  /**
   * Injects cooldown meta details into a target sync job snapshot.
   */
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

  /**
   * Subscribes an RxJS Subject to receive real-time sync progress updates for a user.
   * Immediately delivers the latest state snapshot to the stream.
   *
   * @param userId Target user ID.
   * @param stream The RxJS Subject to push updates into.
   * @returns Unsubscribe function to clean up connection.
   */
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

  /**
   * Registers a callback listener to trace sync progress snapshots for a user.
   * Immediately invokes the callback with the latest snapshot.
   *
   * @param userId Target user ID.
   * @param listener Callback function receiving event name and snapshot object.
   * @returns Unsubscribe function to clean up listener.
   */
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

  /**
   * Starts a new synchronization job for a user or returns the existing running job if one is already in flight.
   *
   * @param userId Target user ID.
   * @param source Sync trigger mode ('initial' or 'manual').
   * @param startDate Optional range start date.
   * @param endDate Optional range end date.
   * @returns Object containing the sync snapshot and a reused boolean flag.
   */
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

  /**
   * Applies updates to a user's running or completed sync job state.
   * Automatically updates the updatedAt timestamp and broadcasts updates to subscribers.
   *
   * @param userId Target user ID.
   * @param patch The partial snapshot state changes.
   * @param event The event code (defaults to 'job_update').
   * @returns SyncJobSnapshot The complete updated snapshot state.
   */
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

  /**
   * Executes the asynchronous processing pipeline for a synchronization job.
   * Orchestrates the phases sequentially:
   * 1. 'initializing': queries active connections count.
   * 2. 'syncing_scrapers': calls ScraperService.syncAccounts to login and scrape new transactions.
   * 3. 'recomputing_spending': recalculates category aggregates.
   * 4. 'finalizing': updates cooldowns and concludes state to 'done' or 'failed'.
   */
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
      const { count } = await this.scraperService.getUserConnectionsCount({
        userId,
      });

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

      const profile = await this.usersService.findOne(userId);
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

        await this.scraperService.syncAccounts({
          userId,
          mode: syncSource,
          startDate: latest?.startDate,
          endDate: latest?.endDate,
          showBrowser: profile?.scraperShowBrowser,
          loginTimeoutSeconds: profile?.scraperLoginTimeoutSeconds,
          defaultTimeoutSeconds: profile?.scraperDefaultTimeoutSeconds,
          sessionId: latest?.jobId,
        });
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
