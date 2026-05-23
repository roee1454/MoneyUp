import { z } from 'zod';
export const googleProfileSchema = z.object({
    email: z.string().email(),
    username: z.string().min(1),
    googleId: z.string().min(1),
});
export const loginPayloadSchema = z.object({
    userId: z.string().uuid(),
    username: z.string().min(1),
});
export const profileCreationSchema = z.object({
    username: z.string().min(3, 'שם המשתמש חייב להכיל לפחות 3 תווים'),
    email: z.string().email('כתובת אימייל לא תקינה'),
    lockProfile: z.boolean().optional(),
    unlockKey: z.string().min(4, 'קוד פתיחה חייב להכיל לפחות 4 תווים').optional(),
}).superRefine((data, ctx) => {
    if (data.lockProfile && (!data.unlockKey || data.unlockKey.trim().length < 4)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['unlockKey'],
            message: 'יש להזין קוד פתיחה כאשר הפרופיל נעול',
        });
    }
});
export const profileDeleteSchema = z.object({
    userId: z.string().uuid(),
    confirmationEmail: z.string().email(),
});
export const profileUnlockSchema = z.object({
    userId: z.string().uuid(),
    unlockKey: z.string().min(1),
});
