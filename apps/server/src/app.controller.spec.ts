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
        {
          provide: 'AUTH_SERVICE',
          useValue: { send: jest.fn(() => of('pong')) },
        },
        {
          provide: 'USERS_SERVICE',
          useValue: { send: jest.fn(() => of(null)) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
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
