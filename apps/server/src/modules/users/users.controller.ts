import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentProvider } from '@money-up/common';
import { UsersService } from './users.service';
import { UserPayload } from '../../types/gateway.types';
import {
  requireSessionUserId,
  toPublicUser,
  verifyJwtToken,
} from '../../utils/auth.utils';

/**
 * NestJS Controller handling incoming HTTP requests for Users.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    return this.usersService.create(payload);
  }

  @Get()
  async findUsers() {
    const users = await this.usersService.findAll();
    return (users as any[]).map((u) => toPublicUser(u));
  }

  @Get('me')
  async getCurrentUserProfile(@Req() request: Request) {
    const sessionToken = request.cookies?.moneyup_session;
    if (!sessionToken) {
      throw new UnauthorizedException('No active session found');
    }
    const session = verifyJwtToken(sessionToken);
    const user = await this.usersService.findOne(session.userId);

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return toPublicUser(user as any);
  }

  @Get(':id')
  async findUser(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return toPublicUser(user as any);
  }

  @Post('ai-config')
  async saveAiConfig(
    @Req() request: Request,
    @Body()
    payload: {
      provider: AgentProvider;
      apiKey: string;
      preferredModel: string;
      activeProvider?: AgentProvider;
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
    const user = await this.usersService.saveAiConfig(userId, payload);
    return toPublicUser(user as any);
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
    const user = await this.usersService.updateAiSettings(
      userId,
      data.forceMarkdown,
    );
    return toPublicUser(user as any);
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
    const user = await this.usersService.update(id, data);
    return toPublicUser(user as any);
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
    const user = await this.usersService.saveScraperSettings(userId, {
      scraperTimeoutRetryCount: data.scraperTimeoutRetryCount,
      scraperAutoSyncCooldownSeconds: data.scraperAutoSyncCooldownSeconds,
      scraperShowBrowser: data.scraperShowBrowser,
      scraperLoginTimeoutSeconds: data.scraperLoginTimeoutSeconds,
      scraperDefaultTimeoutSeconds: data.scraperDefaultTimeoutSeconds,
      scraperChromiumPath: data.scraperChromiumPath,
    });
    return toPublicUser(user as any);
  }

  @Post('delete-ai-provider')
  async deleteAiProvider(
    @Req() request: Request,
    @Body()
    payload: {
      provider: AgentProvider;
    },
  ) {
    const userId = requireSessionUserId(request);
    const user = await this.usersService.deleteAiProvider(
      userId,
      payload.provider,
    );
    return toPublicUser(user as any);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':id/delete-confirm')
  async deleteUserConfirmed(
    @Param('id') id: string,
    @Body() payload: { confirmationEmail: string },
  ) {
    return this.usersService.deleteWithConfirmation(
      id,
      payload.confirmationEmail,
    );
  }
}
