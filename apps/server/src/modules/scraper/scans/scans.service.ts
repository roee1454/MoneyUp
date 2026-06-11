import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAnnotationEntity } from '../entities/merchant-annotation.entity';
import {
  ScanIncomeRequest,
  ScanIncomeResult,
  ScanAccount,
  ScanTransaction,
  ScanDebugTrace,
  UnifiedTransaction,
} from '@money-up/types';
import { isWithinRange, EXPENSE_CATEGORIES } from '@money-up/common';

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(MerchantAnnotationEntity)
    private readonly annotationRepository: Repository<MerchantAnnotationEntity>,
  ) {}

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
      keywords?: string;
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
      entity.keywords = item.keywords || entity.keywords || null;
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

  async getAllAnnotations(): Promise<MerchantAnnotationEntity[]> {
    return this.annotationRepository.find({
      select: ['displayMerchant', 'normalizedMerchant', 'category', 'keywords'],
    });
  }

  async findMerchantsByTopic(topic: string): Promise<string[]> {
    const term = topic.toLowerCase().trim();
    if (!term) return [];

    // Strategy 1: Find all annotations for the user
    // In a production app, we would use a more advanced search index.
    // For this self-hosted version, we'll fetch unique annotations and rank them in-memory.
    const allAnnotations = await this.annotationRepository.find({
      select: ['displayMerchant', 'normalizedMerchant', 'category', 'keywords'],
    });

    const scores = allAnnotations
      .map((ma) => {
        let score = 0;
        const display = (ma.displayMerchant || '').toLowerCase();
        const normalized = (ma.normalizedMerchant || '').toLowerCase();
        const category = (ma.category || '').toLowerCase();
        const keywords = (ma.keywords || '').toLowerCase().split(/[,\s]+/);

        // Exact matches (Highest priority)
        if (display === term || normalized === term) score += 100;
        // Contains matches
        else if (display.includes(term) || normalized.includes(term))
          score += 50;

        // Category matches
        if (category.includes(term)) score += 30;

        // Keyword matches (Semantic bridge)
        if (keywords.some((k) => k === term)) score += 80;
        else if (keywords.some((k) => k.includes(term))) score += 40;

        return { merchant: ma.displayMerchant, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    // Return unique merchant names, top 15
    return [...new Set(scores.map((s) => s.merchant))].slice(0, 15);
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
    const incomeTransactions: ScanTransaction[] = [];

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalBalance = 0;
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
          finalTotals: {
            totalIncome: 0,
            totalExpenses: 0,
            totalBalance: 0,
            categories: [],
          },
        }
      : undefined;

    for (const account of accounts ?? []) {
      const isCredit = this.isCreditCompany(account.bankId);
      const txns = account.transactions ?? [];
      if (!isCredit) {
        const balance = Number(account.balance);
        if (Number.isFinite(balance)) {
          totalBalance += balance;
        }
      }
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

        if (txn.isDuplicate) {
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'skipped_manually_marked_duplicate',
              reason: 'Transaction manually marked as duplicate',
            });
          }
          continue;
        }

        const txnDate = new Date(txn.date);
        if (!isWithinRange(txnDate, periodStart, periodEnd)) {
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

        if (amount < 0) {
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
          let resolutionReason = category
            ? `Matched rule-based category: ${category}`
            : '';

          if (!category && normalizedMerchant) {
            const cached = annotationCache.get(normalizedMerchant);
            if (cached) {
              category = this.isValidCategory(cached) ? cached : 'לא מסווג';
              resolutionReason =
                category === 'לא מסווג'
                  ? 'Merchant marked as uncategorized'
                  : `Matched smart annotation: ${category}`;
            } else {
              const annotation = await this.annotationRepository.findOne({
                where: { normalizedMerchant },
              });
              if (annotation?.category) {
                annotationCache.set(normalizedMerchant, annotation.category);
                category = this.isValidCategory(annotation.category)
                  ? annotation.category
                  : 'לא מסווג';
                resolutionReason =
                  category === 'לא מסווג'
                    ? 'Merchant marked as uncategorized'
                    : `Matched smart annotation: ${category}`;
              }
            }
          }

          if ((!category || category === 'לא מסווג') && normalizedMerchant) {
            unresolvedMerchants.set(normalizedMerchant, merchantName);
            resolutionReason = 'Uncategorized merchant';
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
            reason: resolutionReason || `Category: ${finalCategory}`,
            confidence: category ? 0.9 : 0.5,
            tags: this.inferTags(merchantName, Math.abs(amount), txns),
            type: 'expense',
          });
          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'included_expense',
              category: finalCategory,
              reason: resolutionReason || 'Included expense',
            });
          }
        }

        if (amount > 0) {
          if (isCredit) {
            if (debugTrace && baseDebugTxn) {
              debugTrace.transactions.push({
                ...baseDebugTxn,
                status: 'skipped_income_credit',
                reason:
                  'Positive credit-company transaction ignored for bank-income total',
              });
            }
            continue;
          }
          const cleaned = this.getCleanDescription(txn.description, txn.memo);
          totalIncome += amount;

          const merchantName = cleaned || txn.description || 'הפקדה/העברה';
          incomeTransactions.push({
            transactionId: txn.id,
            bankId: String(account.bankId ?? ''),
            accountNumber: String(account.accountNumber ?? ''),
            cardLast4: undefined,
            merchant: merchantName,
            date: txn.date,
            amount: amount,
            reason: 'הפקדה לחשבון בנק',
            confidence: 1.0,
            tags: this.inferTags(merchantName, amount, txns),
            type: 'income',
          });

          if (debugTrace && baseDebugTxn) {
            debugTrace.transactions.push({
              ...baseDebugTxn,
              status: 'included_income_bank',
              reason: cleaned
                ? 'Included as positive bank transaction with usable description'
                : 'Included as positive bank transaction',
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
      totalBalance,
      categories,
      categoryTransactions,
      incomeTransactions,
      unresolvedMerchants: Array.from(unresolvedMerchants.entries()).map(
        ([normalizedMerchant, displayMerchant]) => ({
          normalizedMerchant,
          displayMerchant,
        }),
      ),
    };

    if (debugTrace) {
      debugTrace.finalTotals = {
        totalIncome,
        totalExpenses,
        totalBalance,
        categories,
      };
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
      desc.includes('פיצה') ||
      desc.includes('פאב') ||
      desc.includes('בר ')
    )
      return 'מותרות';

    // Grouping: super, clothing, electronics, online shopping -> קניות
    if (
      desc.includes('סופר') ||
      desc.includes('מכולת') ||
      desc.includes('קנייה') ||
      desc.includes('מרקט') ||
      desc.includes('שופרסל') ||
      desc.includes('רמי לוי') ||
      desc.includes('יוחננוף') ||
      desc.includes('חצי חינם') ||
      desc.includes('טיב טעם') ||
      desc.includes('ויקטורי') ||
      desc.includes('אמזון') ||
      desc.includes('amazon') ||
      desc.includes('ebay') ||
      desc.includes('איביי') ||
      desc.includes('עלי אקספרס') ||
      desc.includes('aliexpress') ||
      desc.includes('שיין') ||
      desc.includes('shein') ||
      desc.includes('קניות') ||
      desc.includes('זארה') ||
      desc.includes('zara') ||
      desc.includes('h&m') ||
      desc.includes('נעליים') ||
      desc.includes('בגדים') ||
      desc.includes('ksp') ||
      desc.includes('אייבורי') ||
      desc.includes('ivory') ||
      desc.includes('מחשב') ||
      desc.includes('טלפון') ||
      desc.includes('מחסני חשמל') ||
      desc.includes('באג') ||
      desc.includes('electronics') ||
      desc.includes('אלקטרוניקה') ||
      desc.includes('חשמל') ||
      desc.includes('etsy') ||
      desc.includes('online') ||
      desc.includes('אונליין')
    )
      return 'קניות בסופר';

    // Grouping: entertainment, going out -> בילויים ופנאי
    if (
      desc.includes('סינמה') ||
      desc.includes('קולנוע') ||
      desc.includes('הופעה') ||
      desc.includes('כרטיס') ||
      desc.includes('סרט') ||
      desc.includes('בידור') ||
      desc.includes('קולנוע') ||
      desc.includes('מסיבה') ||
      desc.includes('בילוי') ||
      desc.includes('אטרקציה') ||
      desc.includes('לונה פארק') ||
      desc.includes('חדר בריחה') ||
      desc.includes('מועדון') ||
      desc.includes('ליין')
    )
      return 'מותרות';

    if (
      desc.includes('דלק') ||
      desc.includes('תחבורה') ||
      desc.includes('פז') ||
      desc.includes('סונול') ||
      desc.includes('דור אלון') ||
      desc.includes('delek') ||
      desc.includes('פנגו') ||
      desc.includes('pango') ||
      desc.includes('סלופארק') ||
      desc.includes('מונית') ||
      desc.includes('גט ') ||
      desc.includes('gett') ||
      desc.includes('רכבת') ||
      desc.includes('אוטובוס')
    )
      return 'דלק/תחבורה';

    if (
      desc.includes('ספוטיפיי') ||
      desc.includes('spotify') ||
      desc.includes('אפל') ||
      desc.includes('apple') ||
      desc.includes('מנוי') ||
      desc.includes('אינטרנט') ||
      desc.includes('טלפון') ||
      desc.includes('הוסט') ||
      desc.includes('domain') ||
      desc.includes('נטפליקס') ||
      desc.includes('netflix') ||
      desc.includes('גוגל') ||
      desc.includes('google') ||
      desc.includes('icloud')
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
