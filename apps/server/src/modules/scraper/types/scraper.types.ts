import {
  ScraperStatus,
  ScraperErrorCode,
  ScraperDateLimit,
} from '@money-up/types';

export type SessionStatus = ScraperStatus;

export interface SessionState {
  userId: string;
  bankId: string;
  status: SessionStatus;
  challenge?: {
    type: string;
    message: string;
  };
  credentials?: Record<string, string>;
  error?: string;
  errorCode?: ScraperErrorCode;
  internalErrorRaw?: string;
  resolveOtp?: (code: string) => void;
  rejectOtp?: (error: any) => void;
  resultData?: any;
  currentlySyncing?: string | null;
  step?: string;
}

export type { ScraperDateLimit };
