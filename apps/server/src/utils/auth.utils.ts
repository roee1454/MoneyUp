import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SessionTokenPayload, UserPayload } from '../types/gateway.types';

export function verifyJwtToken(token: string): SessionTokenPayload {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new UnauthorizedException('Invalid session token');
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as SessionTokenPayload;

    if (!payload.userId || !payload.username) {
      throw new UnauthorizedException('Invalid session payload');
    }

    return payload;
  } catch {
    throw new UnauthorizedException('Invalid session token');
  }
}

export function requireSessionUserId(request: Request): string {
  const sessionToken = request.cookies?.moneyup_session;
  if (!sessionToken) {
    throw new UnauthorizedException('No active session found');
  }
  return verifyJwtToken(sessionToken).userId;
}

export function createUnlockTicket(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Date.now() + 5 * 60 * 1000,
    }),
  ).toString('base64url');
  const signature = Buffer.from(`${payload}.moneyup-unlock`).toString(
    'base64url',
  );
  return `${payload}.${signature}`;
}

export function verifyUnlockTicket(ticket: string, userId: string): boolean {
  const [payload, signature] = ticket.split('.');
  if (!payload || !signature) return false;
  const expectedSignature = Buffer.from(`${payload}.moneyup-unlock`).toString(
    'base64url',
  );
  if (signature !== expectedSignature) return false;

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as {
      userId: string;
      exp: number;
    };
    if (decoded.userId !== userId) return false;
    return decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export function toPublicUser(user: UserPayload) {
  return {
    id: user.id,
    username: user.username,
    isLocked: user.isLocked ?? false,
    activeAiProvider: user.activeAiProvider ?? null,
    preferredModel: user.preferredModel ?? null,
    configuredProviders: user.configuredProviders ?? [],
    scraperTimeoutRetryCount: user.scraperTimeoutRetryCount ?? 1,
    scraperAutoSyncCooldownSeconds: user.scraperAutoSyncCooldownSeconds ?? 1800,
    scraperShowBrowser: user.scraperShowBrowser ?? false,
    scraperLoginTimeoutSeconds: user.scraperLoginTimeoutSeconds ?? 90,
    scraperDefaultTimeoutSeconds: user.scraperDefaultTimeoutSeconds ?? 90,
    scraperChromiumPath: user.scraperChromiumPath ?? null,
    aiProviderConfigs: user.aiProviderConfigs ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
