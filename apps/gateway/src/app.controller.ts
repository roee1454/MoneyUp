import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

type UserPayload = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

@Controller()
export class AppController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) {}

  @Get('ai')
  async getAiGreeting(): Promise<string> {
    return firstValueFrom(this.aiServiceClient.send<string>('ai_hello', {}));
  }

  @Get('scraper')
  async getScraperGreeting(): Promise<string> {
    return firstValueFrom(
      this.scraperServiceClient.send<string>('scraper_hello', {}),
    );
  }

  @Post('auth/login')
  async login(
    @Body() payload: { userId: string; username: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', payload.userId)
        .pipe(timeout(2000)),
    );

    if (!user || user.username !== payload.username) {
      throw new NotFoundException('User profile not found');
    }

    const { token } = await firstValueFrom(
      this.authServiceClient
        .send('auth_authenticate', {
          userId: payload.userId,
          username: payload.username,
        })
        .pipe(timeout(2000)),
    );

    response.cookie('moneyup_session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true, user };
  }

  @Get('auth/session')
  getSession(@Req() request: Request) {
    const token = request.cookies?.moneyup_session;
    if (!token) {
      throw new UnauthorizedException('No active session found');
    }

    return {
      isAuthenticated: true,
      user: this.verifyJwtToken(token),
    };
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('moneyup_session');
    return { success: true };
  }

  @Post('users')
  async createUser(@Body() payload: { username: string; email: string }) {
    return firstValueFrom(
      this.usersServiceClient.send('user_create', payload).pipe(timeout(2000)),
    );
  }

  @Get('users')
  async findUsers() {
    return firstValueFrom(
      this.usersServiceClient.send('user_find_all', {}).pipe(timeout(2000)),
    );
  }

  @Get('users/:id')
  async findUser(@Param('id') id: string) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', id)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: { username?: string; email?: string },
  ) {
    return firstValueFrom(
      this.usersServiceClient.send('user_update', { id, data }).pipe(timeout(2000)),
    );
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return firstValueFrom(
      this.usersServiceClient.send('user_delete', id).pipe(timeout(2000)),
    );
  }

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
          await firstValueFrom(client.send<string>('ping', {}).pipe(timeout(500)));
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

  private verifyJwtToken(token: string): {
    userId: string;
    username: string;
    isAuthenticated: boolean;
    loginTime: string;
  } {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid session token');
    }

    try {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as {
        userId: string;
        username: string;
        isAuthenticated: boolean;
        loginTime: string;
      };

      if (!payload.userId || !payload.username) {
        throw new UnauthorizedException('Invalid session payload');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }
  }
}
