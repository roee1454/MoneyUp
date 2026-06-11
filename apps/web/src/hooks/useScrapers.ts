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
  | 'AUTOMATION_BLOCKED'
  | 'UNKNOWN_CONNECT_ERROR';

/**
 * Hook to fetch the list of supported financial institution scrapers.
 *
 * @param open Controls whether the query is enabled (active).
 * @returns Query result containing the scraper list items.
 */
export function useScrapersList(open: boolean) {
  return useQuery({
    queryKey: ['scrapers'],
    queryFn: () => api.get<ScraperListItem[]>('/scrapers'),
    enabled: open,
  });
}

/**
 * Hook to trigger detection of Chromium or other compatible local browsers on the system.
 * Designed for manual triggering.
 *
 * @returns Query result containing browser detection details.
 */
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

/**
 * Hook to initiate the automated background installation of minimal Chromium.
 * Invalidates the browser detection query upon success.
 *
 * @returns Mutation helper to run and track the installation process.
 */
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
