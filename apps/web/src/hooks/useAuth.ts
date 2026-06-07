import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@/lib/api';
import { useAppStore } from '@/store';

type SessionUser = {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
};

type SessionResponse = {
  isAuthenticated: boolean;
  user?: SessionUser;
};

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<SessionResponse>('/auth/session'),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useLogin() {
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      username,
      unlockTicket,
    }: {
      userId: string;
      username: string;
      unlockTicket?: string;
    }) => {
      await api.post('/auth/login', { userId, username, unlockTicket });
      return api.get<SessionResponse>('/auth/session');
    },
    onSuccess: (sessionData) => {
      if (!sessionData.user) {
        throw new Error('לא נמצאה סשן פעילה');
      }
      setSession(sessionData.user);
      queryClient.clear();
      navigate({ to: '/dashboard' });
    },
  });
}

export function useUnlockProfile() {
  return useMutation({
    mutationFn: (payload: { userId: string; unlockKey: string }) =>
      api.post<{ success: boolean; unlockTicket: string }>('/auth/unlock', payload),
  });
}

export function useLogout() {
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      setSession(null);
      navigate({ to: '/login' });
    },
  });
}
