import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly aiServiceService: AiService) {}

  @MessagePattern('ai_hello')
  getHelloMessage(): string {
    return this.aiServiceService.getHello();
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}
