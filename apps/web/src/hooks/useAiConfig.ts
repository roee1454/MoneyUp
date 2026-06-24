import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Verifies the connection credentials for a specific AI provider.
 *
 * @returns The React Query mutation object for verifying the connection.
 */
export function useVerifyAiConnection() {
  return useMutation({
    mutationFn: (payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama';
      apiKey: string;
    }) => api.post<{ success: boolean }>('/ai/verify', payload),
  });
}

/**
 * Fetches the list of available models for a given AI provider using the provided API key.
 *
 * @param provider - The AI provider to fetch models for.
 * @param apiKey - Optional API key for authorization with the provider.
 * @returns The React Query result containing the list of available models.
 */
export function useFetchAiModels(
  provider?: 'openai' | 'claude' | 'gemini' | 'ollama',
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

/**
 * Saves or updates the user's AI configuration and invalidates related queries.
 *
 * @returns The React Query mutation object for saving AI configuration.
 */
export function useSaveAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      provider: 'openai' | 'claude' | 'gemini' | 'ollama';
      apiKey: string;
      preferredModel?: string;
      activeProvider?: 'openai' | 'claude' | 'gemini' | 'ollama';
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

/**
 * Deletes the configuration of a specific AI provider from the user's settings.
 *
 * @returns The React Query mutation object for deleting the AI provider configuration.
 */
export function useDeleteAiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { provider: 'openai' | 'claude' | 'gemini' | 'ollama' }) =>
      api.post('/users/delete-ai-provider', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

/**
 * Hook to query currently running Ollama models.
 */
export function useOllamaRunningModels(enabled: boolean) {
  return useQuery({
    queryKey: ['ollama-running-models'],
    queryFn: () => api.get<string[]>('/ai/ollama/running'),
    enabled,
    refetchInterval: enabled ? 10000 : false, // Poll every 10 seconds while enabled
  });
}

/**
 * Mutation hook to pre-load / start an Ollama model in memory.
 */
export function useStartOllamaModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { model: string }) =>
      api.post<{ success: boolean }>('/ai/ollama/start', payload),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData<string[]>(['ollama-running-models'], (old) => {
        if (!old) return [variables.model];
        const modelLower = variables.model.toLowerCase();
        const exists = old.some((m) => {
          const mLower = m.toLowerCase();
          return (
            mLower === modelLower ||
            mLower.startsWith(modelLower + ':') ||
            modelLower.startsWith(mLower + ':')
          );
        });
        if (exists) return old;
        return [...old, variables.model];
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ollama-running-models'] }).catch(() => {});
      }, 2000);
    },
  });
}

/**
 * Mutation hook to unload / stop an Ollama model from memory.
 */
export function useStopOllamaModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { model: string }) =>
      api.post<{ success: boolean }>('/ai/ollama/stop', payload),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData<string[]>(['ollama-running-models'], (old) => {
        if (!old) return [];
        const modelLower = variables.model.toLowerCase();
        return old.filter((m) => {
          const mLower = m.toLowerCase();
          if (mLower === modelLower) return false;
          if (mLower.startsWith(modelLower + ':')) return false;
          if (modelLower.startsWith(mLower + ':')) return false;
          return true;
        });
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ollama-running-models'] }).catch(() => {});
      }, 2000);
    },
  });
}
