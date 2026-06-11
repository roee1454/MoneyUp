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
      provider: 'openai' | 'claude' | 'gemini' | 'ollama' | 'openrouter';
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

/**
 * Saves or updates the user's AI configuration and invalidates related queries.
 *
 * @returns The React Query mutation object for saving AI configuration.
 */
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

/**
 * Deletes the configuration of a specific AI provider from the user's settings.
 *
 * @returns The React Query mutation object for deleting the AI provider configuration.
 */
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
