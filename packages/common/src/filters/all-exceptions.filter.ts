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
      const request = http.getRequest<{ url?: string; headers?: Record<string, string> }>();

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const message =
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error';

      const payload = {
        success: false,
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url ?? '',
        correlationId: request.headers?.['x-correlation-id'] ?? null,
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
