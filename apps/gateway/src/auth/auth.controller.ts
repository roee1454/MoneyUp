import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { UserPayload } from '../types/gateway.types';
import {
  createUnlockTicket,
  toPublicUser,
  verifyJwtToken,
  verifyUnlockTicket,
} from '../utils/auth.utils';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authServiceClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersServiceClient: ClientProxy,
  ) {}

  @Post('login')
  async login(
    @Body()
    payload: { userId: string; username: string; unlockTicket?: string },
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

    if (user.isLocked) {
      const ticket = payload.unlockTicket;
      if (!ticket || !verifyUnlockTicket(ticket, user.id)) {
        throw new UnauthorizedException(
          'Profile is locked. Unlock key required.',
        );
      }
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

    return { success: true, user: toPublicUser(user) };
  }

  @Get('session')
  getSession(@Req() request: Request) {
    const token = request.cookies?.moneyup_session;
    if (!token) {
      throw new UnauthorizedException('No active session found');
    }

    return {
      isAuthenticated: true,
      user: verifyJwtToken(token),
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('moneyup_session');
    return { success: true };
  }

  @Post('unlock')
  async unlockProfile(
    @Body() payload: { userId: string; unlockKey: string },
  ): Promise<{ success: boolean; unlockTicket: string }> {
    const user = await firstValueFrom(
      this.usersServiceClient
        .send<UserPayload | null>('user_find_one', payload.userId)
        .pipe(timeout(2000)),
    );

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    if (!user.isLocked) {
      return { success: true, unlockTicket: createUnlockTicket(user.id) };
    }

    const verification = await firstValueFrom(
      this.usersServiceClient
        .send<{ valid: boolean }>('user_verify_unlock', {
          id: payload.userId,
          unlockKey: payload.unlockKey,
        })
        .pipe(timeout(2000)),
    );

    if (!verification.valid) {
      throw new UnauthorizedException('Invalid unlocking key');
    }

    return { success: true, unlockTicket: createUnlockTicket(user.id) };
  }
}
