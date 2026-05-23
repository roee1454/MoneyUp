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
export class HapoalimScraper extends BaseScraper {
  constructor(configService: ConfigService) {
    super(configService);
  }

  readonly companyId = CompanyTypes.hapoalim;

  protected async simulateScrape(
    credentials: ScraperCredentials,
  ): Promise<ScraperResponse> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if ('otpCodeRetriever' in credentials && credentials.otpCodeRetriever) {
        try {
          const code = await credentials.otpCodeRetriever();
          if (code !== '123456') {
            return { status: 'FAILED', error: 'Invalid OTP code' };
          }
        } catch (err: any) {
          return {
            status: 'FAILED',
            error: err?.message || 'OTP challenge failed',
          };
        }
      }

      return {
        status: 'SUCCESS',
        accounts: [
          {
            accountNumber: '12-345-67890',
            balance: 14500,
            transactions: [
              {
                id: 'txn_hapoalim_1',
                date: new Date(
                  Date.now() - 2 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 2 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: -250,
                chargedAmount: -250,
                description: 'שופרסל שלי',
                originalCurrency: 'ILS',
              },
              {
                id: 'txn_hapoalim_2',
                date: new Date(
                  Date.now() - 4 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                processedDate: new Date(
                  Date.now() - 4 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                amount: 5200,
                chargedAmount: 5200,
                description: 'העברה נכנסת - מעסיק',
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
