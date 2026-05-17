import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AiServiceService } from './ai-service.service';

@Controller()
export class AiServiceController {
  constructor(private readonly aiServiceService: AiServiceService) {}

  @MessagePattern('ai_hello')
  getHelloMessage(): string {
    return this.aiServiceService.getHello();
  }
}
