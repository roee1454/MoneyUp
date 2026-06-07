import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  closeScraperSocket,
  emitScraperSocket,
  getScraperSocket,
} from '@/lib/scraper-socket';
import { useAppStore } from '@/store';
import { api } from '@/lib/api';
import type { BankAccount } from './useAccounts';

const SYNC_INITIAL_TRIGGERED = 'moneyup_sync_initial_triggered_v1';

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

      const shouldBeVisible = isRunning || isFailed || (isDone && !isSnapshot);
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
      .then((snapshot) => handlePayload(snapshot, 'job_snapshot'))
      .catch(() => {
        if (!isActive) return;
        setSync({
          status: 'reconnecting',
          visible: true,
          message: 'מחדש חיבור לעדכוני סנכרון...',
        });
      });

    const initialTriggered =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(SYNC_INITIAL_TRIGGERED) === '1';
    if (!initialTriggered) {
      void api
        .get<BankAccount[]>('/scrapers/accounts')
        .then((accounts) => {
          if (!isActive) return;
          if (accounts.length === 0) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(SYNC_INITIAL_TRIGGERED, '1');
            }
            return;
          }

          return emitScraperSocket<SyncStartResponse>('sync:start', {
            mode: 'initial',
          }).then((data) => {
            if (!isActive) return;
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
              challenge: null,
              currentlySyncing: data.currentlySyncing ?? null,
            });
          });
        })
        .catch(() => {
          if (!isActive) return;
          setSync({
            status: 'failed',
            visible: true,
            message: 'אירעה שגיאה בהפעלת סנכרון ראשוני',
          });
        })
        .finally(() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(SYNC_INITIAL_TRIGGERED, '1');
          }
        });
    }

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

  // Smoother, stable interval for progress updates
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

    // We only react to status changes to start/stop the interval
    // We use useAppStore.subscribe to watch status without re-rendering the whole hook scope
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

    // Initial check
    if (useAppStore.getState().sync.status === 'running') {
      startInterval();
    }

    return () => {
      unsubscribe();
      if (interval) window.clearInterval(interval);
    };
  }, [setSync]);
}
