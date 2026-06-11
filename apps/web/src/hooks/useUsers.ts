import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

import type { User } from '@money-up/types';
export type { User };

/**
 * Fetches the list of all registered users.
 *
 * @returns The React Query result containing the list of users.
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });
}

/**
 * Fetches the user profile details for the currently logged-in user.
 *
 * @param userId - Optional user ID (used as a dependency key and to enable the query).
 * @returns The React Query result containing the user profile details.
 */
export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => api.get<User>('/users/me'),
    enabled: !!userId,
  });
}

/**
 * Creates a new user profile and invalidates the users list query.
 *
 * @returns The React Query mutation object for user creation.
 */
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

/**
 * Deletes a user account after validating the confirmation email, and invalidates the users list.
 *
 * @returns The React Query mutation object for user deletion.
 */
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

/**
 * Updates the AI settings for the logged-in user profile.
 *
 * @returns The React Query mutation object for updating AI settings.
 */
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

/**
 * Updates the scraper settings for the logged-in user profile.
 *
 * @returns The React Query mutation object for updating scraper settings.
 */
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
