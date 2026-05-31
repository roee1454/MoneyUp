import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ScraperListItem = {
  id: string;
  name: string;
  englishName: string;
  loginFields: string[];
  icon: string;
  enabled: boolean;
};

export type ScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'CHALLENGE_FAILED'
  | 'BANK_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_CONNECT_ERROR';

export function useScrapersList(open: boolean) {
  return useQuery({
    queryKey: ['scrapers'],
    queryFn: () => api.get<ScraperListItem[]>('/scrapers'),
    enabled: open,
  });
}

export function useDetectChromium() {
  return useQuery({
    queryKey: ['detect-chromium'],
    queryFn: () =>
      api.get<{
        path: string | null;
        version: string | null;
        success: boolean;
        availableBrowsers: Array<{
          name: string;
          version: string;
          platform: string;
          installed: boolean;
          path: string | null;
        }>;
      }>('/scrapers/detect'),
    enabled: false, // Manual trigger
    staleTime: 0,
    gcTime: 0,
  });
}

export function useInstallChromium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ success: boolean; error?: string }>('/scrapers/install'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detect-chromium'] });
    },
  });
}
