import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useVerifyAiConnection() {
  return useMutation({
    mutationFn: (payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey: string;
    }) => api.post<{ success: boolean }>('/ai/verify', payload),
  });
}

export function useFetchAiModels(
  provider?: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter',
  apiKey?: string,
) {
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
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      apiKey: string;
      preferredModel?: string;
      activeProvider?: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        forceMarkdown?: boolean;
      };
    }) => api.post('/users/ai-config', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
      await queryClient.invalidateQueries({
        queryKey: ['spending-scans-debug'],
      });
    },
  });
}

export function useDeleteAiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter' }) =>
      api.post('/users/delete-ai-provider', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}
