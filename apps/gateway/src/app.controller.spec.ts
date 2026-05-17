import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { of } from 'rxjs';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: 'AI_SERVICE',
          useValue: { send: jest.fn(() => of('Hello World!')) },
        },
        {
          provide: 'SCRAPER_SERVICE',
          useValue: { send: jest.fn(() => of('Hello World!')) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('microservices', () => {
    it('should return ai greeting', async () => {
      await expect(appController.getAiGreeting()).resolves.toBe('Hello World!');
    });

    it('should return scraper greeting', async () => {
      await expect(appController.getScraperGreeting()).resolves.toBe(
        'Hello World!',
      );
    });
  });
});
