import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    @Inject('AI_SERVICE') private readonly aiServiceClient: ClientProxy,
    @Inject('SCRAPER_SERVICE')
    private readonly scraperServiceClient: ClientProxy,
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
}
