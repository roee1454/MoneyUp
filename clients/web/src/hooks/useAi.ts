import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
    },
  });
}
