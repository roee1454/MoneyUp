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
export declare const profileCreationSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
}, {
    email: string;
    username: string;
}>;
export type GoogleProfile = z.infer<typeof googleProfileSchema>;
export type LoginPayload = z.infer<typeof loginPayloadSchema>;
export type ProfileCreationInput = z.infer<typeof profileCreationSchema>;
