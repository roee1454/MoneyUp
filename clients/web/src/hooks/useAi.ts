import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';

export interface AiScanCategory {
  name: string;
  amount: number;
  count: number;
}

export interface AiScansResponse {
  totalIncome: number;
  totalExpenses: number;
  categories: AiScanCategory[];
  categoryTransactions: Record<
    string,
    Array<{
      transactionId: string;
      merchant: string;
      date: string;
      amount: number;
      reason: string;
      confidence: number;
      tags: string[];
    }>
  >;
  debugTrace?: {
    period: 'current' | 'previous' | 'both';
    periodStartIso: string;
    periodEndIso: string;
    accountsSummary: Array<{
      bankId: string;
      accountNumber: string;
      isCreditCompany: boolean;
      transactionCount: number;
    }>;
    transactions: Array<{
      bankId: string;
      accountNumber: string;
      transactionId: string;
      date: string;
      amount: number;
      description: string;
      dedupKey: string;
      isCreditCompany: boolean;
      status: string;
      category?: string;
      reason: string;
    }>;
    finalTotals: {
      totalIncome: number;
      totalExpenses: number;
      categories: AiScanCategory[];
    };
  };
}

export function useVerifyAiConnection() {
  return useMutation({
    mutationFn: (payload: { provider: 'openai' | 'claude' | 'gemini'; apiKey: string }) =>
      api.post<{ success: boolean }>('/ai/verify', payload),
  });
}

export function useFetchAiModels(provider?: 'openai' | 'claude' | 'gemini', apiKey?: string) {
  return useQuery({
    queryKey: ['ai-models', provider, apiKey],
    queryFn: () =>
      api.post<string[]>('/ai/models', {
        provider,
        apiKey,
      }),
    enabled: !!provider,
  });
}

type ScanFilters = {
  period?: 'current' | 'previous' | 'both';
  startDate?: string;
  endDate?: string;
};

function buildScansQuery(filters: ScanFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (filters.startDate && filters.endDate && filters.startDate <= filters.endDate) {
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
  }
  const query = params.toString();
  return query ? `/ai/scans?${query}` : '/ai/scans';
}

function buildScansDebugQuery(filters: ScanFilters): string {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (filters.startDate && filters.endDate && filters.startDate <= filters.endDate) {
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
  }
  const query = params.toString();
  return query ? `/ai/scans/debug?${query}` : '/ai/scans/debug';
}

export function useAiScans(filters: ScanFilters = { period: 'current' }) {
  const session = useAppStore((s) => s.session);
  const period = filters.period ?? 'current';

  return useQuery({
    queryKey: ['ai-scans', period, filters.startDate ?? '', filters.endDate ?? ''],
    queryFn: () => api.get<AiScansResponse>(buildScansQuery({ ...filters, period })),
    enabled: !!session,
  });
}

export function useAiScansDebug(
  filters: ScanFilters = { period: 'current' },
  enabled = true,
) {
  const session = useAppStore((s) => s.session);
  const period = filters.period ?? 'current';

  return useQuery({
    queryKey: ['ai-scans-debug', period, filters.startDate ?? '', filters.endDate ?? ''],
    queryFn: () => api.get<AiScansResponse>(buildScansDebugQuery({ ...filters, period })),
    enabled: !!session && enabled,
  });
}

export function useAnnotateAiScans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      period?: 'current' | 'previous' | 'both';
      startDate?: string;
      endDate?: string;
    }) => api.post<AiScansResponse>('/ai/scans/annotate', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-scans'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-scans-debug'] });
    },
  });
}

export function useSaveAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
      preferredModel: string;
    }) => api.post('/users/ai-config', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['ai-scans'] });
    },
  });
}
