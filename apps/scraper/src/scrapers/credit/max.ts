import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseScraper } from '../base';
import { BrowserManagerService } from '../../browser-manager.service';
import {
  CompanyTypes,
  createScraper,
  ScraperCredentials,
} from 'israeli-bank-scrapers';
import { ScraperResponse } from '@moneyup/types';

@Injectable()
export class MaxScraper extends BaseScraper {
  constructor(
    configService: ConfigService,
    browserManager: BrowserManagerService,
  ) {
    super(configService, browserManager);
  }

  readonly companyId = CompanyTypes.max;

  protected async simulateScrape(
    _credentials: ScraperCredentials,
  ): Promise<ScraperResponse> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        status: 'SUCCESS',
        accounts: [
          {
            accountNumber: 'MAX-5458',
            balance: -1840,
            transactions: [
              {
                id: 'txn_max_1',
                date: new Date(
                  Date.now() - 3 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 3 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -420,
                chargedAmount: -420,
                description: 'קנייה באמזון',
                originalCurrency: 'ILS',
              },
              {
                id: 'txn_max_2',
                date: new Date(
                  Date.now() - 8 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 8 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -95,
                chargedAmount: -95,
                description: 'תחנת דלק פז',
                originalCurrency: 'ILS',
              },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected bank scraper crash occurred',
      };
    }
  }

  protected async liveScrape(
    credentials: ScraperCredentials,
    startDate: Date,
  ): Promise<ScraperResponse> {
    try {
      const debugEnabled =
        this.configService.get<string>('SCRAPER_DEBUG') === '1';
      const timeoutMs = Number(
        this.configService.get<string>('SCRAPER_TIMEOUT_MS') || 90000,
      );
      const defaultTimeoutMs = Number(
        this.configService.get<string>('SCRAPER_DEFAULT_TIMEOUT_MS') ||
          timeoutMs,
      );

      return await this.withIsolatedBrowserContext(async (browserContext) => {
        const scraper = createScraper({
          companyId: this.companyId,
          startDate,
          combineInstallments: false,
          browserContext,
          verbose: debugEnabled,
          timeout: timeoutMs,
          defaultTimeout: defaultTimeoutMs,
          storeFailureScreenShotPath: debugEnabled
            ? 'data/scraper-failures'
            : undefined,
        });

        const scrapeResult = await scraper.scrape(credentials);

        if (!scrapeResult.success) {
          const errorParts = [
            scrapeResult.errorType,
            scrapeResult.errorMessage,
          ].filter(Boolean);
          return {
            status: 'FAILED',
            error:
              errorParts.length > 0
                ? errorParts.join(': ')
                : 'Unknown error occurred during bank scraping',
          };
        }

        const rawAccounts = scrapeResult.accounts || [];
        return {
          status: 'SUCCESS',
          accounts: this.normalizeAccounts(rawAccounts),
        };
      });
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected bank scraper crash occurred',
      };
    }
  }
}
