import { Injectable } from '@nestjs/common';
import { ScraperFactory } from './scraper-factory.service';
import { BrowserService } from './browser/browser.service';
import { SessionService } from './session/session.service';
import { CredentialsService } from './credentials/credentials.service';
import { SyncService } from './sync/sync.service';
import { CacheService } from './cache/cache.service';
import { CoverageService } from './coverage/coverage.service';
import { ScansService } from './scans/scans.service';
import { ScraperCredentials } from 'israeli-bank-scrapers';
import { randomUUID } from 'crypto';
import type { UnifiedTransaction, ScanIncomeRequest } from '@money-up/types';
import { getTodayUtcDateString } from './utils/date.utils';

type PublicScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'CHALLENGE_FAILED'
  | 'BANK_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_CONNECT_ERROR';

@Injectable()
export class ScraperService {
  /** Tracks userIds that currently have a sync_accounts call in flight.
   *  Prevents duplicate browser sessions when the gateway sends concurrent messages. */
  private readonly syncInProgress = new Set<string>();

  constructor(
    private readonly scraperFactory: ScraperFactory,
    private readonly browserService: BrowserService,
    private readonly sessionService: SessionService,
    private readonly credentialsService: CredentialsService,
    private readonly syncService: SyncService,
    private readonly cacheService: CacheService,
    private readonly coverageService: CoverageService,
    private readonly scansService: ScansService,
  ) {}

  getHelloMessage(): string {
    return 'Hello World!';
  }

  getScrapersList(): any[] {
    return this.syncService.getScrapersList();
  }

  async detectChromium(): Promise<any> {
    return this.browserService.detectChromium();
  }

  async installChromium(): Promise<any> {
    return this.browserService.installChromium();
  }

  installChromiumStream(): any {
    return this.browserService.installChromiumStream();
  }

  async scrapeAndConnect(data: {
    userId: string;
    bankId: string;
    credentials: ScraperCredentials;
    startDate?: string;
    showBrowser?: boolean;
    loginTimeoutSeconds?: number;
    defaultTimeoutSeconds?: number;
    executablePath?: string;
  }): Promise<any> {
    const { userId, bankId, startDate } = data;
    try {
      // Prevent duplicate connections
      const existingCredentials = await this.credentialsService.getCredentials(
        userId,
        bankId,
      );
      if (existingCredentials) {
        return {
          status: 'FAILED',
          errorCode: 'ACCOUNT_ALREADY_CONNECTED',
          error:
            'החשבון כבר מחובר. אנא בחר חשבון אחר או נתק את החשבון הקיים תחילה.',
        };
      }

      const normalizedCredentials = this.normalizeCredentials(
        bankId,
        data.credentials as Record<string, string>,
      );
      const validationError = this.validateCredentials(
        bankId,
        normalizedCredentials,
      );
      if (validationError) {
        const sanitized = this.buildSanitizedError('INVALID_CREDENTIALS');
        return {
          status: 'FAILED',
          errorCode: sanitized.code,
          error: sanitized.message,
        };
      }

      const sessionId = randomUUID();
      this.sessionService.createSession(sessionId, {
        userId,
        bankId,
        status: 'PROCESSING',
        credentials: normalizedCredentials,
      });

      // Run scraping in the background
      this.runBackgroundScrape(
        sessionId,
        userId,
        bankId,
        normalizedCredentials as ScraperCredentials,
        startDate,
        {
          showBrowser: data.showBrowser,
          loginTimeoutSeconds: data.loginTimeoutSeconds,
          defaultTimeoutSeconds: data.defaultTimeoutSeconds,
          executablePath: data.executablePath,
        },
      );

      return {
        status: 'PROCESSING',
        sessionId,
      };
    } catch (err: any) {
      console.error('[scrapeAndConnect] Immediate failure:', err);
      const sanitized = this.buildSanitizedError('UNKNOWN_CONNECT_ERROR');
      return {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
      };
    }
  }

  private async runBackgroundScrape(
    sessionId: string,
    userId: string,
    bankId: string,
    credentials: ScraperCredentials,
    startDate?: string,
    options?: {
      showBrowser?: boolean;
      loginTimeoutSeconds?: number;
      defaultTimeoutSeconds?: number;
      executablePath?: string;
    },
  ) {
    try {
      // Ensure browser is available
      if (!options?.executablePath) {
        options = {
          ...options,
          executablePath:
            (await this.browserService.ensureBrowser()) || undefined,
        };
      }

      const scraper = this.scraperFactory.getScraper(bankId);
      const requestedRange = this.syncService.normalizeRequestedRangeForBank(
        bankId,
        startDate,
        getTodayUtcDateString(),
      );
      const coverageStartDate =
        requestedRange?.startDate ??
        this.syncService.clampStartDateForBank(bankId, startDate);
      const coverageEndDate =
        requestedRange?.endDate ?? getTodayUtcDateString();
      const parsedDate = this.syncService.resolveScrapeStartDate(
        bankId,
        coverageStartDate,
      );

      // Inject otpCodeRetriever
      const credentialsWithOtp = {
        ...credentials,
        otpCodeRetriever: () => {
          return new Promise<string>((resolve, reject) => {
            this.sessionService.updateSession(sessionId, {
              status: 'CHALLENGE_REQUIRED',
              challenge: {
                type: 'SMS',
                message:
                  'הזן את קוד ה-SMS שנשלח אל מכשיר הטלפון שלך לצורך סנכרון',
              },
              resolveOtp: resolve,
              rejectOtp: reject,
            });
          });
        },
      };

      const response = await scraper.scrape(
        credentialsWithOtp,
        parsedDate,
        options,
      );

      if (response.status === 'SUCCESS') {
        await this.credentialsService.saveCredentials(
          userId,
          bankId,
          credentials as Record<string, string>,
        );
        if (response.accounts) {
          await this.cacheService.setCachedAccounts(
            userId,
            bankId,
            response.accounts,
          );
          await this.coverageService.saveCoveredInterval(userId, bankId, {
            startDate: coverageStartDate,
            endDate: coverageEndDate,
          });
          await this.credentialsService.markScrapedAt(userId, bankId);
        }
        this.sessionService.updateSession(sessionId, {
          status: 'SUCCESS',
          resultData: response,
        });
      } else {
        console.error(
          `[scrapeAndConnect] Scraper reported failure for ${bankId}:`,
          response.error,
        );
        const sanitized = this.normalizeScraperError(response.error);
        await this.credentialsService.markConnectionFailed(
          userId,
          bankId,
          response.error ?? sanitized.code,
        );
        this.sessionService.updateSession(sessionId, {
          status: 'FAILED',
          errorCode: sanitized.code,
          error: sanitized.message,
          internalErrorRaw: response.error,
        });
      }
    } catch (err: any) {
      const raw = err?.message || String(err);
      console.error(
        `[scrapeAndConnect] Unexpected error during background scrape for ${bankId}:`,
        err,
      );
      const sanitized = this.normalizeScraperError(raw);
      await this.credentialsService.markConnectionFailed(userId, bankId, raw);
      this.sessionService.updateSession(sessionId, {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
        internalErrorRaw: raw,
      });
    }
  }

  async getScraperStatus(data: { sessionId: string }): Promise<any> {
    const session = this.sessionService.getSession(data.sessionId);
    if (!session) {
      const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
      return {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
      };
    }
    return {
      status: session.status,
      challenge: session.challenge,
      errorCode: session.errorCode,
      error: session.error,
      internalErrorRaw: session.internalErrorRaw,
      resultData: session.resultData,
      currentlySyncing: session.currentlySyncing ?? null,
    };
  }

  async submitChallenge(data: {
    sessionId: string;
    code: string;
  }): Promise<any> {
    const session = this.sessionService.getSession(data.sessionId);
    if (!session) {
      const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
      return {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
      };
    }
    if (session.status !== 'CHALLENGE_REQUIRED') {
      const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
      return {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
      };
    }
    if (session.resolveOtp) {
      session.resolveOtp(data.code);
      this.sessionService.updateSession(data.sessionId, {
        status: 'PROCESSING',
      });
      return { status: 'PROCESSING' };
    }
    const sanitized = this.buildSanitizedError('CHALLENGE_FAILED');
    return {
      status: 'FAILED',
      errorCode: sanitized.code,
      error: sanitized.message,
    };
  }

  async getAllConnectedAccountsMetadata(data: { userId: string }): Promise<any[]> {
    // Fetch every vault entry (one per connected bank/card)
    const vaultEntries = await this.credentialsService.getUserConnections(data.userId);

    // Fetch cache entries to resolve account numbers + last-known balances
    const cacheEntries = await this.cacheService.getAllCacheEntries(data.userId);
    const cacheMap = new Map<string, any[]>();
    for (const entry of cacheEntries) {
      try {
        const parsed = JSON.parse(entry.cachedData);
        cacheMap.set(entry.bankId, parsed);
      } catch {
        // ignore corrupt entries
      }
    }

    const result: any[] = [];
    for (const vault of vaultEntries) {
      const accounts = cacheMap.get(vault.bankId) ?? [];
      if (accounts.length === 0) {
        // Connected but never synced — still show it
        result.push({
          bankId: vault.bankId,
          accountNumber: null,
          balance: null,
          lastScrapedAt: vault.lastScrapedAt ?? null,
        });
      } else {
        for (const acc of accounts) {
          result.push({
            bankId: vault.bankId,
            accountNumber: acc.accountNumber ?? null,
            balance: acc.balance ?? null,
            lastScrapedAt: vault.lastScrapedAt ?? null,
          });
        }
      }
    }

    return result;
  }

  async getConnectedAccounts(data: {
    userId: string;
    fresh?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{ accounts: any[]; isCovered: boolean }> {
    const { userId, startDate, endDate } = data;
    const accounts = await this.cacheService.getCachedAccountsForRange(
      userId,
      startDate,
      endDate,
    );
    const isCovered = await this.syncService.isRangeCoveredForAllConnections(
      userId,
      startDate,
      endDate,
    );
    return { accounts, isCovered };
  }

  async getUserConnectionsCount(data: {
    userId: string;
  }): Promise<{ count: number }> {
    const count = await this.credentialsService.getUserConnectionsCount(
      data.userId,
    );
    return { count };
  }

  async checkLastError(data: {
    userId: string;
    bankId: string;
  }): Promise<{ error: string | null }> {
    const error = await this.credentialsService.getLastError(
      data.userId,
      data.bankId,
    );
    return { error };
  }

  async getVaultEntry(data: { userId: string; bankId: string }): Promise<any> {
    const entry = await this.credentialsService.getUserConnections(data.userId);
    return entry.find((e) => e.bankId === data.bankId);
  }

  async syncAccounts(data: {
    userId: string;
    startDate?: string;
    endDate?: string;
    mode?: 'initial' | 'manual';
    timeoutRetryCount?: number;
    showBrowser?: boolean;
    loginTimeoutSeconds?: number;
    defaultTimeoutSeconds?: number;
    sessionId?: string;
  }): Promise<any[]> {
    // Guard: if a sync is already in progress for this user, skip the scrape
    // and return the current cached data immediately. This prevents duplicate
    // browser sessions when the gateway sends concurrent sync_accounts messages.
    if (this.syncInProgress.has(data.userId)) {
      console.log(
        `[ScraperController] sync_accounts already in progress for user ${data.userId} — skipping duplicate`,
      );
      return this.cacheService.getCachedAccountsForRange(
        data.userId,
        data.startDate,
        data.endDate,
      );
    }

    this.syncInProgress.add(data.userId);

    if (data.sessionId) {
      this.sessionService.createSession(data.sessionId, {
        userId: data.userId,
        bankId: '',
        status: 'PROCESSING',
        credentials: {} as any,
      });
    }

    try {
      await this.syncService.syncUserAccounts(data.userId, {
        startDate: data.startDate,
        endDate: data.endDate,
        mode: data.mode,
        timeoutRetryCount: data.timeoutRetryCount,
        showBrowser: data.showBrowser,
        loginTimeoutSeconds: data.loginTimeoutSeconds,
        defaultTimeoutSeconds: data.defaultTimeoutSeconds,
        sessionId: data.sessionId,
      });
    } finally {
      this.syncInProgress.delete(data.userId);
      if (data.sessionId) {
        this.sessionService.removeSession(data.sessionId);
      }
    }

    return this.cacheService.getCachedAccountsForRange(
      data.userId,
      data.startDate,
      data.endDate,
    );
  }

  ping(): string {
    return 'pong';
  }

  async scanIncome(data: {
    accounts: Array<{
      bankId: string;
      accountNumber?: string;
      transactions?: UnifiedTransaction[];
    }>;
    period?: 'current' | 'previous' | 'both';
    startDate?: string;
    endDate?: string;
    debug?: boolean;
  }) {
    const payload: ScanIncomeRequest = {
      accounts: data.accounts ?? [],
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      debug: data.debug,
    };
    return this.scansService.scanIncome(payload);
  }

  async upsertAnnotations(data: {
    annotations: Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      keywords?: string;
      source?: 'ai' | 'manual' | 'rule_seed';
      model?: string;
      confidence?: number;
    }>;
  }) {
    return this.scansService.upsertMerchantAnnotations(data.annotations ?? []);
  }

  async findMerchantsByTopic(data: { topic: string }) {
    return this.scansService.findMerchantsByTopic(data.topic);
  }

  async getAllAnnotations() {
    return this.scansService.getAllAnnotations();
  }

  async markTransactionDuplicate(data: {
    userId: string;
    bankId: string;
    accountNumber: string;
    id: string;
    isDuplicate: boolean;
  }) {
    console.log(
      `[Scraper] Marking transaction ${data.id} as duplicate=${data.isDuplicate}`,
    );
    return this.cacheService
      .markTransactionDuplicate(
        data.userId,
        data.bankId,
        data.accountNumber,
        data.id,
        data.isDuplicate,
      )
      .then(() => {
        console.log(`[Scraper] Successfully updated transaction ${data.id}`);
        return { success: true };
      })
      .catch((err) => {
        console.error(
          `[Scraper] Failed to update transaction ${data.id}:`,
          err,
        );
        throw err;
      });
  }

  async disconnectScraper(data: {
    userId: string;
    bankId: string;
  }): Promise<{ success: boolean }> {
    const { userId, bankId } = data;
    console.log(`[Scraper] Disconnecting ${bankId} for user ${userId}`);

    await this.credentialsService.removeConnection(userId, bankId);
    await this.cacheService.removeCachedAccounts(userId, bankId);
    await this.coverageService.removeCoverage(userId, bankId);

    console.log(
      `[Scraper] Successfully disconnected ${bankId} for user ${userId}`,
    );
    return { success: true };
  }

  private normalizeCredentials(
    bankId: string,
    credentials: Record<string, string>,
  ): Record<string, string> {
    if (
      bankId === 'hapoalim' &&
      credentials.username &&
      !credentials.userCode
    ) {
      return {
        ...credentials,
        userCode: credentials.username,
      };
    }

    if (
      (bankId === 'leumi' || bankId === 'yahav') &&
      credentials.id &&
      !credentials.nationalID
    ) {
      return {
        ...credentials,
        nationalID: credentials.id,
      };
    }

    return credentials;
  }

  private validateCredentials(
    bankId: string,
    credentials: Record<string, string>,
  ): string | null {
    const isMissing = (value: string | undefined) =>
      !value || value.trim().length === 0;

    if (bankId === 'hapoalim') {
      if (isMissing(credentials.userCode) || isMissing(credentials.password)) {
        return "Missing required hapoalim credentials. Expected 'userCode' and 'password'.";
      }
    }

    if (bankId === 'leumi') {
      if (isMissing(credentials.username) || isMissing(credentials.password)) {
        return "Missing required leumi credentials. Expected 'username' and 'password'.";
      }
    }

    if (bankId === 'yahav') {
      if (
        isMissing(credentials.username) ||
        isMissing(credentials.password) ||
        (isMissing(credentials.nationalID) && isMissing(credentials.id))
      ) {
        return "Missing required yahav credentials. Expected 'username', 'password', and 'nationalID'.";
      }
    }

    if (bankId === 'max') {
      if (isMissing(credentials.username) || isMissing(credentials.password)) {
        return "Missing required max credentials. Expected 'username' and 'password'.";
      }
    }

    if (bankId === 'cal') {
      if (isMissing(credentials.username) || isMissing(credentials.password)) {
        return "Missing required cal credentials. Expected 'username' and 'password'.";
      }
    }

    if (bankId === 'isracard') {
      if (
        isMissing(credentials.id) ||
        isMissing(credentials.card6Digits) ||
        isMissing(credentials.password)
      ) {
        return "Missing required isracard credentials. Expected 'id', 'card6Digits', and 'password'.";
      }
    }

    return null;
  }

  private normalizeScraperError(rawError?: string): {
    code: PublicScraperErrorCode;
    message: string;
  } {
    const text = (rawError || '').toLowerCase();

    if (
      text.includes('invalid_credentials') ||
      text.includes('invalid credentials') ||
      text.includes('wrong password') ||
      text.includes('שם משתמש או סיסמה') ||
      text.includes('usercode') ||
      text.includes('password') ||
      text.includes('פרטים שגויים')
    ) {
      return this.buildSanitizedError('INVALID_CREDENTIALS');
    }

    if (
      text.includes('otp') ||
      text.includes('challenge') ||
      text.includes('sms code') ||
      text.includes('קוד אימות')
    ) {
      return this.buildSanitizedError('CHALLENGE_FAILED');
    }

    if (
      text.includes('timeout') ||
      text.includes('econnreset') ||
      text.includes('enotfound') ||
      text.includes('navigation') ||
      text.includes('bank unavailable') ||
      text.includes('block automation') ||
      text.includes('cloudflare') ||
      text.includes('waf') ||
      text.includes('sorry, you have been blocked') ||
      text.includes('access denied') ||
      text.includes('מזיהוי אוטומטי')
    ) {
      return this.buildSanitizedError('BANK_UNAVAILABLE');
    }

    return this.buildSanitizedError('UNKNOWN_CONNECT_ERROR');
  }

  private buildSanitizedError(code: PublicScraperErrorCode): {
    code: PublicScraperErrorCode;
    message: string;
  } {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return { code, message: 'שם משתמש או סיסמה אינם נכונים' };
      case 'CHALLENGE_FAILED':
        return { code, message: 'קוד האימות שגוי' };
      case 'BANK_UNAVAILABLE':
        return {
          code,
          message: 'שירות הבנק לא זמין כרגע. נסה שוב בעוד כמה דקות.',
        };
      case 'SESSION_EXPIRED':
        return { code, message: 'פג תוקף הסשן. התחל מחדש את תהליך החיבור.' };
      default:
        return {
          code: 'UNKNOWN_CONNECT_ERROR',
          message: 'ההתחברות נכשלה. נסה שוב.',
        };
    }
  }
}
