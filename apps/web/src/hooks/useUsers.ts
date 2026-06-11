import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

import type { User } from '@money-up/types';
export type { User };

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

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { forceMarkdown: boolean }) =>
      api.patch<User>('/users/me/ai-settings', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
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
