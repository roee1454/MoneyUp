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
    bankId;
    credentials;
    startDate;
}
export class SubmitChallengeDto {
    sessionId;
    code;
}
