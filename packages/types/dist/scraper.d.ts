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
    challenge?: {
        type: string;
        message?: string;
    };
    accounts?: UnifiedAccount[];
}
