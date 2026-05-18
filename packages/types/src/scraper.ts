import { z } from 'zod';

export const connectScraperSchema = z.object({
  bankId: z.string().min(1, 'bankId is required'),
  credentials: z.record(z.string(), z.string()),
  startDate: z.string().optional(),
});

export const submitChallengeSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  code: z.string().min(1, 'code is required'),
});

export class ConnectScraperDto {
  bankId!: string;
  credentials!: Record<string, string>;
  startDate?: string;
}

export class SubmitChallengeDto {
  sessionId!: string;
  code!: string;
}

export type ScraperStatus = 'SUCCESS' | 'CHALLENGE_REQUIRED' | 'FAILED';

export interface UnifiedTransaction {
  id: string;
  date: string;
  processedDate: string;
  amount: number;
  chargedAmount: number;
  description: string;
  memo?: string;
  originalCurrency?: string;
}

export interface UnifiedAccount {
  accountNumber: string;
  balance?: number;
  transactions: UnifiedTransaction[];
}

export interface ScraperResponse {
  status: ScraperStatus;
  sessionId?: string;
  error?: string;
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'CHALLENGE_FAILED'
    | 'BANK_UNAVAILABLE'
    | 'SESSION_EXPIRED'
    | 'UNKNOWN_CONNECT_ERROR';
  challenge?: {
    type: string; // 'SMS', 'OTP', etc.
    message?: string;
  };
  accounts?: UnifiedAccount[];
}
