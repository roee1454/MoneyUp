jest.mock('../../../chromium/chromium.service', () => ({
  ChromiumService: class {
    getCommonBrowserArgs() {
      return ['--no-sandbox'];
    }
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { YahavScraper } from './yahav';
import * as israeliBankScrapers from 'israeli-bank-scrapers';

jest.mock('israeli-bank-scrapers');

describe('YahavScraper', () => {
  let scraper: YahavScraper;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SCRAPER_MODE') return 'live';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YahavScraper,
        { provide: ConfigService, useValue: mockConfigService },
        { 
          provide: require('../../../chromium/chromium.service').ChromiumService, 
          useValue: { getCommonBrowserArgs: () => ['--no-sandbox'] } 
        },
      ],
    }).compile();

    scraper = module.get<YahavScraper>(YahavScraper);
  });

  it('should be defined', () => {
    expect(scraper).toBeDefined();
  });

  describe('simulateScrape', () => {
    it('should return mock accounts in simulation mode', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SCRAPER_MODE') return 'simulation';
        return null;
      });

      const result = await scraper.scrape({ username: 'test', password: 'test', nationalID: '123456789', accountNumber: '04-123-45678' } as any, new Date());
      expect(result.status).toBe('SUCCESS');
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts![0].accountNumber).toBe('04-123-45678');
    });
  });

  describe('liveScrape', () => {
    it('should call israeli-bank-scrapers with correct params', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SCRAPER_MODE') return 'live';
        return null;
      });

      const mockScraperInstance = {
        scrape: jest.fn().mockResolvedValue({
          success: true,
          accounts: [{ accountNumber: '123', txns: [] }],
        }),
      };
      (israeliBankScrapers.createScraper as jest.Mock).mockReturnValue(mockScraperInstance);

      const result = await scraper.scrape({ username: 'test', password: 'test', nationalID: '123456789', accountNumber: '04-123-45678' } as any, new Date());
      
      expect(israeliBankScrapers.createScraper).toHaveBeenCalledWith(expect.objectContaining({
        companyId: israeliBankScrapers.CompanyTypes.yahav,
      }));
      expect(result.status).toBe('SUCCESS');
    });
  });
});
