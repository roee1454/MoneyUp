import { Test, TestingModule } from '@nestjs/testing';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

describe('ScraperController', () => {
  let scraperServiceController: ScraperController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [ScraperService],
    }).compile();

    scraperServiceController = app.get<ScraperController>(ScraperController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(scraperServiceController.getHelloMessage()).toBe('Hello World!');
    });
  });
});
