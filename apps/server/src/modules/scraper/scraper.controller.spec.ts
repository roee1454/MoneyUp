import { Test, TestingModule } from '@nestjs/testing';

// Mock browser service and factory to prevent Jest loading the ESM @puppeteer/browsers dependencies
jest.mock('../chromium/chromium.service', () => ({
  ChromiumService: jest.fn().mockImplementation(() => ({
    detectChromium: jest.fn(),
    installChromium: jest.fn(),
    installChromiumStream: jest.fn(),
    ensureBrowser: jest.fn(),
  })),
}));

jest.mock('./scraper-factory.service', () => ({
  ScraperFactory: jest.fn().mockImplementation(() => ({
    getScraper: jest.fn(),
  })),
}));

import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { UsersService } from '../users/users.service';
import { SyncJobService } from '../sync/sync-job.service';

describe('ScraperController', () => {
  let scraperServiceController: ScraperController;
  let mockScraperService: jest.Mocked<ScraperService>;

  beforeEach(async () => {
    mockScraperService = {
      getScrapersList: jest.fn().mockResolvedValue([]),
    } as any;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [
        { provide: ScraperService, useValue: mockScraperService },
        { provide: UsersService, useValue: {} },
        { provide: SyncJobService, useValue: {} },
      ],
    }).compile();

    scraperServiceController = app.get<ScraperController>(ScraperController);
  });

  describe('root', () => {
    it('should return scrapers list', async () => {
      expect(await scraperServiceController.getScrapersList()).toEqual([]);
    });
  });
});
