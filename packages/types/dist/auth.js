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
});
