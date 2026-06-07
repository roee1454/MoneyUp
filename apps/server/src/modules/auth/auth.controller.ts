import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserPayload } from '../../types/gateway.types';
import {
  createUnlockTicket,
  toPublicUser,
  verifyJwtToken,
  verifyUnlockTicket,
} from '../../utils/auth.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(
    @Body()
    payload: { userId: string; username: string; unlockTicket?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.usersService.findOne(payload.userId);

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

    const { token } = this.authService.authenticate(
      payload.userId,
      payload.username,
    );

    response.cookie('moneyup_session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true, user: toPublicUser(user as unknown as UserPayload) };
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
    const user = await this.usersService.findOne(payload.userId);

    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    if (!user.isLocked) {
      return { success: true, unlockTicket: createUnlockTicket(user.id) };
    }

    const verification = await this.usersService.verifyUnlockKey(
      payload.userId,
      payload.unlockKey,
    );

    if (!verification.valid) {
      throw new UnauthorizedException('Invalid unlocking key');
    }

    return { success: true, unlockTicket: createUnlockTicket(user.id) };
  }
}
