import { useMemo } from 'react';
import { DashboardMetricCard } from './DashboardMetricCard';
import type { SpendingScansResponse } from '@/hooks/useAi';
import type { BankAccount } from '@/hooks/useAccounts';
import { getBankName } from '@money-up/common';

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
              description: String(
                txn.description || txn.memo || 'הכנסה',
              ).trim(),
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

  const bankAccountIds = useMemo(() => {
    const ids = accounts
      .filter((account) => !['max', 'isracard', 'cal'].includes(account.bankId))
      .map((a) => a.bankId);
    return [...new Set(ids)];
  }, [accounts]);

  const creditAccountIds = useMemo(() => {
    const ids = accounts
      .filter((account) => ['max', 'isracard', 'cal'].includes(account.bankId))
      .map((a) => a.bankId);
    return [...new Set(ids)];
  }, [accounts]);

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 select-none">
      <DashboardMetricCard
        variant="cell"
        title="יתרה כוללת זמינה"
        value={formatMoney(
          hasBankAccounts ? currentBankBalance : (scans?.totalBalance ?? 0),
        )}
        caption="סיכום עו״ש בלבד"
        tone="zinc"
        isLoading={isBalanceLoading || isSyncing}
        isLocked={!hasBankAccounts}
        lockedLabel="נדרש חיבור לחשבון בנק"
        sourceBankIds={bankAccountIds}
      />

      <DashboardMetricCard
        variant="cell"
        title="סך הוצאות"
        value={`-${formatMoney(adjustedTotalExpenses)}`}
        tone="rose"
        isLoading={isCreditExpensesLoading || isSyncing}
        isLocked={!hasCreditAccounts}
        lockedLabel="נדרש חיבור לכרטיס אשראי"
        sourceBankIds={creditAccountIds}
        footer={
          hasCreditAccounts ? (
            <span>{scans?.categories.length ?? 0} קטגוריות פעילות</span>
          ) : null
        }
      />

      <DashboardMetricCard
        variant="cell"
        title="סך הכנסות"
        value={formatMoney(dashboardTotalIncome)}
        tone="emerald"
        isLoading={isIncomeLoading || isSyncing}
        isLocked={!hasBankAccounts}
        lockedLabel="נדרש חיבור לחשבון בנק"
        sourceBankIds={bankAccountIds}
        footer={
          hasBankAccounts ? (
            <button
              type="button"
              onClick={onShowIncomeClick}
              className="hover:text-primary transition-colors underline underline-offset-2 cursor-pointer"
            >
              פירוט הכנסות ←
            </button>
          ) : null
        }
      />

      <DashboardMetricCard
        variant="cell"
        title="תזרים נטו"
        value={formatMoney(netSpending)}
        tone={netSpending < 0 ? 'rose' : 'emerald'}
        isLoading={isNetSpendingLoading || isSyncing}
        isLocked={!hasBankAccounts}
        lockedLabel="נדרש חיבור לחשבון בנק"
        sourceBankIds={[...new Set([...bankAccountIds, ...creditAccountIds])]}
        footer={
          hasBankAccounts ? (
            <span>{netSpending < 0 ? 'גרעון בטווח' : 'עודף בטווח'}</span>
          ) : null
        }
      />
    </div>
  );
}
