import { Test, TestingModule } from '@nestjs/testing';

// Mock browser service and factory to prevent Jest loading the ESM @puppeteer/browsers dependencies
jest.mock('./browser/browser.service', () => ({
  BrowserService: jest.fn().mockImplementation(() => ({
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
import { BrowserService } from './browser/browser.service';
import { SessionService } from './session/session.service';
import { CredentialsService } from './credentials/credentials.service';
import { SyncService } from './sync/sync.service';
import { CacheService } from './cache/cache.service';
import { CoverageService } from './coverage/coverage.service';
import { ScansService } from './scans/scans.service';
import { ScraperFactory } from './scraper-factory.service';


describe('ScraperController', () => {
  let scraperServiceController: ScraperController;

  const mockService = {};

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [
        { provide: BrowserService, useValue: mockService },
        { provide: SessionService, useValue: mockService },
        { provide: CredentialsService, useValue: mockService },
        { provide: SyncService, useValue: mockService },
        { provide: CacheService, useValue: mockService },
        { provide: CoverageService, useValue: mockService },
        { provide: ScansService, useValue: mockService },
        { provide: ScraperFactory, useValue: mockService },
      ],
    }).compile();

    scraperServiceController = app.get<ScraperController>(ScraperController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(scraperServiceController.getHelloMessage()).toBe('Hello World!');
    });
  });
});
