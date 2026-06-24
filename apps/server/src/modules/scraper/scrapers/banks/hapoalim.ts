import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseScraper } from '../base';
import { ChromiumService } from '../../../chromium/chromium.service';
import {
  CompanyTypes,
  createScraper,
  ScraperCredentials,
} from 'israeli-bank-scrapers';
import { ScraperResponse } from '@money-up/types';

/**
 * Class representing HapoalimScraper.
 */
@Injectable()
export class HapoalimScraper extends BaseScraper {
  constructor(
    configService: ConfigService,
    browserService: ChromiumService,
  ) {
    super(configService, browserService);
  }

  readonly companyId = CompanyTypes.hapoalim;

  protected async simulateScrape(
    credentials: ScraperCredentials,
    onProgress?: (step: string) => void,
  ): Promise<ScraperResponse> {
    try {
      onProgress?.('logging_in');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if ('otpCodeRetriever' in credentials && credentials.otpCodeRetriever) {
        onProgress?.('awaiting_otp');
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

      onProgress?.('logged_in');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onProgress?.('scanning_transactions');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onProgress?.('finalizing');
      await new Promise((resolve) => setTimeout(resolve, 800));

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
        additionalTransactionInformation: false,
        includeRawTransaction: true,
        ...(options?.browser ? { browser: options.browser } : {}),
        ...(options?.skipCloseBrowser !== undefined
          ? { skipCloseBrowser: options.skipCloseBrowser }
          : {}),
      });

      this.registerProgressListener(scraper, options?.onProgress);

      // Patch the scraper instance to handle Hapoalim redirect to transactions page
      // Some versions of Hapoalim redirect directly to /transactions instead of /homepage
      const originalGetLoginOptions = (scraper as any).getLoginOptions.bind(
        scraper,
      );
      (scraper as any).getLoginOptions = (creds: any) => {
        const loginOptions = originalGetLoginOptions(creds);
        if (loginOptions.possibleResults) {
          // Success is usually the first key or a specific "SUCCESS" constant in the library
          // We add the transactions pattern to all success-related arrays
          for (const key of Object.keys(loginOptions.possibleResults)) {
            if (key.toUpperCase() === 'SUCCESS') {
              loginOptions.possibleResults[key].push(
                /current-account\/transactions/,
              );
            }
          }
        }
        return loginOptions;
      };

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
    } catch (err: unknown) {
      return {
        status: 'FAILED',
        error:
          (err as Error)?.message || 'Unexpected bank scraper crash occurred',
      };
    }
  }
}
