import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SCRAPERS } from 'israeli-bank-scrapers';
import type { UnifiedTransaction } from '@moneyup/types';
import { SCRAPERS_METADATA } from './config/scrapers.config';
import { VaultEntity } from './entities/vault.entity';
import { ScrapedCacheEntity } from './entities/cache.entity';
import { MerchantAnnotationEntity } from './entities/merchant-annotation.entity';
import { encrypt, decrypt } from './utils/crypto';

export type SessionStatus = 'PROCESSING' | 'CHALLENGE_REQUIRED' | 'SUCCESS' | 'FAILED';

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
  unresolvedMerchants?: Array<{ normalizedMerchant: string; displayMerchant: string }>;
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

@Injectable()
export class ScraperService {
  constructor(
    @InjectRepository(VaultEntity)
    private readonly vaultRepository: Repository<VaultEntity>,
    @InjectRepository(ScrapedCacheEntity)
    private readonly cacheRepository: Repository<ScrapedCacheEntity>,
    @InjectRepository(MerchantAnnotationEntity)
    private readonly annotationRepository: Repository<MerchantAnnotationEntity>,
  ) {}

  private readonly sessions = new Map<string, SessionState>();

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

  async saveCredentials(userId: string, bankId: string, credentials: Record<string, string>): Promise<void> {
    const encrypted = encrypt(JSON.stringify(credentials));
    let vaultEntry = await this.vaultRepository.findOne({ where: { userId, bankId } });
    if (!vaultEntry) {
      vaultEntry = this.vaultRepository.create({ userId, bankId });
    }
    vaultEntry.encryptedCredentials = encrypted;
    await this.vaultRepository.save(vaultEntry);
  }

  async getCredentials(userId: string, bankId: string): Promise<Record<string, string> | null> {
    const vaultEntry = await this.vaultRepository.findOne({ where: { userId, bankId } });
    if (!vaultEntry) return null;
    const decrypted = decrypt(vaultEntry.encryptedCredentials);
    return JSON.parse(decrypted);
  }

  async getUserConnections(userId: string): Promise<VaultEntity[]> {
    return this.vaultRepository.find({ where: { userId } });
  }

  async getCachedAccounts(userId: string): Promise<any[]> {
    const cacheEntries = await this.cacheRepository.find({ where: { userId } });
    const results: any[] = [];
    for (const entry of cacheEntries) {
      try {
        const accountsList = JSON.parse(entry.cachedData);
        for (const acc of accountsList) {
          results.push({
            bankId: entry.bankId,
            accountNumber: acc.accountNumber,
            balance: acc.balance,
            transactions: acc.transactions,
          });
        }
      } catch (err) {
        // Skip corrupted caches
      }
    }
    return results;
  }

  async setCachedAccounts(userId: string, bankId: string, accounts: any[]): Promise<void> {
    let cacheEntry = await this.cacheRepository.findOne({ where: { userId, bankId } });
    if (!cacheEntry) {
      cacheEntry = this.cacheRepository.create({ userId, bankId });
    }
    cacheEntry.cachedData = JSON.stringify(accounts);
    await this.cacheRepository.save(cacheEntry);
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
      const normalizedMerchant = this.normalizeMerchantKey(item.normalizedMerchant);
      if (!normalizedMerchant) continue;
      const existing = await this.annotationRepository.findOne({ where: { normalizedMerchant } });
      const entity = existing ?? this.annotationRepository.create({ normalizedMerchant });
      entity.displayMerchant = String(item.displayMerchant ?? '').trim() || normalizedMerchant;
      entity.category = this.isValidCategory(item.category) ? item.category : 'לא מסווג';
      entity.source = item.source ?? 'ai';
      entity.model = item.model;
      entity.confidence = Number.isFinite(item.confidence) ? item.confidence : undefined;
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
    const [periodStart, periodEnd] = this.resolveDateRange(period, startDate, endDate);

    const debugTrace: ScanDebugTrace | undefined = debugEnabled
      ? {
          period,
          customRange: startDate && endDate ? { startDate, endDate } : undefined,
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
              description: this.getCleanDescription(txn.description, txn.memo) ?? '',
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
          const merchantName = this.getCleanDescription(txn.description, txn.memo);
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
          let category = this.categorizeExpense(merchantName);
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
          category = category ?? 'לא מסווג';
          const current = categoryMap.get(category);
          if (!current) continue;
          totalExpenses += Math.abs(amount);
          current.amount += Math.abs(amount);
          current.count += 1;
          categoryTransactions[category].push({
            transactionId: txn.id,
            merchant: merchantName,
            date: txn.date,
            amount: Math.abs(amount),
            reason: `Matched rule-based category: ${category}`,
            confidence: 0.7,
            tags: this.inferTags(merchantName, Math.abs(amount), txns),
          });
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'included_expense',
              category,
              reason:
                category === 'לא מסווג'
                  ? 'Included as uncategorized expense (rule + annotations miss)'
                  : `Included as credit-company expense in category: ${category}`,
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
                reason: 'Included as positive transaction in credit company account',
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
                reason: 'Included as positive bank transaction with usable description',
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

  private isValidCategory(value: string): value is (typeof EXPENSE_CATEGORIES)[number] {
    return EXPENSE_CATEGORIES.includes(value as (typeof EXPENSE_CATEGORIES)[number]);
  }

  private normalizeMerchantKey(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getPeriodRange(period: 'current' | 'previous' | 'both'): [Date, Date] {
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
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
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end >= start) {
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
    return normalized === 'max' || normalized === 'isracard' || normalized === 'cal';
  }

  private categorizeExpense(
    description: string,
  ): Exclude<(typeof EXPENSE_CATEGORIES)[number], 'לא מסווג'> | null {
    const desc = description.toLowerCase();
    if (
      desc.includes('וולט') || desc.includes('wolt') || desc.includes('מסעדה') || desc.includes('מקדונלד') ||
      desc.includes('קפה') || desc.includes('ארומה') || desc.includes('קופיקס') || desc.includes('אוכל') || desc.includes('פיצה')
    ) return 'מזון';
    if (
      desc.includes('זארה') || desc.includes('zara') || desc.includes('h&m') || desc.includes('אסוס') ||
      desc.includes('asos') || desc.includes('ביגוד') || desc.includes('בגדים') || desc.includes('נעליים')
    ) return 'ביגוד';
    if (
      desc.includes('סינמה') || desc.includes('נטפליקס') || desc.includes('netflix') || desc.includes('בר ') ||
      desc.includes('הופעה') || desc.includes('סרט') || desc.includes('בידור') || desc.includes('קולנוע')
    ) return 'בידור';
    if (
      desc.includes('פאב') || desc.includes('מועדון') || desc.includes('ליין') || desc.includes('בילוי') ||
      desc.includes('אטרקציה') || desc.includes('לונה פארק') || desc.includes('חדר בריחה')
    ) return 'בילויים';
    if (
      desc.includes('אייבורי') || desc.includes('ksp') || desc.includes('מחסני חשמל') || desc.includes('באג') ||
      desc.includes('electronics') || desc.includes('אלקטרוניקה') || desc.includes('חשמל')
    ) return 'אלקטרוניקה';
    if (
      desc.includes('amazon') || desc.includes('aliexpress') || desc.includes('ebay') || desc.includes('etsy') ||
      desc.includes('עלי אקספרס') || desc.includes('שיין') || desc.includes('shein') || desc.includes('online') ||
      desc.includes('אונליין')
    ) return 'אונליין';
    if (
      desc.includes('פז') || desc.includes('סונול') || desc.includes('דלק') || desc.includes('רכבת') ||
      desc.includes('אוטובוס') || desc.includes('מונית') || desc.includes('גט') || desc.includes('gett') || desc.includes('תחבורה')
    ) return 'דלק/תחבורה';
    if (
      desc.includes('שופרסל') || desc.includes('רמי לוי') || desc.includes('טיב טעם') || desc.includes('סופר') ||
      desc.includes('מכולת') || desc.includes('יוחננוף') || desc.includes('חצי חינם') || desc.includes('ויקטורי')
    ) return 'סופר';
    if (
      desc.includes('ספוטיפיי') || desc.includes('spotify') || desc.includes('אפל') || desc.includes('apple') ||
      desc.includes('מנוי') || desc.includes('אינטרנט') || desc.includes('טלפון') || desc.includes('הוסט') || desc.includes('domain')
    ) return 'מנויים';
    return null;
  }

  private getCleanDescription(description: string, memo?: string): string | null {
    const desc = String(description ?? '');
    const mem = String(memo ?? '');
    const genericNames = [
      'דירקט', 'דירקט מצטבר', 'עברה', 'העברה נכנסת', 'העברה', 'הוראת קבע', 'חיוב כרטיס',
      'חיוב כרטיס אשראי', 'מזומן', 'הפקדה', 'משיכה', 'עמלה', 'עמלת', 'bit', 'ביט', 'paybox', 'פייבוקס', 'העברת כסף',
    ];
    const isGeneric = (value: string) =>
      genericNames.some((genericValue) => value.trim() === genericValue || value.toLowerCase().includes(genericValue.toLowerCase()));
    if (isGeneric(desc)) {
      if (mem.trim() && !isGeneric(mem)) return mem.trim();
      return null;
    }
    const cleaned = desc.trim() || mem.trim();
    return cleaned || null;
  }

  private buildTransactionDedupKey(account: ScanAccount, txn: UnifiedTransaction): string {
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

  private inferTags(description: string, amount: number, txns: UnifiedTransaction[]): string[] {
    const tags: string[] = [];
    const lower = description.toLowerCase();
    if (lower.includes('spotify') || lower.includes('netflix') || lower.includes('apple') || lower.includes('מנוי')) {
      tags.push('subscription_candidate');
    }
    const similarCount = txns.filter((txn) => (txn.description || '').toLowerCase().includes(lower.slice(0, 10))).length;
    if (similarCount >= 2) tags.push('recurring');
    if (amount >= 2000) tags.push('anomaly');
    return tags;
  }
}
