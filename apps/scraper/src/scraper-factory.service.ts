import { Injectable } from '@nestjs/common';
import { HapoalimScraper } from './scrapers/banks/hapoalim';
import { LeumiScraper } from './scrapers/banks/leumi';
import { YahavScraper } from './scrapers/banks/yahav';
import { MaxScraper } from './scrapers/credit/max';
import { IsracardScraper } from './scrapers/credit/isracard';
import { CalScraper } from './scrapers/credit/cal';
import { BaseScraper } from './scrapers/base';

@Injectable()
export class ScraperFactory {
  constructor(
    private readonly hapoalimScraper: HapoalimScraper,
    private readonly leumiScraper: LeumiScraper,
    private readonly yahavScraper: YahavScraper,
    private readonly maxScraper: MaxScraper,
    private readonly isracardScraper: IsracardScraper,
    private readonly calScraper: CalScraper,
  ) {}

  getScraper(bankId: string): BaseScraper {
    switch (bankId) {
      case 'hapoalim':
        return this.hapoalimScraper;
      case 'leumi':
        return this.leumiScraper;
      case 'yahav':
        return this.yahavScraper;
      case 'max':
        return this.maxScraper;
      case 'isracard':
        return this.isracardScraper;
      case 'cal':
        return this.calScraper;
      default:
        throw new Error(
          `Scraper provider for '${bankId}' is not implemented or supported.`,
        );
    }
  }
}
