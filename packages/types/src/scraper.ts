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

export type ScraperStatus = 'SUCCESS' | 'CHALLENGE_REQUIRED' | 'FAILED' | 'PROCESSING';

export interface UnifiedTransaction {
  id: string;
  date: string;
  processedDate: string;
  amount: number;
  chargedAmount: number;
  description: string;
  memo?: string;
  originalCurrency?: string;
  isDuplicate?: boolean;
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
    | 'UNKNOWN_CONNECT_ERROR'
    | 'ACCOUNT_ALREADY_CONNECTED';
  challenge?: {
    type: string; // 'SMS', 'OTP', etc.
    message?: string;
  };
  accounts?: UnifiedAccount[];
}

export type CategorizedExpense = {
  name: string;
  amount: number;
  count: number;
};

export type ScanAccount = {
  bankId: string;
  balance?: number;
  accountNumber?: string;
  transactions?: UnifiedTransaction[];
};

export type ScanIncomeRequest = {
  accounts: ScanAccount[];
  period?: 'current' | 'previous' | 'both';
  startDate?: string;
  endDate?: string;
  debug?: boolean;
};

export type ScanTransaction = {
  transactionId: string;
  bankId: string;
  accountNumber: string;
  cardLast4?: string;
  merchant: string;
  date: string;
  amount: number;
  reason: string;
  confidence: number;
  tags: string[];
  type?: 'income' | 'expense';
};

export type ScanDebugTrace = {
  period: 'current' | 'previous' | 'both';
  customRange?: {
    startDate: string;
    endDate: string;
  };
  periodStartIso: string;
  periodEndIso: string;
  accountsSummary: Array<{
    bankId: string;
    accountNumber: string;
    isCreditCompany: boolean;
    transactionCount: number;
  }>;
  transactions: Array<{
    bankId: string;
    accountNumber: string;
    transactionId: string;
    date: string;
    amount: number;
    description: string;
    dedupKey: string;
    isCreditCompany: boolean;
    status: string;
    category?: string;
    reason: string;
  }>;
  finalTotals: {
    totalIncome: number;
    totalExpenses: number;
    totalBalance: number;
    categories: CategorizedExpense[];
  };
};

export type ScanIncomeResult = {
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  categories: CategorizedExpense[];
  categoryTransactions: Record<string, ScanTransaction[]>;
  incomeTransactions?: ScanTransaction[];
  unresolvedMerchants?: Array<{
    normalizedMerchant: string;
    displayMerchant: string;
  }>;
  debugTrace?: ScanDebugTrace;
};
