import { Injectable } from '@nestjs/common';
import { HapoalimScraper } from './scrapers/hapoalim-scraper';
import { MaxScraper } from './scrapers/max-scraper';
import { BaseScraper } from './scrapers/base-scraper';

@Injectable()
export class ScraperFactory {
  constructor(
    private readonly hapoalimScraper: HapoalimScraper,
    private readonly maxScraper: MaxScraper,
  ) { }

  getScraper(bankId: string): BaseScraper {
    switch (bankId) {
      case 'hapoalim':
        return this.hapoalimScraper;
      case 'max':
        return this.maxScraper;
      default:
        throw new Error(`Scraper provider for '${bankId}' is not implemented or supported.`);
    }
  }
}
