import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  authenticate(userId: string, username: string) {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        userId,
        username,
        isAuthenticated: true,
        loginTime: new Date().toISOString(),
      }),
    ).toString('base64url');
    const signature = Buffer.from('moneyup-local-signature').toString(
      'base64url',
    );
    return { token: `${header}.${payload}.${signature}` };
  }
}
