import {
  CompanyTypes,
  ScraperCredentials,
  ScraperOptions,
} from 'israeli-bank-scrapers';
import { ConfigService } from '@nestjs/config';
import { BrowserService } from '../browser/browser.service';
import {
  UnifiedAccount,
  UnifiedTransaction,
  ScraperResponse,
} from '@money-up/types';

export abstract class BaseScraper {
  abstract readonly companyId: CompanyTypes;
  constructor(
    protected readonly configService: ConfigService,
    protected readonly browserService: BrowserService,
  ) {}

  async scrape(
    credentials: ScraperCredentials,
    startDate: Date,
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
      executablePath?: string;
      browser?: any;
      skipCloseBrowser?: boolean;
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
      executablePath?: string;
    },
  ): Promise<ScraperResponse>;

  protected getCommonScraperOptions(options?: {
    showBrowser?: boolean;
    executablePath?: string;
  }): Partial<ScraperOptions> {
    const debugEnabled =
      this.configService.get<string>('SCRAPER_DEBUG') === '1';
    const showBrowser = options?.showBrowser ?? false;

    const executablePath =
      options?.executablePath ||
      this.configService.get<string>('SCRAPER_CHROMIUM_EXECUTABLE_PATH') ||
      this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
      undefined;

    if (executablePath) {
      console.log(
        `[Scraper] Initializing ${this.companyId} with executablePath: ${executablePath}`,
      );
    } else {
      console.warn(
        `[Scraper] No executablePath provided for ${this.companyId}, relying on Puppeteer defaults.`,
      );
    }

    const args = this.browserService.getCommonBrowserArgs();

    return {
      showBrowser,
      executablePath,
      args,
      verbose: debugEnabled,
      storeFailureScreenShotPath: debugEnabled
        ? `data/scraper-failures/failure-${this.companyId}-${Date.now()}.png`
        : undefined,
      viewportSize: {
        width: 1920,
        height: 1080,
      },
      preparePage: async (page) => {
        // Set a realistic User-Agent to avoid being flagged as a headless browser
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        );

        // Mask the navigator.webdriver property and other headless traces
        await page.evaluateOnNewDocument(() => {
          // @ts-ignore
          delete navigator.__proto__.webdriver;
          // @ts-ignore
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
          });
          // @ts-ignore
          Object.defineProperty(navigator, 'languages', {
            get: () => ['he-IL', 'he', 'en-US', 'en'],
          });
          // @ts-ignore
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              {
                description: 'Portable Document Format',
                filename: 'internal-pdf-viewer',
                name: 'Chrome PDF Viewer',
              },
            ],
          });
          // @ts-ignore
          window.chrome = {
            runtime: {},
            loadTimes: () => {},
            csi: () => {},
            app: {},
          };
          // @ts-ignore
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => 8,
          });
        });

        // Debug logging for console messages from the page
        page.on('console', (msg) => {
          if (msg.type() === 'error' || msg.text().includes('bot') || msg.text().includes('automation')) {
            console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
          }
        });

        // Log navigation to track where we are
        page.on('framenavigated', (frame) => {
          if (frame === page.mainFrame()) {
            console.log(`[Browser Navigation] Main frame navigated to: ${frame.url()}`);
          }
        });
      },
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
