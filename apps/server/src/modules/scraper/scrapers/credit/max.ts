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
export class MaxScraper extends BaseScraper {
  constructor(
    configService: ConfigService,
    browserService: BrowserService,
  ) {
    super(configService, browserService);
  }

  readonly companyId = CompanyTypes.max;

  protected async simulateScrape(
    _credentials: ScraperCredentials,
    onProgress?: (step: string) => void,
  ): Promise<ScraperResponse> {
    try {
      await this.runSimulatedProgress(onProgress);

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
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
      executablePath?: string;
      browser?: any;
      skipCloseBrowser?: boolean;
      onProgress?: (step: string) => void;
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
        ...(options?.browser ? { browser: options.browser } : {}),
        ...(options?.skipCloseBrowser !== undefined
          ? { skipCloseBrowser: options.skipCloseBrowser }
          : {}),
      });

      this.registerProgressListener(scraper, options?.onProgress);

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
    } catch (err: any) {
      return {
        status: 'FAILED',
        error: err?.message || 'Unexpected bank scraper crash occurred',
      };
    }
  }
}
