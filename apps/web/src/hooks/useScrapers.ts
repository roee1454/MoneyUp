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

import type { ScraperErrorCode } from '@money-up/types';
export type { ScraperErrorCode };

export type DetectChromiumResult = {
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
};

/**
 * Fetches the list of supported financial institution scrapers.
 *
 * @param open - Controls whether the query is enabled (active).
 * @returns The React Query result containing the scraper list items.
 */
export function useScrapersList(open: boolean) {
  return useQuery({
    queryKey: ['scrapers'],
    queryFn: () => api.get<ScraperListItem[]>('/scrapers'),
    enabled: open,
  });
}

/**
 * Detects Chromium or other compatible local browsers on the system.
 *
 * @returns The React Query result containing browser detection details.
 */
export function useDetectChromium() {
  return useQuery({
    queryKey: ['detect-chromium'],
    queryFn: () =>
      api.get<DetectChromiumResult>('/scrapers/detect'),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Initiates the automated background installation of minimal Chromium.
 *
 * @returns The React Query mutation object to run and track the installation process.
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
