import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  closeScraperSocket,
  emitScraperSocket,
  getScraperSocket,
} from '@/lib/scraper-socket';
import { useAppStore } from '@/store';

type SyncStartResponse = {
  jobId: string;
  reused: boolean;
  status: 'idle' | 'running' | 'done' | 'failed';
  phase: string | null;
  progress: number;
  message: string;
  source: 'initial' | 'manual';
  startDate?: string;
  endDate?: string;
  startedAt: string;
  updatedAt: string;
  cooldownBlockedUntil?: string;
  cooldownRemainingMs?: number;
  currentlySyncing?: string | null;
};

type SyncEventPayload = {
  jobId?: string;
  status?: 'idle' | 'running' | 'done' | 'failed';
  phase?: string | null;
  progress?: number;
  message?: string;
  source?: 'initial' | 'manual';
  startDate?: string;
  endDate?: string;
  error?: string;
  cooldownBlockedUntil?: string;
  cooldownRemainingMs?: number;
  startedAt?: string;
  updatedAt?: string;
  currentlySyncing?: string | null;
};

/**
 * Triggers the start of a global accounts and transactions synchronization.
 *
 * @returns The React Query mutation object for starting the synchronization.
 */
export function useStartGlobalSync() {
  const setSync = useAppStore((s) => s.setSync);

  return useMutation({
    mutationFn: (mode: 'initial' | 'manual') =>
      emitScraperSocket<SyncStartResponse>('sync:start', { mode }),
    onSuccess: (data) => {
      setSync({
        jobId: data.jobId,
        status: data.status === 'running' ? 'running' : data.status,
        phase: data.phase,
        serverProgress: data.progress,
        displayProgress: data.progress,
        message: data.message,
        source: data.source,
        error: null,
        cooldownBlockedUntil: data.cooldownBlockedUntil ?? null,
        cooldownRemainingMs: data.cooldownRemainingMs ?? null,
        rangeStartDate: data.startDate ?? null,
        rangeEndDate: data.endDate ?? null,
        startedAt: data.startedAt,
        updatedAt: data.updatedAt,
        visible: data.status === 'running',
        currentlySyncing: data.currentlySyncing ?? null,
      });
    },
  });
}

/**
 * Manages the global synchronization state by setting up socket event listeners
 * and updating the sync state in the application store.
 *
 * @param enabled - Whether the sync manager is active.
 */
export function useGlobalSyncManager(enabled: boolean) {
  const queryClient = useQueryClient();
  const setSync = useAppStore((s) => s.setSync);
  const resetSync = useAppStore((s) => s.resetSync);

  useEffect(() => {
    if (!enabled) {
      resetSync();
      return;
    }

    let isActive = true;
    const handlePayload = (
      payload: SyncEventPayload,
      fallbackType?: string,
    ) => {
      if (!isActive) return;
      const normalizedStatus =
        payload.status === 'running' ||
        payload.status === 'done' ||
        payload.status === 'failed'
          ? payload.status
          : fallbackType === 'job_failed'
            ? 'failed'
            : fallbackType === 'job_done'
              ? 'done'
              : 'idle';

      const isSnapshot = fallbackType === 'job_snapshot';
      const isDone = normalizedStatus === 'done';
      const isFailed = normalizedStatus === 'failed';
      const isRunning = normalizedStatus === 'running';

      const userId = useAppStore.getState().session?.userId;
      const dismissedJobId = userId
        ? localStorage.getItem(`moneyup_dismissed_sync_error_${userId}`)
        : null;

      const isDismissed = payload.jobId && dismissedJobId === payload.jobId;
      const shouldBeVisible =
        isRunning ||
        (isFailed && !isDismissed) ||
        (isDone && !isSnapshot);
      const currentSync = useAppStore.getState().sync;

      setSync({
        jobId: payload.jobId ?? null,
        status: normalizedStatus,
        phase: payload.phase ?? null,
        serverProgress: Number.isFinite(payload.progress)
          ? Number(payload.progress)
          : isDone
            ? 100
            : 0,
        displayProgress:
          isDone || isFailed
            ? 100
            : currentSync.jobId !== payload.jobId &&
                Number.isFinite(payload.progress)
              ? Number(payload.progress)
              : currentSync.displayProgress,
        message: payload.message ?? '',
        source: payload.source ?? null,
        error: payload.error ?? null,
        cooldownBlockedUntil:
          payload.cooldownBlockedUntil ??
          currentSync.cooldownBlockedUntil,
        cooldownRemainingMs:
          typeof payload.cooldownRemainingMs === 'number'
            ? payload.cooldownRemainingMs
            : currentSync.cooldownRemainingMs,
        rangeStartDate:
          payload.startDate ?? currentSync.rangeStartDate,
        rangeEndDate:
          payload.endDate ?? currentSync.rangeEndDate,
        startedAt: payload.startedAt ?? currentSync.startedAt,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        visible: shouldBeVisible,
        challenge: normalizedStatus === 'running' && payload.phase === 'syncing_scrapers' ? currentSync.challenge : null,
        currentlySyncing:
          payload.currentlySyncing !== undefined
            ? payload.currentlySyncing
            : currentSync.currentlySyncing,
      });

      if (isDone) {
        void queryClient.invalidateQueries({
          queryKey: ['connected-accounts'],
        });
        void queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
        void queryClient.invalidateQueries({
          queryKey: ['spending-scans-debug'],
        });
        window.setTimeout(() => {
          setSync({
            visible: false,
            status: 'idle',
            message: '',
            error: null,
            cooldownBlockedUntil: null,
            cooldownRemainingMs: null,
          });
        }, 2000);
      }
    };

    const socket = getScraperSocket();

    const handleSyncEvent = (payload: {
      event?: string;
      snapshot?: SyncEventPayload;
    }) => {
      if (!payload.snapshot) return;
      handlePayload(payload.snapshot, payload.event);
    };

    const handleScraperChallenge = (payload: {
      sessionId: string;
      challenge: { type: string; message: string; bankId?: string };
    }) => {
      if (!isActive) return;
      setSync({
        jobId: payload.sessionId,
        status: 'running',
        visible: true,
        challenge: payload.challenge,
      });
    };

    const handleConnectError = () => {
      if (!isActive) return;
      setSync({
        status: 'reconnecting',
        visible: true,
        message: 'מחדש חיבור לעדכוני סנכרון...',
      });
    };

    const handleConnect = () => {
      if (!isActive) return;
      if (useAppStore.getState().sync.status === 'reconnecting') {
        setSync({
          status: 'idle',
          visible: false,
          message: '',
        });
      }
    };

    socket.on('sync:event', handleSyncEvent);
    socket.on('scraper:challenge', handleScraperChallenge);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleConnectError);
    socket.on('connect', handleConnect);

    void emitScraperSocket<SyncEventPayload>('sync:snapshot')
      .then((snapshot) => {
        handlePayload(snapshot, 'job_snapshot');
      })
      .catch(() => {
        if (!isActive) return;
        setSync({
          status: 'reconnecting',
          visible: true,
          message: 'מחדש חיבור לעדכוני סנכרון...',
        });
      });

    return () => {
      isActive = false;
      socket.off('sync:event', handleSyncEvent);
      socket.off('scraper:challenge', handleScraperChallenge);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleConnectError);
      socket.off('connect', handleConnect);
    };
  }, [enabled, queryClient, resetSync, setSync]);

  useEffect(() => {
    if (enabled) return;
    closeScraperSocket();
  }, [enabled]);

  useEffect(() => {
    let interval: number | null = null;
    
    const startInterval = () => {
      if (interval) return;
      interval = window.setInterval(() => {
        const state = useAppStore.getState().sync;
        if (state.status !== 'running') {
          if (interval) {
            window.clearInterval(interval);
            interval = null;
          }
          return;
        }

        const delta = state.serverProgress - state.displayProgress;
        if (delta <= 0) return;
        
        const step = Math.max(0.3, Math.min(2.2, delta * 0.22));
        const next = Math.min(state.serverProgress, state.displayProgress + step);
        
        setSync({ displayProgress: next });
      }, 140);
    };

    const unsubscribe = useAppStore.subscribe(
      (state) => state.sync.status,
      (status: string) => {
        if (status === 'running') {
          startInterval();
        } else if (interval) {
          window.clearInterval(interval);
          interval = null;
        }
      }
    );

    if (useAppStore.getState().sync.status === 'running') {
      startInterval();
    }

    return () => {
      unsubscribe();
      if (interval) window.clearInterval(interval);
    };
  }, [setSync]);
}
