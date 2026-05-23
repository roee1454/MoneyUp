import {
  CompanyTypes,
  ScraperCredentials,
  ScraperOptions,
} from 'israeli-bank-scrapers';
import { ConfigService } from '@nestjs/config';
import {
  UnifiedAccount,
  UnifiedTransaction,
  ScraperResponse,
} from '@moneyup/types';

export abstract class BaseScraper {
  abstract readonly companyId: CompanyTypes;
  constructor(protected readonly configService: ConfigService) {}

  async scrape(
    credentials: ScraperCredentials,
    startDate: Date,
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
    },
  ): Promise<ScraperResponse> {
    const isSimulation =
      this.configService.get<string>('SCRAPER_MODE') === 'simulation';
    return isSimulation
      ? this.simulateScrape(credentials)
      : this.liveScrape(credentials, startDate, options);
  }

  protected abstract simulateScrape(
    credentials: ScraperCredentials,
  ): Promise<ScraperResponse>;
  protected abstract liveScrape(
    credentials: ScraperCredentials,
    startDate: Date,
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
    },
  ): Promise<ScraperResponse>;

  protected getCommonScraperOptions(options?: {
    showBrowser?: boolean;
  }): Partial<ScraperOptions> {
    const debugEnabled =
      this.configService.get<string>('SCRAPER_DEBUG') === '1';
    const showBrowser = options?.showBrowser ?? false;

    const executablePath =
      this.configService.get<string>('SCRAPER_CHROMIUM_EXECUTABLE_PATH') ||
      this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
      undefined;

    const configuredArgs = this.configService.get<string>(
      'SCRAPER_BROWSER_ARGS',
    );
    const args = configuredArgs
      ? configuredArgs
          .split(',')
          .map((arg) => arg.trim())
          .filter(Boolean)
      : process.env.CI === 'true'
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [];

    return {
      showBrowser,
      executablePath,
      args,
      verbose: debugEnabled,
      storeFailureScreenShotPath: debugEnabled
        ? 'data/scraper-failures'
        : undefined,
    };
  }

  protected normalizeAccounts(rawAccounts: any[]): UnifiedAccount[] {
    return rawAccounts.map((account) => {
      const rawTxns = account.txns || [];
      const normalizedTxns: UnifiedTransaction[] = rawTxns.map((txn, index) => {
        const txnDate = txn.date
          ? new Date(txn.date).toISOString()
          : new Date().toISOString();
        const processedDate = txn.processedDate
          ? new Date(txn.processedDate).toISOString()
          : txnDate;

        return {
          id: txn.id || `txn_${Date.now()}_${index}`,
          date: txnDate,
          processedDate,
          amount: typeof txn.amount === 'number' ? txn.amount : 0,
          chargedAmount:
            typeof txn.chargedAmount === 'number' ? txn.chargedAmount : 0,
          description: txn.description || '',
          memo: txn.memo || '',
          originalCurrency: txn.originalCurrency || 'ILS',
        };
      });

      return {
        accountNumber: account.accountNumber || 'unknown',
        balance:
          typeof account.balance === 'number' ? account.balance : undefined,
        transactions: normalizedTxns,
      };
    });
  }
}
