import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseScraper } from '../base';
import { BrowserService } from '../../browser/browser.service';
import {
  CompanyTypes,
  createScraper,
  ScraperCredentials,
} from 'israeli-bank-scrapers';
import { ScraperResponse } from '@money-up/types';

@Injectable()
export class LeumiScraper extends BaseScraper {
  constructor(
    protected configService: ConfigService,
    protected browserService: BrowserService,
  ) {
    super(configService, browserService);
  }

  readonly companyId = CompanyTypes.leumi;

  protected async simulateScrape(
    _credentials: ScraperCredentials,
  ): Promise<ScraperResponse> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        status: 'SUCCESS',
        accounts: [
          {
            accountNumber: '10-345-67890',
            balance: 22400,
            transactions: [
              {
                id: 'txn_leumi_1',
                date: new Date(
                  Date.now() - 3 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 3 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -150,
                chargedAmount: -150,
                description: 'AM:PM תל אביב',
                originalCurrency: 'ILS',
              },
            ],
          },
        ],
      };
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected Leumi scraper crash occurred',
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
      executablePath?: string;
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
        ...this.getCommonScraperOptions(options),
        companyId: this.companyId,
        startDate,
        combineInstallments: false,
        timeout: timeoutMs,
        defaultTimeout: defaultTimeoutMs,
        additionalTransactionInformation: false,
        includeRawTransaction: true,
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
              : 'Unknown error occurred during Leumi scraping',
        };
      }

      const rawAccounts = scrapeResult.accounts || [];
      return {
        status: 'SUCCESS',
        accounts: this.normalizeAccounts(rawAccounts),
      };
    } catch (err: unknown) {
      return {
        status: 'FAILED',
        error: (err as Error)?.message || 'Unexpected Leumi scraper crash occurred',
      };
    }
  }
}
