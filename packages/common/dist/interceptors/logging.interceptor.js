"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let LoggingInterceptor = class LoggingInterceptor {
    intercept(context, next) {
        const now = Date.now();
        const contextType = context.getType();
        if (contextType === 'http') {
            const req = context.switchToHttp().getRequest();
            const route = req.originalUrl ?? req.url ?? '';
            const label = `[HTTP] ${req.method} ${route}`;
            return next
                .handle()
                .pipe((0, operators_1.tap)(() => console.log(`${label} ${Date.now() - now}ms`)));
        }
        const pattern = context.switchToRpc().getContext()?.pattern ?? 'unknown';
        const label = `[RPC] ${String(pattern)}`;
        return next
            .handle()
            .pipe((0, operators_1.tap)(() => console.log(`${label} ${Date.now() - now}ms`)));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
