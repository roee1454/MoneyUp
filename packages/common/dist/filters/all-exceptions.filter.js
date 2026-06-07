"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
let AllExceptionsFilter = class AllExceptionsFilter {
    catch(exception, host) {
        const contextType = host.getType();
        if (contextType === 'http') {
            const http = host.switchToHttp();
            const response = http.getResponse();
            const request = http.getRequest();
            const status = exception instanceof common_1.HttpException
                ? exception.getStatus()
                : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const responseBody = exception instanceof common_1.HttpException ? exception.getResponse() : null;
            const message = typeof responseBody === 'string'
                ? responseBody
                : responseBody?.message ||
                    (exception instanceof Error
                        ? exception.message
                        : exception?.message || 'Http Exception');
            const payload = {
                success: false,
                statusCode: status,
                message,
                timestamp: new Date().toISOString(),
                path: request.url ?? '',
                correlationId: request.headers?.['x-correlation-id'] ?? null,
                ...(typeof responseBody === 'object' && responseBody !== null
                    ? responseBody
                    : {}),
            };
            response.status(status).json(payload);
            return;
        }
        const message = exception instanceof Error ? exception.message : 'Microservice error';
        throw new microservices_1.RpcException({
            success: false,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
