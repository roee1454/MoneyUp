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

  async createIsolatedContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    return browser.createBrowserContext();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (!this.launchPromise) {
      this.launchPromise = this.launchBrowser();
    }

    try {
      this.browser = await this.launchPromise;
      return this.browser;
    } finally {
      this.launchPromise = null;
    }
  }

  private async launchBrowser(): Promise<Browser> {
    const debugEnabled =
      this.configService.get<string>('SCRAPER_DEBUG') === '1';
    const timeoutMs = Number(
      this.configService.get<string>('SCRAPER_TIMEOUT_MS') || 90000,
    );
    const executablePath =
      this.configService.get<string>('SCRAPER_CHROMIUM_EXECUTABLE_PATH') ||
      this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
      undefined;

    const browser = await puppeteer.launch({
      headless: !debugEnabled,
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
