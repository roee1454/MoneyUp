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
  lockProfile: z.boolean().optional(),
  unlockKey: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.lockProfile) {
    if (!data.unlockKey || data.unlockKey.trim().length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unlockKey'],
        message: 'קוד פתיחה חייב להכיל לפחות 4 תווים',
      });
    }
  }
});

export const profileDeleteSchema = z.object({
  userId: z.string().uuid(),
  confirmationUserId: z.string().uuid(),
});

export const profileUnlockSchema = z.object({
  userId: z.string().uuid(),
  unlockKey: z.string().min(1),
});

export type GoogleProfile = z.infer<typeof googleProfileSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type ProfileCreationInput = z.infer<typeof profileCreationSchema>;
export type ProfileDeleteInput = z.infer<typeof profileDeleteSchema>;
export type ProfileUnlockInput = z.infer<typeof profileUnlockSchema>;
