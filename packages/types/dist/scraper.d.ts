import { z } from 'zod';
export declare const connectScraperSchema: z.ZodObject<{
    bankId: z.ZodString;
    credentials: z.ZodRecord<z.ZodString, z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    bankId: string;
    credentials: Record<string, string>;
    startDate?: string | undefined;
}, {
    bankId: string;
    credentials: Record<string, string>;
    startDate?: string | undefined;
}>;
export declare const submitChallengeSchema: z.ZodObject<{
    sessionId: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    sessionId: string;
}, {
    code: string;
    sessionId: string;
}>;
export declare class ConnectScraperDto {
    bankId: string;
    credentials: Record<string, string>;
    startDate?: string;
}
export declare class SubmitChallengeDto {
    sessionId: string;
    code: string;
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
    errorCode?: 'INVALID_CREDENTIALS' | 'CHALLENGE_FAILED' | 'BANK_UNAVAILABLE' | 'SESSION_EXPIRED' | 'UNKNOWN_CONNECT_ERROR' | 'ACCOUNT_ALREADY_CONNECTED';
    challenge?: {
        type: string;
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
    unresolvedMerchants?: Array<{
        normalizedMerchant: string;
        displayMerchant: string;
    }>;
    debugTrace?: ScanDebugTrace;
};
