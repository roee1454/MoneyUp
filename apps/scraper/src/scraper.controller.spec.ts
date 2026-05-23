import { Test, TestingModule } from '@nestjs/testing';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ScrapedCoverageEntity } from './entities/coverage.entity';
import { ScraperFactory } from './scraper-factory.service';

describe('ScraperController', () => {
  let scraperServiceController: ScraperController;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  };

  const mockScraperFactory = {
    getScraper: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [
        ScraperService,
        {
          provide: getRepositoryToken(VaultEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ScrapedCacheEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MerchantAnnotationEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ScrapedCoverageEntity),
          useValue: mockRepository,
        },
        {
          provide: ScraperFactory,
          useValue: mockScraperFactory,
        },
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
