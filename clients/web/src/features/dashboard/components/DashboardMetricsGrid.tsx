import { useMemo } from 'react';
import { TrendDown, TrendUp, ArrowsDownUp, Wallet } from '@phosphor-icons/react';
import { DashboardMetricCard } from './DashboardMetricCard';
import type { SpendingScansResponse } from '@/hooks/useAi';
import type { BankAccount } from '@/hooks/useAccounts';
import { getBankName } from '@/lib/bank-branding';

interface DashboardMetricsGridProps {
  accounts: BankAccount[];
  scans: SpendingScansResponse | null | undefined;
  hasBankAccounts: boolean;
  hasCreditAccounts: boolean;
  isCreditExpensesLoading: boolean;
  isIncomeLoading: boolean;
  isNetSpendingLoading: boolean;
  isBalanceLoading: boolean;
  isSyncing?: boolean;
  excludedExpenseAmount: number;
  onShowIncomeClick: () => void;
}

function formatMoney(value: number): string {
  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
}

export function DashboardMetricsGrid({
  accounts,
  scans,
  hasBankAccounts,
  hasCreditAccounts,
  isCreditExpensesLoading,
  isIncomeLoading,
  isNetSpendingLoading,
  isBalanceLoading,
  isSyncing = false,
  excludedExpenseAmount,
  onShowIncomeClick,
}: DashboardMetricsGridProps) {
  const currentBankBalance = useMemo(() => {
    return accounts
      .filter((account) => !['max', 'isracard', 'cal'].includes(account.bankId))
      .reduce((sum, account) => sum + (Number(account.balance) || 0), 0);
  }, [accounts]);

  const recentIncomeTransactions = useMemo(() => {
    return accounts
      .filter((account) => !['max', 'isracard', 'cal'].includes(account.bankId))
      .flatMap((account) => {
        const accountLabel = `${getBankName(account.bankId)} • ${account.accountNumber}`;
        const accountKey = `${account.bankId}:${account.accountNumber}`;
        return (account.transactions ?? [])
          .map((txn) => {
            const amount = Number(txn.chargedAmount ?? txn.amount ?? 0);
            return {
              id: txn.id,
              accountKey,
              accountLabel,
              amount,
              date: txn.date,
              description: String(txn.description || txn.memo || 'הכנסה').trim(),
              isDuplicate: txn.isDuplicate,
            };
          })
          .filter(
            (txn) =>
              Number.isFinite(txn.amount) && txn.amount > 0 && !txn.isDuplicate,
          );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accounts]);

  const dashboardTotalIncome = useMemo(() => {
    return recentIncomeTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  }, [recentIncomeTransactions]);

  const adjustedTotalExpenses = Math.max(
    (scans?.totalExpenses ?? 0) - excludedExpenseAmount,
    0,
  );
  const netSpending = dashboardTotalIncome - adjustedTotalExpenses;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        title="סך הוצאות"
        value={`-${formatMoney(adjustedTotalExpenses)}`}
        caption="אשראי בלבד, לפי טווח התאריכים"
        icon={<TrendDown className="h-5 w-5" weight="duotone" />}
        tone="rose"
        isLoading={isCreditExpensesLoading || isSyncing}
        isLocked={!hasCreditAccounts}
        lockedLabel="נדרש חיבור לחברת אשראי"
        footer={
          <p className="text-[11px] font-bold text-muted-foreground">
            {hasCreditAccounts
              ? `${scans?.categories.length ?? 0} קטגוריות פעילות`
              : 'חבר חברת אשראי כדי לראות הוצאות'}
            {excludedExpenseAmount > 0
              ? ` • הוחרגו ${formatMoney(excludedExpenseAmount)}`
              : ''}
          </p>
        }
      />
      <DashboardMetricCard
        title="סך הכנסות"
        value={
          <span className="block translate-y-4">
            {formatMoney(dashboardTotalIncome)}
          </span>
        }
        caption="העברות, משכורות והפקדות"
        icon={<TrendUp className="h-5 w-5" weight="duotone" />}
        tone="emerald"
        isLoading={isIncomeLoading || isSyncing}
        isLocked={!hasBankAccounts}
        lockedLabel="נדרש חיבור לחשבון בנק"
        footer={
          <div className="flex flex-row justify-between items-end gap-2">
            <p className="text-[11px] font-bold text-muted-foreground">
              {hasBankAccounts
                ? `${recentIncomeTransactions.length.toLocaleString('he-IL')} תנועות בטווח`
                : 'יש לחבר חשבון בנק כדי לראות תנועות.'}
            </p>
            {hasBankAccounts ? (
              <button
                type="button"
                onClick={onShowIncomeClick}
                className="h-8 border border-emerald-500/20 bg-emerald-500/5 px-3 text-[11px] font-black text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
              >
                הצג הכנסות
              </button>
            ) : null}
          </div>
        }
      />
      <DashboardMetricCard
        title="סך תזרים"
        value={formatMoney(netSpending)}
        caption="הכנסות פחות הוצאות בטווח הנבחר"
        icon={<ArrowsDownUp className="h-5 w-5" weight="duotone" />}
        tone={netSpending < 0 ? 'rose' : 'emerald'}
        isLoading={isNetSpendingLoading || isSyncing}
        lockedLabel="נדרש חיבור לחשבון בנק"
        isLocked={!hasBankAccounts}
        footer={
          <p className="text-[11px] font-bold text-muted-foreground">
            {hasBankAccounts ? (
              <span>
                {netSpending < 0 ? 'הוצאה נטו' : 'יתרה חיובית בטווח'}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground">
                יש לחבר חשבון בנק כדי לראות תזרים כולל.
              </span>
            )}
          </p>
        }
      />
      <DashboardMetricCard
        title="יתרה כוללת"
        value={formatMoney(
          hasBankAccounts ? currentBankBalance : (scans?.totalBalance ?? 0),
        )}
        caption="יתרה עדכנית מחשבונות בנק בלבד"
        icon={<Wallet className="h-5 w-5" weight="duotone" />}
        tone="sky"
        isLoading={isBalanceLoading || isSyncing}
        isLocked={!hasBankAccounts}
        lockedLabel="נדרש חיבור לחשבון בנק"
        footer={
          <p className="text-[11px] font-bold text-muted-foreground">
            {hasBankAccounts ? (
              <span>לא מסונן לפי תאריך</span>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground">
                יש לחבר חשבון בנק כדי לראות יתרה עדכנית.
              </span>
            )}
          </p>
        }
      />
    </div>
  );
}
