import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ScraperService, type ScanIncomeRequest } from './scraper.service';
import { ScraperFactory } from './scraper-factory.service';
import { ScraperCredentials } from 'israeli-bank-scrapers';
import { randomUUID } from 'crypto';
import type { UnifiedTransaction } from '@moneyup/types';

type PublicScraperErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'CHALLENGE_FAILED'
  | 'BANK_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_CONNECT_ERROR';

@Controller()
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly scraperFactory: ScraperFactory,
  ) {}

  @MessagePattern('scraper_hello')
  getHelloMessage(): string {
    return this.scraperService.getHello();
  }

  @MessagePattern('scrapers_list')
  getScrapersList(): any[] {
    return this.scraperService.getScrapersList();
  }

  @MessagePattern('scrape_and_connect')
  async scrapeAndConnect(data: { userId: string; bankId: string; credentials: ScraperCredentials; startDate?: string }): Promise<any> {
    const { userId, bankId, startDate } = data;
    try {
      const normalizedCredentials = this.normalizeCredentials(bankId, data.credentials as Record<string, string>);
      const validationError = this.validateCredentials(bankId, normalizedCredentials);
      if (validationError) {
        const sanitized = this.buildSanitizedError('INVALID_CREDENTIALS');
        return {
          status: 'FAILED',
          errorCode: sanitized.code,
          error: sanitized.message,
        };
      }

      const sessionId = randomUUID();
      this.scraperService.createSession(sessionId, {
        userId,
        bankId,
        status: 'PROCESSING',
        credentials: normalizedCredentials
      });

      // Run scraping in the background
      this.runBackgroundScrape(sessionId, userId, bankId, normalizedCredentials as ScraperCredentials, startDate);

      return {
        status: 'PROCESSING',
        sessionId,
      };
    } catch (err: any) {
      const sanitized = this.buildSanitizedError('UNKNOWN_CONNECT_ERROR');
      return {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
      };
    }
  }

  private async runBackgroundScrape(sessionId: string, userId: string, bankId: string, credentials: ScraperCredentials, startDate?: string) {
    try {
      const scraper = this.scraperFactory.getScraper(bankId);
      const parsedDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Inject otpCodeRetriever
      const credentialsWithOtp = {
        ...credentials,
        otpCodeRetriever: () => {
          return new Promise<string>((resolve, reject) => {
             this.scraperService.updateSession(sessionId, {
                status: 'CHALLENGE_REQUIRED',
                challenge: { type: 'SMS', message: 'הזן את קוד ה-SMS שנשלח אל מכשיר הטלפון שלך לצורך סנכרון' },
                resolveOtp: resolve,
                rejectOtp: reject
             });
          });
        }
      };

      const response = await scraper.scrape(credentialsWithOtp as any, parsedDate);

      if (response.status === 'SUCCESS') {
        await this.scraperService.saveCredentials(userId, bankId, credentials as Record<string, string>);
        if (response.accounts) {
          await this.scraperService.setCachedAccounts(userId, bankId, response.accounts);
        }
        this.scraperService.updateSession(sessionId, { status: 'SUCCESS', resultData: response });
      } else {
        const sanitized = this.normalizeScraperError(response.error);
        this.scraperService.updateSession(sessionId, {
          status: 'FAILED',
          errorCode: sanitized.code,
          error: sanitized.message,
          internalErrorRaw: response.error,
        });
      }
    } catch (err: any) {
      const raw = err?.message || String(err);
      const sanitized = this.normalizeScraperError(raw);
      this.scraperService.updateSession(sessionId, {
        status: 'FAILED',
        errorCode: sanitized.code,
        error: sanitized.message,
        internalErrorRaw: raw,
      });
    }
  }

  @MessagePattern('get_scraper_status')
  async getScraperStatus(data: { sessionId: string }): Promise<any> {
     const session = this.scraperService.getSession(data.sessionId);
     if (!session) {
        const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
        return { status: 'FAILED', errorCode: sanitized.code, error: sanitized.message };
     }
     return {
        status: session.status,
        challenge: session.challenge,
        errorCode: session.errorCode,
        error: session.error,
        resultData: session.resultData
     };
  }

  @MessagePattern('submit_challenge')
  async submitChallenge(data: { sessionId: string; code: string }): Promise<any> {
     const session = this.scraperService.getSession(data.sessionId);
     if (!session) {
        const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
        return { status: 'FAILED', errorCode: sanitized.code, error: sanitized.message };
     }
     if (session.status !== 'CHALLENGE_REQUIRED') {
        const sanitized = this.buildSanitizedError('SESSION_EXPIRED');
        return { status: 'FAILED', errorCode: sanitized.code, error: sanitized.message };
     }
     if (session.resolveOtp) {
        session.resolveOtp(data.code);
        this.scraperService.updateSession(data.sessionId, { status: 'PROCESSING' });
        return { status: 'PROCESSING' };
     }
     const sanitized = this.buildSanitizedError('CHALLENGE_FAILED');
     return { status: 'FAILED', errorCode: sanitized.code, error: sanitized.message };
  }

  @MessagePattern('get_connected_accounts')
  async getConnectedAccounts(data: { userId: string }): Promise<any[]> {
    const { userId } = data;
    const connections = await this.scraperService.getUserConnections(userId);
    const cachedAccounts = await this.scraperService.getCachedAccounts(userId);
    
    const results = [...cachedAccounts];
    const cachedBankIds = new Set(cachedAccounts.map((a) => a.bankId));
    
    for (const conn of connections) {
      if (!cachedBankIds.has(conn.bankId)) {
        try {
          const scraper = this.scraperFactory.getScraper(conn.bankId);
          const credentials = await this.scraperService.getCredentials(userId, conn.bankId);
          if (credentials) {
            const response = await scraper.scrape(credentials as ScraperCredentials, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            if (response.status === 'SUCCESS' && response.accounts) {
              await this.scraperService.setCachedAccounts(userId, conn.bankId, response.accounts);
              for (const acc of response.accounts) {
                results.push({
                  bankId: conn.bankId,
                  accountNumber: acc.accountNumber,
                  balance: acc.balance,
                  transactions: acc.transactions,
                });
              }
            }
          }
        } catch (err) {
          // Skip failed initialization scrapes to remain robust
        }
      }
    }
    return results;
  }

  @MessagePattern('sync_accounts')
  async syncAccounts(data: { userId: string }): Promise<any[]> {
    const { userId } = data;
    const connections = await this.scraperService.getUserConnections(userId);
    const results: any[] = [];
    
    for (const conn of connections) {
      try {
        const scraper = this.scraperFactory.getScraper(conn.bankId);
        const credentials = await this.scraperService.getCredentials(userId, conn.bankId);
        if (!credentials) continue;
        
        const response = await scraper.scrape(credentials as ScraperCredentials, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        if (response.status === 'SUCCESS' && response.accounts) {
          await this.scraperService.setCachedAccounts(userId, conn.bankId, response.accounts);
          for (const acc of response.accounts) {
            results.push({
              bankId: conn.bankId,
              accountNumber: acc.accountNumber,
              balance: acc.balance,
              transactions: acc.transactions,
            });
          }
        }
      } catch (err) {
        // Skip failed sync scrapes to remain robust
      }
    }
    return results;
  }

  @MessagePattern('ping')
  ping(): string {
    return 'pong';
  }

  @MessagePattern('scraper_scan_income')
  async scanIncome(
    data: {
      accounts: Array<{
        bankId: string;
        accountNumber?: string;
        transactions?: UnifiedTransaction[];
      }>;
      period?: 'current' | 'previous' | 'both';
      startDate?: string;
      endDate?: string;
      debug?: boolean;
    },
  ) {
    const payload: ScanIncomeRequest = {
      accounts: data.accounts ?? [],
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      debug: data.debug,
    };
    return this.scraperService.scanIncome(payload);
  }

  @MessagePattern('scraper_upsert_annotations')
  async upsertAnnotations(
    data: {
      annotations: Array<{
        normalizedMerchant: string;
        displayMerchant: string;
        category: string;
        source?: 'ai' | 'manual' | 'rule_seed';
        model?: string;
        confidence?: number;
      }>;
    },
  ) {
    return this.scraperService.upsertMerchantAnnotations(data.annotations ?? []);
  }

  private normalizeCredentials(bankId: string, credentials: Record<string, string>): Record<string, string> {
    if (bankId === 'hapoalim' && credentials.username && !credentials.userCode) {
      return {
        ...credentials,
        userCode: credentials.username,
      };
    }

    return credentials;
  }

  private validateCredentials(bankId: string, credentials: Record<string, string>): string | null {
    const isMissing = (value: string | undefined) => !value || value.trim().length === 0;

    if (bankId === 'hapoalim') {
      if (isMissing(credentials.userCode) || isMissing(credentials.password)) {
        return "Missing required hapoalim credentials. Expected 'userCode' and 'password'.";
      }
    }

    if (bankId === 'max') {
      if (isMissing(credentials.username) || isMissing(credentials.password)) {
        return "Missing required max credentials. Expected 'username' and 'password'.";
      }
    }

    if (bankId === 'isracard') {
      if (isMissing(credentials.id) || isMissing(credentials.card6Digits) || isMissing(credentials.password)) {
        return "Missing required isracard credentials. Expected 'id', 'card6Digits', and 'password'.";
      }
    }

    return null;
  }

  private normalizeScraperError(rawError?: string): { code: PublicScraperErrorCode; message: string } {
    const text = (rawError || '').toLowerCase();

    if (
      text.includes('invalid_credentials') ||
      text.includes('invalid credentials') ||
      text.includes('wrong password') ||
      text.includes('שם משתמש או סיסמה') ||
      text.includes('usercode') ||
      text.includes('password')
    ) {
      return this.buildSanitizedError('INVALID_CREDENTIALS');
    }

    if (
      text.includes('otp') ||
      text.includes('challenge') ||
      text.includes('sms code')
    ) {
      return this.buildSanitizedError('CHALLENGE_FAILED');
    }

    if (
      text.includes('timeout') ||
      text.includes('econnreset') ||
      text.includes('enotfound') ||
      text.includes('navigation') ||
      text.includes('bank unavailable')
    ) {
      return this.buildSanitizedError('BANK_UNAVAILABLE');
    }

    return this.buildSanitizedError('UNKNOWN_CONNECT_ERROR');
  }

  private buildSanitizedError(code: PublicScraperErrorCode): { code: PublicScraperErrorCode; message: string } {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return { code, message: 'שם משתמש או סיסמה אינם נכונים' };
      case 'CHALLENGE_FAILED':
        return { code, message: 'קוד האימות שגוי' };
      case 'BANK_UNAVAILABLE':
        return { code, message: 'שירות הבנק לא זמין כרגע. נסה שוב בעוד כמה דקות.' };
      case 'SESSION_EXPIRED':
        return { code, message: 'פג תוקף הסשן. התחל מחדש את תהליך החיבור.' };
      default:
        return { code: 'UNKNOWN_CONNECT_ERROR', message: 'ההתחברות נכשלה. נסה שוב.' };
    }
  }
}
