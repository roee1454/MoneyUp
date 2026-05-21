import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { of } from 'rxjs';
import { RedisCacheService } from './redis-cache.service';

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
        {
          provide: 'AUTH_SERVICE',
          useValue: { send: jest.fn(() => of('pong')) },
        },
        {
          provide: 'USERS_SERVICE',
          useValue: { send: jest.fn(() => of(null)) },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('microservices', () => {
    it('should return ai greeting', async () => {
      await expect(appController.getAiGreeting()).resolves.toBe(
        'AI gateway endpoint is ready',
      );
    });

    it('should return scraper greeting', async () => {
      await expect(appController.getScraperGreeting()).resolves.toBe(
        'Hello World!',
      );
    });

    it('should return healthy status when all services are up', async () => {
      const response = await appController.getHealth();
      expect(response.status).toBe('healthy');
      expect(response.services).toEqual({
        ai: 'up',
        scraper: 'up',
        auth: 'up',
        users: 'up',
      });
    });
  });
});
