import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  closeScraperSocket,
  emitScraperSocket,
  getScraperSocket,
} from '@/lib/scraper-socket';
import { useAppStore } from '@/store';

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
  startedAt?: string;
  updatedAt?: string;
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
        rangeStartDate: data.startDate ?? null,
        rangeEndDate: data.endDate ?? null,
        startedAt: data.startedAt,
        updatedAt: data.updatedAt,
        visible: data.status === 'running',
      });
    },
  });
}

export function useGlobalSyncManager(enabled: boolean) {
  const queryClient = useQueryClient();
  const sync = useAppStore((s) => s.sync);
  const setSync = useAppStore((s) => s.setSync);
  const resetSync = useAppStore((s) => s.resetSync);

  useEffect(() => {
    if (!enabled) {
      resetSync();
      return;
    }

    let isActive = true;
    const handlePayload = (payload: SyncEventPayload, fallbackType?: string) => {
      if (!isActive) return;
      const normalizedStatus =
        payload.status === 'running' || payload.status === 'done' || payload.status === 'failed'
          ? payload.status
          : fallbackType === 'job_failed'
            ? 'failed'
            : fallbackType === 'job_done'
              ? 'done'
              : 'idle';

      setSync({
        jobId: payload.jobId ?? null,
        status: normalizedStatus,
        phase: payload.phase ?? null,
        serverProgress: Number.isFinite(payload.progress)
          ? Number(payload.progress)
          : normalizedStatus === 'done'
            ? 100
            : 0,
        displayProgress:
          normalizedStatus === 'done' || normalizedStatus === 'failed'
            ? 100
            : useAppStore.getState().sync.jobId !== payload.jobId && Number.isFinite(payload.progress)
              ? Number(payload.progress)
              : useAppStore.getState().sync.displayProgress,
        message: payload.message ?? '',
        source: payload.source ?? null,
        error: payload.error ?? null,
        rangeStartDate: payload.startDate ?? useAppStore.getState().sync.rangeStartDate,
        rangeEndDate: payload.endDate ?? useAppStore.getState().sync.rangeEndDate,
        startedAt: payload.startedAt ?? useAppStore.getState().sync.startedAt,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        visible: normalizedStatus === 'running' || normalizedStatus === 'failed',
      });

      if (normalizedStatus === 'done') {
        void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        void queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
        void queryClient.invalidateQueries({ queryKey: ['spending-scans-debug'] });
        window.setTimeout(() => {
          setSync({ visible: false, status: 'idle', message: '' });
        }, 1300);
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
      typeof window !== 'undefined' && sessionStorage.getItem(SYNC_INITIAL_TRIGGERED) === '1';
    if (!initialTriggered) {
      void emitScraperSocket<SyncStartResponse>('sync:start', { mode: 'initial' })
        .then((data) => {
          setSync({
            jobId: data.jobId,
            status: data.status === 'running' ? 'running' : data.status,
            phase: data.phase,
            serverProgress: data.progress,
            displayProgress: data.progress,
            message: data.message,
            source: data.source,
            error: null,
            rangeStartDate: data.startDate ?? null,
            rangeEndDate: data.endDate ?? null,
            startedAt: data.startedAt,
            updatedAt: data.updatedAt,
            visible: data.status === 'running',
          });
        })
        .catch(() => {
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
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleConnectError);
      socket.off('connect', handleConnect);
    };
  }, [
    enabled,
    queryClient,
    resetSync,
    setSync,
  ]);

  useEffect(() => {
    if (enabled) return;
    closeScraperSocket();
  }, [enabled]);

  useEffect(() => {
    if (sync.status !== 'running') return;
    const interval = window.setInterval(() => {
      const delta = sync.serverProgress - sync.displayProgress;
      if (delta <= 0) return;
      const step = Math.max(0.3, Math.min(2.2, delta * 0.22));
      const next = Math.min(sync.serverProgress, sync.displayProgress + step);
      setSync({ displayProgress: next });
    }, 140);
    return () => window.clearInterval(interval);
  }, [setSync, sync.displayProgress, sync.serverProgress, sync.status]);
}
