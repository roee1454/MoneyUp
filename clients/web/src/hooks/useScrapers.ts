import { useQuery } from '@tanstack/react-query';
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
