import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type User = {
  id: string;
  username: string;
  email: string;
  isLocked?: boolean;
  activeAiProvider?: 'openai' | 'claude' | 'gemini' | null;
  preferredModel?: string | null;
  configuredProviders?: Array<'openai' | 'claude' | 'gemini'>;
  scraperTimeoutRetryCount?: number;
  scraperAutoSyncCooldownSeconds?: number;
  scraperShowBrowser?: boolean;
  scraperLoginTimeoutSeconds?: number;
  scraperDefaultTimeoutSeconds?: number;
  scraperChromiumPath?: string | null;
  aiProviderConfigs?: Record<
    string,
    {
      model: string;
      preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
      temperature?: number;
      maxTokens?: number;
    }
  > | null;
};

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => api.get<User>('/users/me'),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      username: string;
      email: string;
      lockProfile?: boolean;
      unlockKey?: string;
    }) => api.post('/users', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUserConfirmed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { userId: string; confirmationEmail: string }) =>
      api.post(`/users/${payload.userId}/delete-confirm`, {
        confirmationEmail: payload.confirmationEmail,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateScraperSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
      scraperChromiumPath?: string | null;
    }) => api.patch<User>('/users/me/scraper-settings', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
