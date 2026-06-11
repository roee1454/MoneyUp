import { Repository } from 'typeorm';
import { EXPENSE_CATEGORIES } from '@money-up/common';
import {
  ScanAccount,
  ScanIncomeResult,
  ScanTransaction,
  ScanDebugTrace,
} from '@money-up/types';
import { MerchantAnnotationEntity } from '../../entities/merchant-annotation.entity';
import { isWithinRange } from '../../utils/date.utils';
import {
  isCreditCompany,
  getCleanDescription,
  normalizeMerchantKey,
  buildTransactionDedupKey,
  extractLast4Digits,
} from './scans-description.helper';
import {
  categorizeExpense,
  isValidCategory,
  inferTags,
} from './scans-categorizer.helper';

/**
 * Returns the date boundaries for a selected tracking period.
 */
function getPeriodRange(
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

/**
 * Resolves the start and end Date objects for a query, prioritizing custom parameters.
 */
export function resolveDateRange(
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
  return getPeriodRange(period);
}

/**
 * Processes incoming transactions, aggregates values by category, checks for duplicate keys,
 * query db/cache for category overrides, and builds output scan results.
 */
export async function scanIncomeDeterministic(
  accounts: ScanAccount[],
  period: 'current' | 'previous' | 'both',
  startDate: string | undefined,
  endDate: string | undefined,
  debugEnabled: boolean,
  annotationRepository: Repository<MerchantAnnotationEntity>,
  annotationCache: Map<string, string>,
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
  const [periodStart, periodEnd] = resolveDateRange(
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
    const isCredit = isCreditCompany(account.bankId);
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
      const transactionKey = buildTransactionDedupKey(account, txn);
      const baseDebugTxn = debugTrace
        ? {
            bankId: String(account.bankId ?? ''),
            accountNumber: String(account.accountNumber ?? ''),
            transactionId: String(txn.id ?? ''),
            date: String(txn.date ?? ''),
            amount: Number(txn.chargedAmount),
            description:
              getCleanDescription(txn.description, txn.memo) ?? '',
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
        const merchantName = getCleanDescription(
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
        const normalizedMerchant = normalizeMerchantKey(merchantName);
        let category: (typeof EXPENSE_CATEGORIES)[number] | null =
          categorizeExpense(merchantName);
        let resolutionReason = category
          ? `Matched rule-based category: ${category}`
          : '';

        if (!category && normalizedMerchant) {
          const cached = annotationCache.get(normalizedMerchant);
          if (cached) {
            category = isValidCategory(cached) ? cached : 'לא מסווג';
            resolutionReason =
              category === 'לא מסווג'
                ? 'Merchant marked as uncategorized'
                : `Matched smart annotation: ${category}`;
          } else {
            const annotation = await annotationRepository.findOne({
              where: { normalizedMerchant },
            });
            if (annotation?.category) {
              annotationCache.set(normalizedMerchant, annotation.category);
              category = isValidCategory(annotation.category)
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
          cardLast4: extractLast4Digits(
            String(account.accountNumber ?? ''),
          ),
          merchant: merchantName,
          date: txn.date,
          amount: Math.abs(amount),
          reason: resolutionReason || `Category: ${finalCategory}`,
          confidence: category ? 0.9 : 0.5,
          tags: inferTags(merchantName, Math.abs(amount), txns),
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
        const cleaned = getCleanDescription(txn.description, txn.memo);
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
          tags: inferTags(merchantName, amount, txns),
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
