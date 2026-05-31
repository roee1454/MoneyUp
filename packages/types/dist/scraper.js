"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitChallengeDto = exports.ConnectScraperDto = exports.submitChallengeSchema = exports.connectScraperSchema = void 0;
const zod_1 = require("zod");
exports.connectScraperSchema = zod_1.z.object({
    bankId: zod_1.z.string().min(1, 'bankId is required'),
    credentials: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    startDate: zod_1.z.string().optional(),
});
exports.submitChallengeSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1, 'sessionId is required'),
    code: zod_1.z.string().min(1, 'code is required'),
});
class ConnectScraperDto {
    bankId;
    credentials;
    startDate;
}
exports.ConnectScraperDto = ConnectScraperDto;
class SubmitChallengeDto {
    sessionId;
    code;
}
exports.SubmitChallengeDto = SubmitChallengeDto;
