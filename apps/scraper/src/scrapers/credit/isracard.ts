import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseScraper } from '../base';
import {
  CompanyTypes,
  createScraper,
  ScraperCredentials,
} from 'israeli-bank-scrapers';
import { ScraperResponse } from '@moneyup/types';

@Injectable()
export class IsracardScraper extends BaseScraper {
  constructor(configService: ConfigService) {
    super(configService);
  }

  readonly companyId = CompanyTypes.isracard;

  protected async simulateScrape(
    _credentials: ScraperCredentials,
  ): Promise<ScraperResponse> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        status: 'SUCCESS',
        accounts: [
          {
            accountNumber: 'ISRACARD-1122',
            balance: -2450,
            transactions: [
              {
                id: 'txn_isracard_1',
                date: new Date(
                  Date.now() - 1 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 1 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -120,
                chargedAmount: -120,
                description: 'וולט מרקט',
                originalCurrency: 'ILS',
              },
              {
                id: 'txn_isracard_2',
                date: new Date(
                  Date.now() - 5 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 5 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -350,
                chargedAmount: -350,
                description: 'זארה קניון',
                originalCurrency: 'ILS',
              },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected credit card scraper crash occurred',
      };
    }
  }

  protected async liveScrape(
    credentials: ScraperCredentials,
    startDate: Date,
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
    },
  ): Promise<ScraperResponse> {
    try {
      const timeoutMs =
        options?.loginTimeoutSeconds !== undefined
          ? options.loginTimeoutSeconds * 1000
          : Number(
              this.configService.get<string>('SCRAPER_TIMEOUT_MS') || 90000,
            );
      const defaultTimeoutMs =
        options?.defaultTimeoutSeconds !== undefined
          ? options.defaultTimeoutSeconds * 1000
          : Number(
              this.configService.get<string>('SCRAPER_DEFAULT_TIMEOUT_MS') ||
                timeoutMs,
            );

      const scraper = createScraper({
        ...this.getCommonScraperOptions({ showBrowser: options?.showBrowser }),
        companyId: this.companyId,
        startDate,
        combineInstallments: false,
        timeout: timeoutMs,
        defaultTimeout: defaultTimeoutMs,
        additionalTransactionInformation: false,
        futureMonthsToScrape: 1,
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
              : 'Unknown error occurred during credit card scraping',
        };
      }

      const rawAccounts = scrapeResult.accounts || [];
      return {
        status: 'SUCCESS',
        accounts: this.normalizeAccounts(rawAccounts),
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected credit card scraper crash occurred',
      };
    }
  }
}
