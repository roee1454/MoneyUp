import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { type Browser, type BrowserContext } from 'puppeteer';

@Injectable()
export class BrowserManagerService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<string>('SCRAPER_MODE') === 'simulation') {
      return;
    }

    await this.getBrowser().catch((err) => {
      console.warn(
        '[BrowserManagerService] Failed to warm Chromium; will retry on first scrape:',
        err?.message ?? err,
      );
    });
  }

  async createIsolatedContext(showBrowser?: boolean): Promise<BrowserContext> {
    const browser = await this.getBrowser(showBrowser);
    return browser.createBrowserContext();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async getBrowser(showBrowser?: boolean): Promise<Browser> {
    if (this.browser?.connected) {
      // If the current browser doesn't match the requested headless state, we might need to restart it.
      // However, to keep it simple and efficient, we'll only restart if showBrowser is explicitly true
      // and the current browser is headless.
      const isCurrentlyHeadless = (this.browser as any)._process?.spawnargs?.includes('--headless');
      if (showBrowser === true && isCurrentlyHeadless) {
        await this.closeBrowser();
      } else {
        return this.browser;
      }
    }

    if (!this.launchPromise) {
      this.launchPromise = this.launchBrowser(showBrowser);
    }

    try {
      this.browser = await this.launchPromise;
      return this.browser;
    } finally {
      this.launchPromise = null;
    }
  }

  private async launchBrowser(showBrowser?: boolean): Promise<Browser> {
    const debugEnabled =
      this.configService.get<string>('SCRAPER_DEBUG') === '1';
    const headless = showBrowser === true ? false : !debugEnabled;
    const timeoutMs = Number(
      this.configService.get<string>('SCRAPER_TIMEOUT_MS') || 90000,
    );
    const executablePath =
      this.configService.get<string>('SCRAPER_CHROMIUM_EXECUTABLE_PATH') ||
      this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
      undefined;

    const browser = await puppeteer.launch({
      headless,
      executablePath,
      timeout: timeoutMs,
      args: this.getBrowserArgs(),
      env: debugEnabled ? { DEBUG: '*', ...process.env } : undefined,
    });

    browser.once('disconnected', () => {
      if (this.browser === browser) {
        this.browser = null;
      }
    });

    return browser;
  }

  private getBrowserArgs(): string[] {
    const configuredArgs = this.configService.get<string>(
      'SCRAPER_BROWSER_ARGS',
    );
    if (configuredArgs) {
      return configuredArgs
        .split(',')
        .map((arg) => arg.trim())
        .filter(Boolean);
    }

    return process.env.CI === 'true'
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : [];
  }

  private async closeBrowser(): Promise<void> {
    const browser = this.browser;
    this.browser = null;
    if (browser?.connected) {
      await browser.close();
    }
  }
}
