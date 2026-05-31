"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileUnlockSchema = exports.profileDeleteSchema = exports.profileCreationSchema = exports.loginPayloadSchema = exports.googleProfileSchema = void 0;
const zod_1 = require("zod");
exports.googleProfileSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(1),
    googleId: zod_1.z.string().min(1),
});
exports.loginPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    username: zod_1.z.string().min(1),
});
exports.profileCreationSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, 'שם המשתמש חייב להכיל לפחות 3 תווים'),
    email: zod_1.z.string().email('כתובת אימייל לא תקינה'),
    lockProfile: zod_1.z.boolean().optional(),
    unlockKey: zod_1.z.string().min(4, 'קוד פתיחה חייב להכיל לפחות 4 תווים').optional(),
}).superRefine((data, ctx) => {
    if (data.lockProfile && (!data.unlockKey || data.unlockKey.trim().length < 4)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['unlockKey'],
            message: 'יש להזין קוד פתיחה כאשר הפרופיל נעול',
        });
    }
});
exports.profileDeleteSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    confirmationEmail: zod_1.z.string().email(),
});
exports.profileUnlockSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    unlockKey: zod_1.z.string().min(1),
});
