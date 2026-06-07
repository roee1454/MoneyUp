import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const contextType = host.getType<'http' | 'rpc'>();

    if (contextType === 'http') {
      const http = host.switchToHttp();
      const response = http.getResponse<{
        status: (code: number) => { json: (body: unknown) => void };
      }>();
      const request = http.getRequest<{
        url?: string;
        headers?: Record<string, string>;
      }>();

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const responseBody =
        exception instanceof HttpException ? exception.getResponse() : null;

      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (responseBody as any)?.message ||
            (exception instanceof Error
              ? exception.message
              : (exception as any)?.message || 'Http Exception');

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

    const message =
      exception instanceof Error ? exception.message : 'Microservice error';

    throw new RpcException({
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
