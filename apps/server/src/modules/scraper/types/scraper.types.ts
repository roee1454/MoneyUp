import {
  ScraperStatus,
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
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'CHALLENGE_FAILED'
    | 'BANK_UNAVAILABLE'
    | 'SESSION_EXPIRED'
    | 'AUTOMATION_BLOCKED'
    | 'UNKNOWN_CONNECT_ERROR'
    | 'ACCOUNT_ALREADY_CONNECTED';
  internalErrorRaw?: string;
  resolveOtp?: (code: string) => void;
  rejectOtp?: (error: any) => void;
  resultData?: any;
  currentlySyncing?: string | null;
  step?: string;
}

export type ScraperDateLimit = {
  years?: number;
  months?: number;
  days?: number;
};
