import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/lib/error-formatter';

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
      provider?: 'openai' | 'claude' | 'gemini';
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
