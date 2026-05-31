import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Controller()
export class AppController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) {}

  @Get('health')
  async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, 'up' | 'down'>;
    timestamp: string;
  }> {
    const serviceClients = {
      ai: this.aiServiceClient,
      scraper: this.scraperServiceClient,
      auth: this.authServiceClient,
      users: this.usersServiceClient,
    };

    const checks = Object.entries(serviceClients).map(
      async ([name, client]) => {
        try {
          await firstValueFrom(
            client.send<string>('ping', {}).pipe(timeout(500)),
          );
          return [name, 'up'] as const;
        } catch {
          return [name, 'down'] as const;
        }
      },
    );

    const services = Object.fromEntries(await Promise.all(checks)) as Record<
      string,
      'up' | 'down'
    >;

    const clientUrl = process.env.CLIENT_URL;
    if (clientUrl) {
      try {
        await fetch(clientUrl, { signal: AbortSignal.timeout(500) });
        services.client = 'up';
      } catch {
        services.client = 'down';
      }
    }

    const isHealthy = Object.entries(services)
      .filter(([name]) => name !== 'client')
      .every(([_, status]) => status === 'up');

    const payload = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString(),
    } as const;

    if (!isHealthy) {
      throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return payload;
  }
}
