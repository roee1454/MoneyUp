import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth_authenticate')
  authenticate(@Payload() payload: { userId: string; username: string }) {
    return this.authService.authenticate(payload.userId, payload.username);
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}
