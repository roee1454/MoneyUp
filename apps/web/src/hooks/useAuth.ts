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

/**
 * Fetches the user's active session state and authentication details.
 *
 * @returns The React Query result containing the session status and optional user details.
 */
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => api.get<SessionResponse>('/auth/session'),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Performs a login mutation and updates the store with the authenticated user session.
 *
 * @returns The React Query mutation object for user login.
 */
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
      const loginRes = await api.post<{ success: boolean; token?: string; user: any }>('/auth/login', { userId, username, unlockTicket });
      if (loginRes.token) {
        localStorage.setItem('moneyup_session', loginRes.token);
      }
      const sessionData = await api.get<SessionResponse>('/auth/session');
      return {
        session: sessionData,
        userProfile: loginRes.user,
      };
    },
    onSuccess: (data) => {
      if (!data.session.user) {
        throw new Error('לא נמצאה סשן פעילה');
      }
      setSession(data.session.user);
      queryClient.clear();
      const landing = data.userProfile?.initialLandingPage ?? '/dashboard';
      navigate({ to: landing });
    },
  });
}

/**
 * Unlocks a user profile using an encryption unlock key to obtain an unlock ticket.
 *
 * @returns The React Query mutation object for profile unlocking.
 */
export function useUnlockProfile() {
  return useMutation({
    mutationFn: (payload: { userId: string; unlockKey: string }) =>
      api.post<{ success: boolean; unlockTicket: string }>('/auth/unlock', payload),
  });
}

/**
 * Logs out the current user, clears the query client cache, and redirects to the login page.
 *
 * @returns The React Query mutation object for logging out.
 */
export function useLogout() {
  const setSession = useAppStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/logout');
      localStorage.removeItem('moneyup_session');
      return res;
    },
    onSuccess: () => {
      queryClient.clear();
      setSession(null);
      navigate({ to: '/login' });
    },
  });
}
