import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ScraperService } from './scraper.service';

@Controller()
export class ScraperController {
  constructor(private readonly scraperServiceService: ScraperService) {}

  @MessagePattern('scraper_hello')
  getHelloMessage(): string {
    return this.scraperServiceService.getHello();
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }
}
