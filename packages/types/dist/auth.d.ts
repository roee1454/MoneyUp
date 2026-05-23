import { z } from 'zod';
export declare const googleProfileSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    googleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    googleId: string;
}, {
    email: string;
    username: string;
    googleId: string;
}>;
export declare const loginPayloadSchema: z.ZodObject<{
    userId: z.ZodString;
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    userId: string;
}, {
    username: string;
    userId: string;
}>;
export declare const profileCreationSchema: z.ZodEffects<z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    lockProfile: z.ZodOptional<z.ZodBoolean>;
    unlockKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    lockProfile?: boolean | undefined;
    unlockKey?: string | undefined;
}, {
    email: string;
    username: string;
    lockProfile?: boolean | undefined;
    unlockKey?: string | undefined;
}>, {
    email: string;
    username: string;
    lockProfile?: boolean | undefined;
    unlockKey?: string | undefined;
}, {
    email: string;
    username: string;
    lockProfile?: boolean | undefined;
    unlockKey?: string | undefined;
}>;
export declare const profileDeleteSchema: z.ZodObject<{
    userId: z.ZodString;
    confirmationEmail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    confirmationEmail: string;
}, {
    userId: string;
    confirmationEmail: string;
}>;
export declare const profileUnlockSchema: z.ZodObject<{
    userId: z.ZodString;
    unlockKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    unlockKey: string;
}, {
    userId: string;
    unlockKey: string;
}>;
export type GoogleProfile = z.infer<typeof googleProfileSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type ProfileCreationInput = z.infer<typeof profileCreationSchema>;
export type ProfileDeleteInput = z.infer<typeof profileDeleteSchema>;
export type ProfileUnlockInput = z.infer<typeof profileUnlockSchema>;
