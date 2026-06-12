import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/lib/error-formatter';
import { useState } from 'react';
import { getScraperSocket } from '@/lib/scraper-socket';
import { AgentProvider } from '@money-up/common';

import type { CategorizedExpense, ScanIncomeResult } from '@money-up/types';

export type AiScanCategory = CategorizedExpense;
export type SpendingScansResponse = ScanIncomeResult;

export type ScanFilters = {
  period?: 'current' | 'previous' | 'both';
  startDate?: string;
  endDate?: string;
};

function buildScansQuery(filters: ScanFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate <= filters.endDate
  ) {
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
  }
  const query = params.toString();
  return query ? `/spending/scans?${query}` : '/spending/scans';
}

function buildScansDebugQuery(filters: ScanFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate <= filters.endDate
  ) {
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
  }
  const query = params.toString();
  return query ? `/spending/scans/debug?${query}` : '/spending/scans/debug';
}

/**
 * Fetches analyzed spending scans containing categorized expenses and income.
 *
 * @param filters - Optional filters specifying the scan period or date range.
 * @returns The React Query result containing the spending scans analysis data.
 */
export function useSpendingScans(filters: ScanFilters = { period: 'current' }) {
  const session = useAppStore((s) => s.session);
  const period = filters.period ?? 'current';

  return useQuery({
    queryKey: [
      'spending-scans',
      period,
      filters.startDate ?? '',
      filters.endDate ?? '',
    ],
    queryFn: () =>
      api.get<SpendingScansResponse>(buildScansQuery({ ...filters, period })),
    enabled: !!session,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 3,
  });
}

/**
 * Fetches debug-level analyzed spending scans with raw prompt logs and details.
 *
 * @param filters - Optional filters specifying the scan period or date range.
 * @param enabled - Whether the query is enabled to run automatically.
 * @returns The React Query result containing the debug spending scans analysis.
 */
export function useSpendingScansDebug(
  filters: ScanFilters = { period: 'current' },
  enabled = true,
) {
  const session = useAppStore((s) => s.session);
  const period = filters.period ?? 'current';

  return useQuery({
    queryKey: [
      'spending-scans-debug',
      period,
      filters.startDate ?? '',
      filters.endDate ?? '',
    ],
    queryFn: () =>
      api.get<SpendingScansResponse>(
        buildScansDebugQuery({ ...filters, period }),
      ),
    enabled: !!session && enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 2,
  });
}

/**
 * Sends a mutation request to analyze and annotate spending scans using AI.
 *
 * @returns The React Query mutation object for triggering analysis annotation.
 */
export function useAnnotateSpendingScans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      period?: 'current' | 'previous' | 'both';
      startDate?: string;
      endDate?: string;
      provider?: AgentProvider;
      model?: string;
    }) => api.post<SpendingScansResponse>('/spending/scans/annotate', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
      await queryClient.invalidateQueries({
        queryKey: ['spending-scans-debug'],
      });
    },
    onError: (err: any) => {
      toast.error(getFriendlyErrorMessage(err));
    },
  });
}

/**
 * Triggered classification stream mutation over WebSocket.
 */
export function useAnnotateSpendingScansProgress() {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMerchant, setCurrentMerchant] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = async (payload: {
    startDate?: string;
    endDate?: string;
    provider?: AgentProvider;
    model?: string;
  }) => {
    setIsPending(true);
    setProgress(0);
    setCurrentMerchant(undefined);
    setError(null);

    const socket = getScraperSocket();

    return new Promise<SpendingScansResponse>((resolve, reject) => {
      const handleProgress = (data: { currentMerchant: string; progressPercent: number }) => {
        setProgress(data.progressPercent);
        setCurrentMerchant(data.currentMerchant);
      };

      const handleSuccess = async (data: SpendingScansResponse) => {
        setIsPending(false);
        setProgress(100);
        cleanup();
        await queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
        await queryClient.invalidateQueries({ queryKey: ['spending-scans-debug'] });
        resolve(data);
      };

      const handleError = (data: { error: string }) => {
        setIsPending(false);
        cleanup();
        const errMsg = data.error || 'סיווג נכשל';
        setError(errMsg);
        reject(new Error(errMsg));
      };

      const cleanup = () => {
        socket.off('spending:annotate:progress', handleProgress);
        socket.off('spending:annotate:success', handleSuccess);
        socket.off('spending:annotate:error', handleError);
      };

      socket.on('spending:annotate:progress', handleProgress);
      socket.on('spending:annotate:success', handleSuccess);
      socket.on('spending:annotate:error', handleError);

      socket.emit('spending:annotate', payload);
    });
  };

  return {
    mutateAsync,
    isPending,
    progress,
    currentMerchant,
    error,
  };
}

/**
 * Fetches the count and list of unresolved (unclassified) merchants for a given
 * date range. Designed for the classification dialog — only activates when `enabled`
 * is true (i.e. the dialog is open) to avoid wasteful background fetches.
 *
 * Because it calls the same `/spending/scans` endpoint as the dashboard query,
 * TanStack Query serves the result from cache when the range matches — zero
 * extra network requests in the common case.
 *
 * @param startDate - Range start in YYYY-MM-DD format.
 * @param endDate - Range end in YYYY-MM-DD format.
 * @param enabled - Whether the query should run (typically `isDialogOpen`).
 * @returns `{ count, merchants, isLoading }` where `merchants` is the full unresolved list.
 */
export function useUnresolvedMerchantsCount(
  startDate: string,
  endDate: string,
  enabled: boolean,
) {
  const session = useAppStore((s) => s.session);

  const query = useQuery({
    queryKey: ['spending-scans', 'both', startDate, endDate],
    queryFn: () =>
      api.get<SpendingScansResponse>(
        `/spending/scans?period=both&startDate=${startDate}&endDate=${endDate}`,
      ),
    enabled: !!session && enabled && !!startDate && !!endDate,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 3,
  });

  const merchants = query.data?.unresolvedMerchants ?? [];

  return {
    merchants,
    count: merchants.length,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
