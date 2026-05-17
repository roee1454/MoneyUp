import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const contextType = context.getType<'http' | 'rpc'>();

    if (contextType === 'http') {
      const req = context.switchToHttp().getRequest<{
        method: string;
        originalUrl?: string;
        url?: string;
      }>();
      const route = req.originalUrl ?? req.url ?? '';
      const label = `[HTTP] ${req.method} ${route}`;

      return next
        .handle()
        .pipe(tap(() => console.log(`${label} ${Date.now() - now}ms`)));
    }

    const pattern = context.switchToRpc().getContext()?.pattern ?? 'unknown';
    const label = `[RPC] ${String(pattern)}`;
    return next
      .handle()
      .pipe(tap(() => console.log(`${label} ${Date.now() - now}ms`)));
  }
}
