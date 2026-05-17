import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ScraperServiceService } from './scraper-service.service';

@Controller()
export class ScraperServiceController {
  constructor(private readonly scraperServiceService: ScraperServiceService) {}

  @MessagePattern('scraper_hello')
  getHelloMessage(): string {
    return this.scraperServiceService.getHello();
  }
}
