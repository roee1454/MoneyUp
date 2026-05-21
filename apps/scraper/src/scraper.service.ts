import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SCRAPERS, ScraperCredentials } from 'israeli-bank-scrapers';
import { UnifiedTransaction } from '@moneyup/types';
import { SCRAPERS_METADATA } from './config/scrapers.config';
import { ScraperFactory } from './scraper-factory.service';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { ScrapedCoverageEntity } from './entities/coverage.entity';
import { encrypt, decrypt } from './utils/crypto';
import * as crypto from 'crypto';

export type SessionStatus =
  | 'PROCESSING'
  | 'CHALLENGE_REQUIRED'
  | 'SUCCESS'
  | 'FAILED';

export interface SessionState {
  userId: string;
  bankId: string;
  status: SessionStatus;
  challenge?: {
    type: string;
    message: string;
  };
  credentials?: Record<string, string>;
  error?: string;
  errorCode?:
    | 'INVALID_CREDENTIALS'
    | 'CHALLENGE_FAILED'
    | 'BANK_UNAVAILABLE'
    | 'SESSION_EXPIRED'
    | 'UNKNOWN_CONNECT_ERROR';
  internalErrorRaw?: string;
  resolveOtp?: (code: string) => void;
  rejectOtp?: (error: any) => void;
  resultData?: any;
}

type CategorizedExpense = {
  name: string;
  amount: number;
  count: number;
};

type ScanAccount = {
  bankId: string;
  accountNumber?: string;
  transactions?: UnifiedTransaction[];
};

export type ScanIncomeRequest = {
  accounts: ScanAccount[];
  period?: 'current' | 'previous' | 'both';
  startDate?: string;
  endDate?: string;
  debug?: boolean;
};

type ScanTransaction = {
  transactionId: string;
  bankId: string;
  accountNumber: string;
  cardLast4?: string;
  merchant: string;
  date: string;
  amount: number;
  reason: string;
  confidence: number;
  tags: string[];
};

export type ScanIncomeResult = {
  totalIncome: number;
  totalExpenses: number;
  categories: CategorizedExpense[];
  categoryTransactions: Record<string, ScanTransaction[]>;
  unresolvedMerchants?: Array<{
    normalizedMerchant: string;
    displayMerchant: string;
  }>;
  debugTrace?: ScanDebugTrace;
};

export type ScanDebugTrace = {
  period: 'current' | 'previous' | 'both';
  customRange?: {
    startDate: string;
    endDate: string;
  };
  periodStartIso: string;
  periodEndIso: string;
  accountsSummary: Array<{
    bankId: string;
    accountNumber: string;
    isCreditCompany: boolean;
    transactionCount: number;
  }>;
  transactions: Array<{
    bankId: string;
    accountNumber: string;
    transactionId: string;
    date: string;
    amount: number;
    description: string;
    dedupKey: string;
    isCreditCompany: boolean;
    status:
      | 'included_expense'
      | 'included_income_credit'
      | 'included_income_bank'
      | 'skipped_duplicate'
      | 'skipped_out_of_period'
      | 'skipped_invalid_amount'
      | 'skipped_zero_amount'
      | 'skipped_non_credit_expense'
      | 'skipped_no_description'
      | 'skipped_uncategorized_expense';
    category?: string;
    reason: string;
  }>;
  finalTotals: {
    totalIncome: number;
    totalExpenses: number;
    categories: CategorizedExpense[];
  };
};

const EXPENSE_CATEGORIES = [
  'מזון',
  'ביגוד',
  'בידור',
  'בילויים',
  'אלקטרוניקה',
  'אונליין',
  'דלק/תחבורה',
  'סופר',
  'מנויים',
  'לא מסווג',
] as const;

type ScraperDateLimit = {
  years?: number;
  months?: number;
  days?: number;
};

const SCRAPER_MIN_LOOKBACKS: Record<string, ScraperDateLimit> = {
  hapoalim: { years: 1, days: 1 },
  isracard: { years: 1 },
  max: { years: 4 },
  cal: { years: 1, months: 6, days: 1 },
};

@Injectable()
export class ScraperService {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
    @InjectRepository(MerchantAnnotationEntity)
    private readonly annotationRepository: Repository<MerchantAnnotationEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(ScrapedCoverageEntity)
    private readonly coverageRepository: Repository<ScrapedCoverageEntity>,
    private readonly scraperFactory: ScraperFactory,
  ) {}

  private readonly sessions = new Map<string, SessionState>();

  async isRangeCoveredForAllConnections(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<boolean> {
    const connections = await this.getUserConnections(userId);
    if (connections.length === 0) return true; // Nothing to sync

    const coverageMap = await this.getCachedCoverageMap(userId);

    for (const conn of connections) {
      const requestedRange = this.normalizeRequestedRangeForBank(
        conn.bankId,
        startDate,
        endDate,
      );
      if (!requestedRange) continue;
      const coverage = coverageMap.get(conn.bankId) ?? [];
      const uncovered = this.getUncoveredIntervals(
        requestedRange,
        coverage,
      );
      if (uncovered.length > 0) return false;
    }

    return true;
  }

  getTodayUtcDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  getOneMonthAgoUtc(): Date {
    const now = new Date();
    const targetMonth = now.getUTCMonth() - 1;
    const firstOfTargetMonth = new Date(
      Date.UTC(now.getUTCFullYear(), targetMonth, 1),
    );
    const lastDayOfTargetMonth = new Date(
      Date.UTC(
        firstOfTargetMonth.getUTCFullYear(),
        firstOfTargetMonth.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    const targetDay = Math.min(now.getUTCDate(), lastDayOfTargetMonth);

    return new Date(
      Date.UTC(
        firstOfTargetMonth.getUTCFullYear(),
        firstOfTargetMonth.getUTCMonth(),
        targetDay,
      ),
    );
  }

  getOneMonthAgoUtcDateString(): string {
    return this.getOneMonthAgoUtc().toISOString().slice(0, 10);
  }

  getMinimumStartDateForBank(bankId: string): string {
    const limit = SCRAPER_MIN_LOOKBACKS[String(bankId).toLowerCase()] ?? {
      years: 1,
    };
    return this.subtractUtcDate(new Date(), limit).toISOString().slice(0, 10);
  }

  clampStartDateForBank(bankId: string, startDate?: string): string {
    const requested = (startDate ?? this.getOneMonthAgoUtcDateString()).slice(
      0,
      10,
    );
    const minimum = this.getMinimumStartDateForBank(bankId);
    return requested < minimum ? minimum : requested;
  }

  normalizeRequestedRangeForBank(
    bankId: string,
    startDate?: string,
    endDate?: string,
  ): { startDate: string; endDate: string } | null {
    const today = this.getTodayUtcDateString();
    const requestedStart = startDate
      ? startDate.slice(0, 10)
      : this.getOneMonthAgoUtcDateString();
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
    return this.toUtcDate(clampedStartDate);
  }

  private toUtcDate(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  private subtractUtcDate(date: Date, amount: ScraperDateLimit): Date {
    const year = date.getUTCFullYear() - (amount.years ?? 0);
    const month = date.getUTCMonth() - (amount.months ?? 0);
    const firstOfTargetMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfTargetMonth = new Date(
      Date.UTC(
        firstOfTargetMonth.getUTCFullYear(),
        firstOfTargetMonth.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);
    const result = new Date(
      Date.UTC(
        firstOfTargetMonth.getUTCFullYear(),
        firstOfTargetMonth.getUTCMonth(),
        targetDay,
      ),
    );
    result.setUTCDate(result.getUTCDate() + (amount.days ?? 0));
    return result;
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

  async syncUserAccounts(
    userId: string,
    options: {
      startDate?: string;
      endDate?: string;
      mode?: 'initial' | 'manual';
    },
  ): Promise<void> {
    const mode = options.mode ?? 'manual';
    const connections = await this.getUserConnections(userId);
    const coverageMap = await this.getCachedCoverageMap(userId);
    const today = this.getTodayUtcDateString();

    const scrapePromises = connections.map(async (conn) => {
      try {
        if (mode === 'initial' && this.isProviderBlockError(conn.lastError)) {
          console.warn(
            `[syncUserAccounts] Skipping automatic sync for ${conn.bankId} because the last attempt was blocked by the provider`,
          );
          return;
        }

        const requestedRange = this.normalizeRequestedRangeForBank(
          conn.bankId,
          options.startDate,
          options.endDate,
        );
        if (!requestedRange) return;

        const coverage = coverageMap.get(conn.bankId) ?? [];

        let uncoveredIntervals = this.getUncoveredIntervals(
          requestedRange,
          coverage,
        );

        if (mode === 'manual') {
          const threeDaysAgo = this.addDays(today, -3);
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
          uncoveredIntervals = this.mergeIntervals(uncoveredIntervals);
        }

        if (uncoveredIntervals.length > 0) {
          const minDateStr = uncoveredIntervals.reduce(
            (min, cur) => (cur.startDate < min ? cur.startDate : min),
            uncoveredIntervals[0].startDate,
          );

          const scrapeStartDate = this.resolveScrapeStartDate(
            conn.bankId,
            minDateStr,
          );
          console.log(
            `[syncUserAccounts] Scraping ${conn.bankId} for user ${userId} starting from ${scrapeStartDate.toISOString()} (Requested: ${requestedRange.startDate} to ${requestedRange.endDate}, Missing: ${uncoveredIntervals.map((i) => `${i.startDate}..${i.endDate}`).join(', ')}, Mode: ${mode})`,
          );

          const scraper = this.scraperFactory.getScraper(conn.bankId);
          const credentials = await this.getCredentials(userId, conn.bankId);
          if (!credentials) {
            console.warn(
              `[syncUserAccounts] No credentials found for ${conn.bankId} (User: ${userId})`,
            );
            return;
          }

          const response = await scraper.scrape(
            credentials as ScraperCredentials,
            scrapeStartDate,
          );

          if (response.status === 'SUCCESS' && response.accounts) {
            const accountsToSave = this.filterAccountsToIntervals(
              response.accounts,
              uncoveredIntervals,
            );
            await this.setCachedAccounts(
              userId,
              conn.bankId,
              accountsToSave,
            );
            for (const interval of uncoveredIntervals) {
              await this.saveCoveredInterval(userId, conn.bankId, interval);
            }
            await this.clearConnectionError(userId, conn.bankId);
            console.log(
              `[syncUserAccounts] Successfully synced ${conn.bankId} for user ${userId}`,
            );
          } else {
            const isPermanent = response.error?.includes('INVALID_CREDENTIALS');
            const isProviderBlock = this.isProviderBlockError(response.error);
            if (isPermanent || isProviderBlock) {
              await this.markConnectionFailed(
                userId,
                conn.bankId,
                response.error ?? 'Unknown permanent error',
              );
            }
            console.error(
              `[syncUserAccounts] Scraper failed for ${conn.bankId}: ${response.error}`,
            );
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        const isPermanent = errorMsg.includes('INVALID_CREDENTIALS');
        const isProviderBlock = this.isProviderBlockError(errorMsg);
        if (isPermanent || isProviderBlock) {
          await this.markConnectionFailed(userId, conn.bankId, errorMsg);
        }
        console.error(
          `[syncUserAccounts] Failed to sync ${conn.bankId} for user ${userId}:`,
          err,
        );
      }
    });

    await Promise.all(scrapePromises);
  }

  // Session Management Methods
  createSession(sessionId: string, state: SessionState): void {
    this.sessions.set(sessionId, state);
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getScrapersList(): any[] {
    const list = Object.entries(SCRAPERS_METADATA).map(([key, meta]) => {
      const libraryScraper = SCRAPERS[key];
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

  async saveCredentials(
    userId: string,
    bankId: string,
    credentials: Record<string, string>,
  ): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));
    let vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    if (!vaultEntry) {
      vaultEntry = this.vaultRepository.create({ userId, bankId });
    }
    vaultEntry.encryptedCredentials = encrypted;
    vaultEntry.lastError = null;
    await this.vaultRepository.save(vaultEntry);
  }

  async getCredentials(
    userId: string,
    bankId: string,
  ): Promise<Record<string, string> | null> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    if (!vaultEntry) return null;
    const decrypted = decrypt(vaultEntry.encryptedCredentials);
    return JSON.parse(decrypted);
  }

  async getUserConnections(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepository.find({ where: { userId } });
  }

  async getUserConnectionsCount(userId: string): Promise<number> {
    return this.vaultRepository.count({ where: { userId } });
  }

  async getCachedAccounts(userId: string): Promise<any[]> {
    return this.getCachedAccountsForRange(userId);
  }

  async getCachedAccountsForRange(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const cacheEntries = await this.cacheRepository.find({ where: { userId } });
    const results: any[] = [];

    let startIso = startDate;
    let endIso = endDate;
    const today = this.getTodayUtcDateString();

    if (!startIso || !endIso) {
      const now = new Date();
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10);
      endIso = today;
    } else {
      if (endIso > today) {
        endIso = today;
      }
    }

    const startStr = startIso.slice(0, 10);
    const endStr = endIso.slice(0, 10);

    for (const entry of cacheEntries) {
      try {
        const accountsList = JSON.parse(entry.cachedData);
        for (const acc of accountsList) {
          const txns = await this.transactionRepository.find({
            where: {
              userId,
              bankId: entry.bankId,
              accountNumber: acc.accountNumber,
              date: Between(
                `${startStr}T00:00:00.000Z`,
                `${endStr}T23:59:59.999Z`,
              ),
            },
            order: { date: 'DESC' },
          });

          results.push({
            bankId: entry.bankId,
            accountNumber: acc.accountNumber,
            balance: acc.balance,
            transactions: txns,
          });
        }
      } catch (err) {
        // Skip corrupted caches
      }
    }
    return results;
  }

  async getCachedCoverageMap(
    userId: string,
  ): Promise<Map<string, Array<{ startDate: string; endDate: string }>>> {
    const coverages = await this.coverageRepository.find({ where: { userId } });
    const map = new Map<
      string,
      Array<{ startDate: string; endDate: string }>
    >();
    for (const entry of coverages) {
      const list = map.get(entry.bankId) ?? [];
      list.push({ startDate: entry.startDate, endDate: entry.endDate });
      map.set(entry.bankId, list);
    }
    return map;
  }

  isRangeCovered(
    coverage: Array<{ startDate: string; endDate: string }> | undefined,
    startDate?: string,
    endDate?: string,
  ): boolean {
    if (!coverage || coverage.length === 0) return false;
    if (!startDate || !endDate) return false;
    const uncovered = this.getUncoveredIntervals(
      { startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10) },
      coverage,
    );
    return uncovered.length === 0;
  }

  generateStableTxnId(bankId: string, accountNumber: string, txn: any): string {
    if (txn.id && !txn.id.startsWith('txn_')) {
      return txn.id;
    }
    const dateStr = String(txn.date ?? '').slice(0, 10);
    const amountVal = Number(txn.chargedAmount ?? txn.amount ?? 0).toFixed(2);
    const desc = String(txn.description ?? '')
      .trim()
      .toLowerCase();
    const memoStr = String(txn.memo ?? '')
      .trim()
      .toLowerCase();
    const rawKey = `${bankId.toLowerCase()}:${accountNumber}:${dateStr}:${amountVal}:${desc}:${memoStr}`;
    return crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex')
      .slice(0, 32);
  }

  addDays(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  getUncoveredIntervals(
    requested: { startDate: string; endDate: string },
    covered: Array<{ startDate: string; endDate: string }>,
  ): Array<{ startDate: string; endDate: string }> {
    const sorted = [...covered].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const uncovered: Array<{ startDate: string; endDate: string }> = [];
    let currentStart = requested.startDate;

    for (const interval of sorted) {
      if (interval.endDate < currentStart) {
        continue;
      }
      if (interval.startDate > requested.endDate) {
        break;
      }
      if (interval.startDate > currentStart) {
        const gapEnd = this.addDays(interval.startDate, -1);
        if (gapEnd >= currentStart) {
          uncovered.push({ startDate: currentStart, endDate: gapEnd });
        }
      }
      currentStart = this.addDays(interval.endDate, 1);
      if (currentStart > requested.endDate) {
        break;
      }
    }

    if (currentStart <= requested.endDate) {
      uncovered.push({ startDate: currentStart, endDate: requested.endDate });
    }

    return uncovered;
  }

  mergeIntervals(
    intervals: Array<{ startDate: string; endDate: string }>,
  ): Array<{ startDate: string; endDate: string }> {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const merged: Array<{ startDate: string; endDate: string }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      const dayAfterLastEnd = this.addDays(last.endDate, 1);
      if (current.startDate <= dayAfterLastEnd) {
        if (current.endDate > last.endDate) {
          last.endDate = current.endDate;
        }
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  async saveCoveredInterval(
    userId: string,
    bankId: string,
    interval: { startDate: string; endDate: string },
  ): Promise<void> {
    const allIntervals = await this.coverageRepository.find({
      where: { userId, bankId },
    });
    const merged = this.mergeIntervals([
      ...allIntervals.map((i) => ({
        startDate: i.startDate,
        endDate: i.endDate,
      })),
      interval,
    ]);

    await this.coverageRepository.delete({ userId, bankId });
    const newEntities = merged.map((i) =>
      this.coverageRepository.create({
        userId,
        bankId,
        startDate: i.startDate,
        endDate: i.endDate,
      }),
    );
    await this.coverageRepository.save(newEntities);
  }

  async markConnectionFailed(
    userId: string,
    bankId: string,
    error: string,
  ): Promise<void> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    if (vaultEntry) {
      vaultEntry.lastError = error;
      vaultEntry.updatedAt = new Date();
      await this.vaultRepository.save(vaultEntry);
    }
  }

  async clearConnectionError(userId: string, bankId: string): Promise<void> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    if (vaultEntry?.lastError) {
      vaultEntry.lastError = null;
      vaultEntry.updatedAt = new Date();
      await this.vaultRepository.save(vaultEntry);
    }
  }

  async getLastError(userId: string, bankId: string): Promise<string | null> {
    const vaultEntry = await this.vaultRepository.findOne({
      where: { userId, bankId },
    });
    return vaultEntry?.lastError ?? null;
  }

  async getCoveredIntervals(
    userId: string,
    bankId: string,
  ): Promise<Array<{ startDate: string; endDate: string }>> {
    const intervals = await this.coverageRepository.find({
      where: { userId, bankId },
    });
    return intervals.map((i) => ({
      startDate: i.startDate,
      endDate: i.endDate,
    }));
  }

  private inferCoverageFromAccounts(accounts: any[]): {
    startDate?: string;
    endDate?: string;
  } {
    let minDate: string | undefined;
    let maxDate: string | undefined;

    for (const account of accounts ?? []) {
      for (const txn of account?.transactions ?? []) {
        const dateRaw = String(txn?.date ?? '').slice(0, 10);
        if (!dateRaw || dateRaw.length !== 10) continue;
        if (!minDate || dateRaw < minDate) minDate = dateRaw;
        if (!maxDate || dateRaw > maxDate) maxDate = dateRaw;
      }
    }

    return { startDate: minDate, endDate: maxDate };
  }

  filterAccountsToIntervals(
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

  async setCachedAccounts(
    userId: string,
    bankId: string,
    accounts: any[],
  ): Promise<void> {
    let cacheEntry = await this.cacheRepository.findOne({
      where: { userId, bankId },
    });
    if (!cacheEntry) {
      cacheEntry = this.cacheRepository.create({ userId, bankId });
    }
    const accountsMetadata = accounts.map((acc) => ({
      accountNumber: acc.accountNumber,
      balance: acc.balance,
      transactions: [],
    }));
    cacheEntry.cachedData = JSON.stringify(accountsMetadata);
    const coverage = this.inferCoverageFromAccounts(accounts);
    cacheEntry.coverageStartDate = coverage.startDate ?? null;
    cacheEntry.coverageEndDate = coverage.endDate ?? null;
    await this.cacheRepository.save(cacheEntry);

    const entitiesToSave: TransactionEntity[] = [];
    for (const acc of accounts ?? []) {
      for (const txn of acc.transactions ?? []) {
        const stableId = this.generateStableTxnId(
          bankId,
          acc.accountNumber,
          txn,
        );
        const entity = this.transactionRepository.create({
          userId,
          bankId,
          accountNumber: acc.accountNumber,
          id: stableId,
          date: txn.date,
          processedDate: txn.processedDate,
          amount: txn.amount,
          chargedAmount: txn.chargedAmount,
          description: txn.description,
          memo: txn.memo,
          originalCurrency: txn.originalCurrency,
        });
        entitiesToSave.push(entity);
      }
    }

    if (entitiesToSave.length > 0) {
      const result = await this.transactionRepository
        .createQueryBuilder()
        .insert()
        .into(TransactionEntity)
        .values(entitiesToSave)
        .orUpdate(
          [
            'date',
            'processedDate',
            'amount',
            'chargedAmount',
            'description',
            'memo',
            'originalCurrency',
          ],
          ['userId', 'bankId', 'accountNumber', 'id'],
        )
        .execute();

      console.log(
        `[setCachedAccounts] Saved ${entitiesToSave.length} transactions for ${bankId} (User: ${userId})`,
      );
    } else {
      console.log(
        `[setCachedAccounts] No new transactions to save for ${bankId} (User: ${userId})`,
      );
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async scanIncome(input: ScanIncomeRequest): Promise<ScanIncomeResult> {
    return this.scanIncomeDeterministic(
      input.accounts ?? [],
      input.period ?? 'current',
      input.startDate,
      input.endDate,
      input.debug === true,
    );
  }

  async upsertMerchantAnnotations(
    annotations: Array<{
      normalizedMerchant: string;
      displayMerchant: string;
      category: string;
      source?: 'ai' | 'manual' | 'rule_seed';
      model?: string;
      confidence?: number;
    }>,
  ): Promise<{ upserted: number }> {
    let upserted = 0;
    for (const item of annotations) {
      const normalizedMerchant = this.normalizeMerchantKey(
        item.normalizedMerchant,
      );
      if (!normalizedMerchant) continue;
      const existing = await this.annotationRepository.findOne({
        where: { normalizedMerchant },
      });
      const entity =
        existing ?? this.annotationRepository.create({ normalizedMerchant });
      entity.displayMerchant =
        String(item.displayMerchant ?? '').trim() || normalizedMerchant;
      entity.category = this.isValidCategory(item.category)
        ? item.category
        : 'לא מסווג';
      entity.source = item.source ?? 'ai';
      entity.model = item.model;
      entity.confidence = Number.isFinite(item.confidence)
        ? item.confidence
        : undefined;
      await this.annotationRepository.save(entity);
      upserted += 1;
    }
    return { upserted };
  }

  private async scanIncomeDeterministic(
    accounts: ScanAccount[],
    period: 'current' | 'previous' | 'both',
    startDate?: string,
    endDate?: string,
    debugEnabled: boolean = false,
  ): Promise<ScanIncomeResult> {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    const categoryTransactions: Record<string, ScanTransaction[]> = {};
    for (const category of EXPENSE_CATEGORIES) {
      categoryMap.set(category, { amount: 0, count: 0 });
      categoryTransactions[category] = [];
    }

    let totalIncome = 0;
    let totalExpenses = 0;
    const seenTransactionKeys = new Set<string>();
    const unresolvedMerchants = new Map<string, string>();
    const annotationCache = new Map<string, string>();
    const [periodStart, periodEnd] = this.resolveDateRange(
      period,
      startDate,
      endDate,
    );

    const debugTrace: ScanDebugTrace | undefined = debugEnabled
      ? {
          period,
          customRange:
            startDate && endDate ? { startDate, endDate } : undefined,
          periodStartIso: periodStart.toISOString(),
          periodEndIso: periodEnd.toISOString(),
          accountsSummary: [],
          transactions: [],
          finalTotals: { totalIncome: 0, totalExpenses: 0, categories: [] },
        }
      : undefined;

    for (const account of accounts ?? []) {
      const isCredit = this.isCreditCompany(account.bankId);
      const txns = account.transactions ?? [];
      if (debugTrace) {
        debugTrace.accountsSummary.push({
          bankId: String(account.bankId ?? ''),
          accountNumber: String(account.accountNumber ?? ''),
          isCreditCompany: isCredit,
          transactionCount: txns.length,
        });
      }
      for (const txn of txns) {
        const transactionKey = this.buildTransactionDedupKey(account, txn);
        const baseDebugTxn = debugTrace
          ? {
              bankId: String(account.bankId ?? ''),
              accountNumber: String(account.accountNumber ?? ''),
              transactionId: String(txn.id ?? ''),
              date: String(txn.date ?? ''),
              amount: Number(txn.chargedAmount),
              description:
                this.getCleanDescription(txn.description, txn.memo) ?? '',
              dedupKey: transactionKey,
              isCreditCompany: isCredit,
            }
          : null;

        if (seenTransactionKeys.has(transactionKey)) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_duplicate',
              reason: 'Duplicate by dedup key',
            });
          }
          continue;
        }
        seenTransactionKeys.add(transactionKey);

        const txnDate = new Date(txn.date);
        if (!this.isWithinRange(txnDate, periodStart, periodEnd)) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_out_of_period',
              reason: 'Transaction date outside selected period',
            });
          }
          continue;
        }

        const amount = Number(txn.chargedAmount);
        if (!Number.isFinite(amount)) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_invalid_amount',
              reason: 'Amount is not finite',
            });
          }
          continue;
        }
        if (amount === 0) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_zero_amount',
              reason: 'Amount equals zero',
            });
          }
          continue;
        }

        if (amount < 0 && isCredit) {
          const merchantName = this.getCleanDescription(
            txn.description,
            txn.memo,
          );
          if (!merchantName) {
            if (debugTrace && baseDebugTxn) {
              debugTrace.transactions.push({
                ...baseDebugTxn,
                status: 'skipped_no_description',
                reason: 'Expense has no usable description',
              });
            }
            continue;
          }
          const normalizedMerchant = this.normalizeMerchantKey(merchantName);
          let category: (typeof EXPENSE_CATEGORIES)[number] | null =
            this.categorizeExpense(merchantName);
          if (!category && normalizedMerchant) {
            const cached = annotationCache.get(normalizedMerchant);
            if (cached) {
              category = this.isValidCategory(cached) ? cached : 'לא מסווג';
            } else {
              const annotation = await this.annotationRepository.findOne({
                where: { normalizedMerchant },
              });
              if (annotation?.category) {
                annotationCache.set(normalizedMerchant, annotation.category);
                category = this.isValidCategory(annotation.category)
                  ? annotation.category
                  : 'לא מסווג';
              }
            }
          }
          if (!category && normalizedMerchant) {
            unresolvedMerchants.set(normalizedMerchant, merchantName);
          }
          const finalCategory = category ?? 'לא מסווג';
          const current = categoryMap.get(finalCategory);
          if (!current) continue;
          totalExpenses += Math.abs(amount);
          current.amount += Math.abs(amount);
          current.count += 1;
          categoryTransactions[finalCategory].push({
            transactionId: txn.id,
            bankId: String(account.bankId ?? ''),
            accountNumber: String(account.accountNumber ?? ''),
            cardLast4: this.extractLast4Digits(
              String(account.accountNumber ?? ''),
            ),
            merchant: merchantName,
            date: txn.date,
            amount: Math.abs(amount),
            reason: `Matched rule-based category: ${finalCategory}`,
            confidence: 0.7,
            tags: this.inferTags(merchantName, Math.abs(amount), txns),
          });
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'included_expense',
              category: finalCategory,
              reason:
                finalCategory === 'לא מסווג'
                  ? 'Included as uncategorized expense (rule + annotations miss)'
                  : `Included as credit-company expense in category: ${finalCategory}`,
            });
          }
        } else if (amount < 0) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_non_credit_expense',
              reason: 'Expense ignored because account is not a credit company',
            });
          }
        }

        if (amount > 0) {
          if (isCredit) {
            totalIncome += amount;
            if (debugTrace && baseDebugTxn) {
              debugTrace.transactions.push({
                ...baseDebugTxn,
                status: 'included_income_credit',
                reason:
                  'Included as positive transaction in credit company account',
              });
            }
            continue;
          }
          const cleaned = this.getCleanDescription(txn.description, txn.memo);
          if (cleaned) {
            totalIncome += amount;
            if (debugTrace && baseDebugTxn) {
              debugTrace.transactions.push({
                ...baseDebugTxn,
                status: 'included_income_bank',
                reason:
                  'Included as positive bank transaction with usable description',
              });
            }
          } else if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_no_description',
              reason: 'Positive bank transaction has no usable description',
            });
          }
        }
      }
    }

    const categories = EXPENSE_CATEGORIES.map((name) => {
      const entry = categoryMap.get(name) ?? { amount: 0, count: 0 };
      return { name, amount: entry.amount, count: entry.count };
    }).filter((category) => category.amount > 0);

    const result: ScanIncomeResult = {
      totalIncome,
      totalExpenses,
      categories,
      categoryTransactions,
      unresolvedMerchants: Array.from(unresolvedMerchants.entries()).map(
        ([normalizedMerchant, displayMerchant]) => ({
          normalizedMerchant,
          displayMerchant,
        }),
      ),
    };

    if (debugTrace) {
      debugTrace.finalTotals = { totalIncome, totalExpenses, categories };
      result.debugTrace = debugTrace;
    }

    return result;
  }

  private isValidCategory(
    value: string,
  ): value is (typeof EXPENSE_CATEGORIES)[number] {
    return EXPENSE_CATEGORIES.includes(
      value as (typeof EXPENSE_CATEGORIES)[number],
    );
  }

  private normalizeMerchantKey(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getPeriodRange(
    period: 'current' | 'previous' | 'both',
  ): [Date, Date] {
    const now = new Date();
    const currentMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const previousMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    if (period === 'previous') return [previousMonthStart, currentMonthStart];
    if (period === 'both') return [previousMonthStart, nextMonthStart];
    return [currentMonthStart, nextMonthStart];
  }

  private resolveDateRange(
    period: 'current' | 'previous' | 'both',
    startDate?: string,
    endDate?: string,
  ): [Date, Date] {
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T00:00:00.000Z`);
      if (
        Number.isFinite(start.getTime()) &&
        Number.isFinite(end.getTime()) &&
        end >= start
      ) {
        const endExclusive = new Date(end);
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
        return [start, endExclusive];
      }
    }
    return this.getPeriodRange(period);
  }

  private isWithinRange(date: Date, start: Date, end: Date): boolean {
    if (!Number.isFinite(date.getTime())) return false;
    return date >= start && date < end;
  }

  private isCreditCompany(bankId: string): boolean {
    const normalized = String(bankId ?? '').toLowerCase();
    return (
      normalized === 'max' || normalized === 'isracard' || normalized === 'cal'
    );
  }

  private categorizeExpense(
    description: string,
  ): Exclude<(typeof EXPENSE_CATEGORIES)[number], 'לא מסווג'> | null {
    const desc = description.toLowerCase();
    if (
      desc.includes('וולט') ||
      desc.includes('wolt') ||
      desc.includes('מסעדה') ||
      desc.includes('מקדונלד') ||
      desc.includes('קפה') ||
      desc.includes('ארומה') ||
      desc.includes('קופיקס') ||
      desc.includes('אוכל') ||
      desc.includes('פיצה')
    )
      return 'מזון';
    if (
      desc.includes('זארה') ||
      desc.includes('zara') ||
      desc.includes('h&m') ||
      desc.includes('אסוס') ||
      desc.includes('asos') ||
      desc.includes('ביגוד') ||
      desc.includes('בגדים') ||
      desc.includes('נעליים')
    )
      return 'ביגוד';
    if (
      desc.includes('סינמה') ||
      desc.includes('נטפליקס') ||
      desc.includes('netflix') ||
      desc.includes('בר ') ||
      desc.includes('הופעה') ||
      desc.includes('סרט') ||
      desc.includes('בידור') ||
      desc.includes('קולנוע')
    )
      return 'בידור';
    if (
      desc.includes('פאב') ||
      desc.includes('מועדון') ||
      desc.includes('ליין') ||
      desc.includes('בילוי') ||
      desc.includes('אטרקציה') ||
      desc.includes('לונה פארק') ||
      desc.includes('חדר בריחה')
    )
      return 'בילויים';
    if (
      desc.includes('אייבורי') ||
      desc.includes('ksp') ||
      desc.includes('מחסני חשמל') ||
      desc.includes('באג') ||
      desc.includes('electronics') ||
      desc.includes('אלקטרוניקה') ||
      desc.includes('חשמל')
    )
      return 'אלקטרוניקה';
    if (
      desc.includes('amazon') ||
      desc.includes('aliexpress') ||
      desc.includes('ebay') ||
      desc.includes('etsy') ||
      desc.includes('עלי אקספרס') ||
      desc.includes('שיין') ||
      desc.includes('shein') ||
      desc.includes('online') ||
      desc.includes('אונליין')
    )
      return 'אונליין';
    if (
      desc.includes('פז') ||
      desc.includes('סונול') ||
      desc.includes('דלק') ||
      desc.includes('רכבת') ||
      desc.includes('אוטובוס') ||
      desc.includes('מונית') ||
      desc.includes('גט') ||
      desc.includes('gett') ||
      desc.includes('תחבורה')
    )
      return 'דלק/תחבורה';
    if (
      desc.includes('שופרסל') ||
      desc.includes('רמי לוי') ||
      desc.includes('טיב טעם') ||
      desc.includes('סופר') ||
      desc.includes('מכולת') ||
      desc.includes('יוחננוף') ||
      desc.includes('חצי חינם') ||
      desc.includes('ויקטורי')
    )
      return 'סופר';
    if (
      desc.includes('ספוטיפיי') ||
      desc.includes('spotify') ||
      desc.includes('אפל') ||
      desc.includes('apple') ||
      desc.includes('מנוי') ||
      desc.includes('אינטרנט') ||
      desc.includes('טלפון') ||
      desc.includes('הוסט') ||
      desc.includes('domain')
    )
      return 'מנויים';
    return null;
  }

  private getCleanDescription(
    description: string,
    memo?: string,
  ): string | null {
    const desc = String(description ?? '');
    const mem = String(memo ?? '');
    const genericNames = [
      'דירקט',
      'דירקט מצטבר',
      'עברה',
      'העברה נכנסת',
      'העברה',
      'הוראת קבע',
      'חיוב כרטיס',
      'חיוב כרטיס אשראי',
      'מזומן',
      'הפקדה',
      'משיכה',
      'עמלה',
      'עמלת',
      'bit',
      'ביט',
      'paybox',
      'פייבוקס',
      'העברת כסף',
    ];
    const isGeneric = (value: string) =>
      genericNames.some(
        (genericValue) =>
          value.trim() === genericValue ||
          value.toLowerCase().includes(genericValue.toLowerCase()),
      );
    if (isGeneric(desc)) {
      if (mem.trim() && !isGeneric(mem)) return mem.trim();
      return null;
    }
    const cleaned = desc.trim() || mem.trim();
    return cleaned || null;
  }

  private buildTransactionDedupKey(
    account: ScanAccount,
    txn: UnifiedTransaction,
  ): string {
    const bankId = String(account.bankId ?? '').toLowerCase();
    const accountNumber = String(account.accountNumber ?? '');
    const txnId = String(txn.id ?? '').trim();
    if (txnId) return `id:${bankId}:${accountNumber}:${txnId}`;
    const desc =
      this.getCleanDescription(txn.description, txn.memo) ??
      String(txn.description ?? '').trim() ??
      String(txn.memo ?? '').trim();
    return `fp:${bankId}:${accountNumber}:${String(txn.date ?? '')}:${String(txn.chargedAmount ?? '')}:${desc.toLowerCase()}`;
  }

  private inferTags(
    description: string,
    amount: number,
    txns: UnifiedTransaction[],
  ): string[] {
    const tags: string[] = [];
    const lower = description.toLowerCase();
    if (
      lower.includes('spotify') ||
      lower.includes('netflix') ||
      lower.includes('apple') ||
      lower.includes('מנוי')
    ) {
      tags.push('subscription_candidate');
    }
    const similarCount = txns.filter((txn) =>
      (txn.description || '').toLowerCase().includes(lower.slice(0, 10)),
    ).length;
    if (similarCount >= 2) tags.push('recurring');
    if (amount >= 2000) tags.push('anomaly');
    return tags;
  }

  private extractLast4Digits(value: string): string | undefined {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length < 4) return undefined;
    return digits.slice(-4);
  }
}
