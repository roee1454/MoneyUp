import { Injectable } from '@nestjs/common';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { BaseScraper } from './scrapers/base';

@Injectable()
export class ScraperFactory {
  constructor(
    private readonly hapoalimScraper: HapoalimScraper,
    private readonly maxScraper: MaxScraper,
    private readonly isracardScraper: IsracardScraper,
  ) {}

  getScraper(bankId: string): BaseScraper {
    switch (bankId) {
      case 'hapoalim':
        return this.hapoalimScraper;
      case 'max':
        return this.maxScraper;
      case 'isracard':
        return this.isracardScraper;
      default:
        throw new Error(
          `Scraper provider for '${bankId}' is not implemented or supported.`,
        );
    }
  }
}
