import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SCRAPERS, ScraperCredentials } from 'israeli-bank-scrapers';
import { ScraperFactory } from '../scraper-factory.service';
import { BrowserService } from '../browser/browser.service';
import { CredentialsService } from '../credentials/credentials.service';
import { CacheService } from '../cache/cache.service';
import { CoverageService } from '../coverage/coverage.service';
import { SessionService } from '../session/session.service';
import {
  getTodayUtcDateString,
  getOneMonthAgoUtcDateString,
  subtractUtcDate,
  toUtcDate,
  addDays,
} from '../utils/date.utils';
import { ScraperDateLimit } from '../types/scraper.types';
import { SCRAPERS_METADATA } from '../config/scrapers.config';
import puppeteer from 'puppeteer';

const SCRAPER_MIN_LOOKBACKS: Record<string, ScraperDateLimit> = {
  hapoalim: { years: 1, days: 1 },
  leumi: { years: 1 },
  yahav: { years: 1 },
  isracard: { years: 1 },
  max: { years: 4 },
  cal: { years: 1, months: 6, days: 1 },
};

const LIBRARY_SCRAPER_KEY_BY_BANK_ID: Record<string, string> = {
  cal: 'visaCal',
};

@Injectable()
export class SyncService implements OnModuleDestroy {
  private activeSharedBrowser: any = null;

  constructor(
    private readonly scraperFactory: ScraperFactory,
    private readonly browserService: BrowserService,
    private readonly credentialsService: CredentialsService,
    private readonly cacheService: CacheService,
    private readonly coverageService: CoverageService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  getScrapersList(): any[] {
    const list = Object.entries(SCRAPERS_METADATA).map(([key, meta]) => {
      const libraryKey = LIBRARY_SCRAPER_KEY_BY_BANK_ID[key] ?? key;
      const libraryScraper = SCRAPERS[libraryKey];
      return {
        id: key,
        name: meta.name,
        englishName: libraryScraper?.name || key,
        loginFields: libraryScraper?.loginFields || ['username', 'password'],
        icon: meta.icon,
        enabled: meta.enabled,
        type: meta.type,
      };
    });

    return list.filter((s) => s.enabled);
  }

  getMinimumStartDateForBank(bankId: string): string {
    const limit = SCRAPER_MIN_LOOKBACKS[String(bankId).toLowerCase()] ?? {
      years: 1,
    };
    return subtractUtcDate(new Date(), limit).toISOString().slice(0, 10);
  }

  clampStartDateForBank(bankId: string, startDate?: string): string {
    const requested = (startDate ?? getOneMonthAgoUtcDateString()).slice(0, 10);
    const minimum = this.getMinimumStartDateForBank(bankId);
    return requested < minimum ? minimum : requested;
  }

  normalizeRequestedRangeForBank(
    bankId: string,
    startDate?: string,
    endDate?: string,
  ): { startDate: string; endDate: string } | null {
    const today = getTodayUtcDateString();
    const requestedStart = startDate
      ? startDate.slice(0, 10)
      : getOneMonthAgoUtcDateString();
    let requestedEnd = endDate ? endDate.slice(0, 10) : today;
    if (requestedEnd > today) {
      requestedEnd = today;
    }
    const clampedStart = this.clampStartDateForBank(bankId, requestedStart);
    if (clampedStart > today || clampedStart > requestedEnd) {
      return null;
    }
    return { startDate: clampedStart, endDate: requestedEnd };
  }

  resolveScrapeStartDate(bankId: string, startDate?: string): Date {
    const clampedStartDate = this.clampStartDateForBank(bankId, startDate);
    return toUtcDate(clampedStartDate);
  }

  private isProviderBlockError(error?: string | null): boolean {
    if (!error) return false;
    const lower = error.toLowerCase();
    return (
      lower.includes('bank_unavailable') ||
      lower.includes('block automation') ||
      lower.includes('cloudflare') ||
      lower.includes('waf') ||
      lower.includes('sorry, you have been blocked')
    );
  }

  private isTimeoutError(error?: string | null): boolean {
    if (!error) return false;
    const lower = error.toLowerCase();
    return (
      lower.includes('timeout') ||
      lower.includes('navigation timeout') ||
      lower.includes('timed out') ||
      lower.includes('etimedout')
    );
  }

  async syncUserAccounts(
    userId: string,
    options: {
      startDate?: string;
      endDate?: string;
      mode?: 'initial' | 'manual';
      timeoutRetryCount?: number;
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
      executablePath?: string;
      sessionId?: string;
    },
  ): Promise<void> {
    const mode = options.mode ?? 'manual';

    // Ensure browser is available if no executablePath is provided
    if (!options.executablePath) {
      options.executablePath =
        (await this.browserService.ensureBrowser()) || undefined;
    }

    const timeoutRetryCount = Math.max(
      0,
      Math.min(5, Number(options.timeoutRetryCount ?? 1)),
    );
    const connections =
      await this.credentialsService.getUserConnections(userId);
    const coverageMap = await this.coverageService.getCachedCoverageMap(userId);
    const today = getTodayUtcDateString();
    const failures: Array<{ bankId: string; reason: string }> = [];
    const totalAttempts = timeoutRetryCount + 1;
    const jobs: Array<{
      bankId: string;
      uncoveredIntervals: Array<{ startDate: string; endDate: string }>;
      scrapeStartDate: Date;
      credentials: ScraperCredentials;
      lastError: string;
      lastWasProviderBlock: boolean;
      completed: boolean;
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
      executablePath?: string;
    }> = [];

    for (const conn of connections) {
      const requestedRange = this.normalizeRequestedRangeForBank(
        conn.bankId,
        options.startDate,
        options.endDate,
      );
      if (!requestedRange) continue;

      const coverage = coverageMap.get(conn.bankId) ?? [];
      let uncoveredIntervals = this.coverageService.getUncoveredIntervals(
        requestedRange,
        coverage,
      );

      if (mode === 'manual') {
        const threeDaysAgo = addDays(today, -3);
        const recentStart =
          threeDaysAgo < requestedRange.startDate
            ? requestedRange.startDate
            : threeDaysAgo;
        if (recentStart <= requestedRange.endDate) {
          uncoveredIntervals.push({
            startDate: recentStart,
            endDate: requestedRange.endDate,
          });
        }
        uncoveredIntervals =
          this.coverageService.mergeIntervals(uncoveredIntervals);
      }

      if (uncoveredIntervals.length === 0) continue;

      const minDateStr = uncoveredIntervals.reduce(
        (min, cur) => (cur.startDate < min ? cur.startDate : min),
        uncoveredIntervals[0].startDate,
      );
      const scrapeStartDate = this.resolveScrapeStartDate(
        conn.bankId,
        minDateStr,
      );
      const credentials = await this.credentialsService.getCredentials(
        userId,
        conn.bankId,
      );
      if (!credentials) {
        console.warn(
          `[SyncService] No credentials found for ${conn.bankId} (User: ${userId})`,
        );
        continue;
      }

      console.log(
        `[SyncService] Scraping ${conn.bankId} for user ${userId} starting from ${scrapeStartDate.toISOString()} (Requested: ${requestedRange.startDate} to ${requestedRange.endDate}, Missing: ${uncoveredIntervals.map((i) => `${i.startDate}..${i.endDate}`).join(', ')}, Mode: ${mode})`,
      );
      jobs.push({
        bankId: conn.bankId,
        uncoveredIntervals,
        scrapeStartDate,
        credentials: credentials as ScraperCredentials,
        lastError: '',
        lastWasProviderBlock: false,
        completed: false,
        showBrowser: options.showBrowser,
        loginTimeoutSeconds: options.loginTimeoutSeconds,
        defaultTimeoutSeconds: options.defaultTimeoutSeconds,
        executablePath: options.executablePath,
      });
    }

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      const pendingJobs = jobs
        .filter((job) => !job.completed)
        .sort((a, b) =>
          attempt > 1
            ? Number(a.lastWasProviderBlock) - Number(b.lastWasProviderBlock)
            : 0,
        );

      if (pendingJobs.length === 0) break;

      // Optimization: Launch browser once for all scrapers in this attempt to save memory
      let sharedBrowser: any = null;
      if (mode !== 'initial' && pendingJobs.length > 0) {
        const executablePath =
          options.executablePath ||
          this.configService.get<string>('SCRAPER_CHROMIUM_EXECUTABLE_PATH') ||
          this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') ||
          (await this.browserService.findSystemBrowser());

        const args = this.browserService.getCommonBrowserArgs();

        try {
          sharedBrowser = await puppeteer.launch({
            executablePath: executablePath || undefined,
            headless: !options.showBrowser,
            args,
          });
          this.activeSharedBrowser = sharedBrowser;
          console.log(
            `[SyncService] Launched shared browser for ${pendingJobs.length} jobs (Attempt ${attempt})`,
          );
        } catch (err) {
          console.error('[SyncService] Failed to launch shared browser:', err);
        }
      }

      try {
        for (const job of pendingJobs) {
          try {
            const scraper = this.scraperFactory.getScraper(job.bankId);

            // Inject otpCodeRetriever if sessionId is provided
            const credentialsWithOtp = {
              ...job.credentials,
              otpCodeRetriever: options.sessionId
                ? (opts?: { attempt: number }) => {
                    return new Promise<string>((resolve, reject) => {
                      this.sessionService.updateSession(options.sessionId!, {
                        status: 'CHALLENGE_REQUIRED',
                        bankId: job.bankId,
                        challenge: {
                          type: 'SMS',
                          message:
                            opts?.attempt && opts.attempt > 1
                              ? `קוד ה-SMS שגוי (ניסיון ${opts.attempt}). אנא הזן את הקוד החדש שקיבלת.`
                              : 'הזן את קוד ה-SMS שנשלח אל מכשיר הטלפון שלך לצורך סנכרון',
                        },
                        resolveOtp: resolve,
                        rejectOtp: reject,
                      });
                    });
                  }
                : undefined,
            };

            const response = await scraper.scrape(
              credentialsWithOtp,
              job.scrapeStartDate,
              {
                showBrowser: options.showBrowser ?? (job as any).showBrowser,
                loginTimeoutSeconds: (job as any).loginTimeoutSeconds,
                defaultTimeoutSeconds: (job as any).defaultTimeoutSeconds,
                executablePath: (job as any).executablePath,
                browser: sharedBrowser,
                skipCloseBrowser: !!sharedBrowser,
              },
            );

            if (response?.status === 'SUCCESS' && response.accounts) {
              const accountsToSave = this.filterAccountsToIntervals(
                response.accounts,
                job.uncoveredIntervals,
              );
              await this.cacheService.setCachedAccounts(
                userId,
                job.bankId,
                accountsToSave,
              );
              for (const interval of job.uncoveredIntervals) {
                await this.coverageService.saveCoveredInterval(
                  userId,
                  job.bankId,
                  interval,
                );
              }
              await this.credentialsService.clearConnectionError(
                userId,
                job.bankId,
              );
              job.completed = true;
              console.log(
                `[SyncService] Successfully synced ${job.bankId} for user ${userId}`,
              );
              continue;
            }

            const rawError = response?.error ?? 'Unknown scraper error';
            const isPermanent = rawError.includes('INVALID_CREDENTIALS');
            const isProviderBlock = this.isProviderBlockError(rawError);
            const isRetryable =
              this.isTimeoutError(rawError) ||
              this.isProviderBlockError(rawError);

            job.lastError = rawError;
            job.lastWasProviderBlock = isProviderBlock;

            if (isRetryable && attempt < totalAttempts) {
              console.warn(
                `[SyncService] Retryable error for ${job.bankId} (attempt ${attempt}/${totalAttempts}): ${rawError}. Retrying later in this round.`,
              );
              continue;
            }

            if (isPermanent || isProviderBlock) {
              await this.credentialsService.markConnectionFailed(
                userId,
                job.bankId,
                rawError,
              );
            }
            console.error(
              `[SyncService] Scraper failed for ${job.bankId}: ${rawError}`,
            );
            failures.push({ bankId: job.bankId, reason: rawError });
            break;
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            const isPermanent = errorMsg.includes('INVALID_CREDENTIALS');
            const isProviderBlock = this.isProviderBlockError(errorMsg);
            const isRetryable =
              this.isTimeoutError(errorMsg) ||
              this.isProviderBlockError(errorMsg);

            job.lastError = errorMsg;
            job.lastWasProviderBlock = isProviderBlock;

            if (isRetryable && attempt < totalAttempts) {
              console.warn(
                `[SyncService] Retryable thrown error for ${job.bankId} (attempt ${attempt}/${totalAttempts}): ${errorMsg}. Retrying later in this round.`,
              );
              continue;
            }

            if (isPermanent || isProviderBlock) {
              await this.credentialsService.markConnectionFailed(
                userId,
                job.bankId,
                errorMsg,
              );
            }
            console.error(
              `[SyncService] Failed to sync ${job.bankId} for user ${userId}:`,
              err,
            );
            failures.push({ bankId: job.bankId, reason: errorMsg });
            break;
          }
        }
      } finally {
        if (sharedBrowser) {
          console.log('[SyncService] Closing shared browser');
          await sharedBrowser.close().catch(() => {});
          this.activeSharedBrowser = null;
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Failed scrapers: ${failures
          .map((f) => `${f.bankId}: ${f.reason}`)
          .join(' | ')}`,
      );
    }
  }

  private filterAccountsToIntervals(
    accounts: any[],
    intervals: Array<{ startDate: string; endDate: string }>,
  ): any[] {
    if (intervals.length === 0) {
      return accounts.map((account) => ({
        ...account,
        transactions: [],
      }));
    }

    return (accounts ?? []).map((account) => ({
      ...account,
      transactions: (account?.transactions ?? []).filter((txn: any) => {
        const txnDate = String(txn?.date ?? '').slice(0, 10);
        if (!txnDate || txnDate.length !== 10) return false;
        return intervals.some(
          (interval) =>
            txnDate >= interval.startDate && txnDate <= interval.endDate,
        );
      }),
    }));
  }

  async isRangeCoveredForAllConnections(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<boolean> {
    const connections =
      await this.credentialsService.getUserConnections(userId);
    if (connections.length === 0) return true; // Nothing to sync

    const coverageMap = await this.coverageService.getCachedCoverageMap(userId);

    for (const conn of connections) {
      const requestedRange = this.normalizeRequestedRangeForBank(
        conn.bankId,
        startDate,
        endDate,
      );
      if (!requestedRange) continue;
      const coverage = coverageMap.get(conn.bankId) ?? [];
      const uncovered = this.coverageService.getUncoveredIntervals(
        requestedRange,
        coverage,
      );
      if (uncovered.length > 0) return false;
    }

    return true;
  }

  async onModuleDestroy() {
    if (this.activeSharedBrowser) {
      console.log('[SyncService] App shutdown: Killing active browser');
      await this.activeSharedBrowser.close().catch(() => {});
    }
  }
}
