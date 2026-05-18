import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type ScraperListItem = {
  id: string;
  name: string;
  englishName: string;
  loginFields: string[];
  icon: string;
  enabled: boolean;
};

type ProcessingResponse = {
  status: 'PROCESSING';
  sessionId: string;
};

export type ScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'CHALLENGE_FAILED'
  | 'BANK_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_CONNECT_ERROR';

type FailedResponse = {
  status: 'FAILED';
  errorCode?: ScraperErrorCode;
  error?: string;
};

type GenericResponse = ProcessingResponse | FailedResponse | { status: 'SUCCESS' };

export function useScrapersList(open: boolean) {
  return useQuery({
    queryKey: ['scrapers'],
    queryFn: () => api.get<ScraperListItem[]>('/scrapers'),
    enabled: open,
  });
}

export function useConnectBank() {
  return useMutation({
    mutationFn: (payload: { bankId: string; credentials: Record<string, string> }) =>
      api.post<GenericResponse>('/scrapers/connect', payload),
  });
}

export function useSubmitChallenge() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; code: string }) =>
      api.post<GenericResponse>('/scrapers/challenge/submit', payload),
  });
}
