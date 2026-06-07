import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { UserPayload } from '../types/gateway.types';
import {
  requireSessionUserId,
  toPublicUser,
  verifyJwtToken,
} from '../utils/auth.utils';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) {}

  @Post()
  async createUser(
    @Body()
    payload: {
      username: string;
      email: string;
      lockProfile?: boolean;
      unlockKey?: string;
    },
  ) {
    return firstValueFrom(
      this.usersServiceClient.send('user_create', payload).pipe(timeout(2000)),
    );
  }

  @Get()
  async findUsers() {
    const users = await firstValueFrom(
      this.usersServiceClient.send('user_find_all', {}).pipe(timeout(2000)),
    );
    return (users as UserPayload[]).map((u) => toPublicUser(u));
  }

  @Get('me')
  async getCurrentUserProfile(@Req() request: Request) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('No active session found');
    }
    const session = verifyJwtToken(sessionToken);
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', session.userId)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return toPublicUser(user);
  }

  @Get(':id')
  async findUser(@Param('id') id: string) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', id)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return toPublicUser(user);
  }

  @Post('ai-config')
  async saveAiConfig(
    @Req() request: Request,
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
      apiKey: string;
      preferredModel: string;
      activeProvider?: 'openai' | 'claude' | 'gemini';
      config?: {
        model: string;
        preset: 'accurate' | 'moderate' | 'save_tokens' | 'custom';
        temperature?: number;
        maxTokens?: number;
        stream?: boolean;
        forceMarkdown?: boolean;
      };
    },
  ) {
    const userId = requireSessionUserId(request);

    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_save_ai_config', {
          id: userId,
          ...payload,
        })
        .pipe(timeout(30000)),
    );

    return toPublicUser(user);
  }

  @Patch('me/ai-settings')
  async updateAiSettings(
    @Req() request: Request,
    @Body()
    data: {
      forceMarkdown: boolean;
    },
  ) {
    const userId = requireSessionUserId(request);
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_update_ai_settings', {
          id: userId,
          forceMarkdown: data.forceMarkdown,
        })
        .pipe(timeout(2000)),
    );
    return toPublicUser(user);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body()
    data: {
      username?: string;
      email?: string;
      scraperTimeoutRetryCount?: number;
      scraperAutoSyncCooldownMinutes?: number;
    },
  ) {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_update', { id, data })
        .pipe(timeout(2000)),
    );
    return toPublicUser(user);
  }

  @Patch('me/scraper-settings')
  async updateScraperSettings(
    @Req() request: Request,
    @Body()
    data: {
      scraperTimeoutRetryCount: number;
      scraperAutoSyncCooldownSeconds?: number;
      scraperShowBrowser?: boolean;
      scraperLoginTimeoutSeconds?: number;
      scraperDefaultTimeoutSeconds?: number;
      scraperChromiumPath?: string;
    },
  ) {
    const userId = requireSessionUserId(request);
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_save_scraper_settings', {
          id: userId,
          scraperTimeoutRetryCount: data.scraperTimeoutRetryCount,
          scraperAutoSyncCooldownSeconds: data.scraperAutoSyncCooldownSeconds,
          scraperShowBrowser: data.scraperShowBrowser,
          scraperLoginTimeoutSeconds: data.scraperLoginTimeoutSeconds,
          scraperDefaultTimeoutSeconds: data.scraperDefaultTimeoutSeconds,
          scraperChromiumPath: data.scraperChromiumPath,
        })
        .pipe(timeout(2000)),
    );
    return toPublicUser(user);
  }

  @Post('delete-ai-provider')
  async deleteAiProvider(
    @Req() request: Request,
    @Body()
    payload: {
      provider: 'openai' | 'claude' | 'gemini';
    },
  ) {
    const userId = requireSessionUserId(request);
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload>('user_delete_ai_provider', {
          id: userId,
          provider: payload.provider,
        })
        .pipe(timeout(5000)),
    );
    return toPublicUser(user);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return firstValueFrom(
      this.usersServiceClient.send('user_delete', id).pipe(timeout(2000)),
    );
  }

  @Post(':id/delete-confirm')
  async deleteUserConfirmed(
    @Param('id') id: string,
    @Body() payload: { confirmationEmail: string },
  ) {
    return firstValueFrom(
      this.usersServiceClient
        .send('user_delete_confirmed', {
          id,
          confirmationEmail: payload.confirmationEmail,
        })
        .pipe(timeout(2000)),
    );
  }
}
