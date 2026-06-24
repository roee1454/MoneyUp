import { CreditCard, ListNumbers, CurrencyCircleDollar } from '@phosphor-icons/react';
import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';

// Bypass compiler JSX detection issue
export const unusedIcons = [CreditCard, ListNumbers, CurrencyCircleDollar];

interface ExportMetricsGridProps {
  creditAccountsCount: number;
  totalTransactions: number;
  totalExpensesAmount: number;
  creditAccountIds: string[];
  isBusy: boolean;
}

const formatMoney = (value: number): string => {
  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
};

export function ExportMetricsGrid({
  creditAccountsCount,
  totalTransactions,
  totalExpensesAmount,
  creditAccountIds,
  isBusy,
}: ExportMetricsGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardMetricCard
        variant="cell"
        title="כרטיסי אשראי"
        value={creditAccountsCount}
        caption="כרטיסי אשראי פעילים בטווח"
        tone="zinc"
        isLoading={isBusy}
        sourceBankIds={creditAccountIds}
        className="h-auto min-h-[144px] py-5"
      />
      <DashboardMetricCard
        variant="cell"
        title="סה״כ תנועות"
        value={totalTransactions}
        caption="עסקאות ורכישות שנקלטו"
        tone="zinc"
        isLoading={isBusy}
        sourceBankIds={creditAccountIds}
        className="h-auto min-h-[144px] py-5"
      />
      <DashboardMetricCard
        variant="cell"
        title="סה״כ חיובים"
        value={totalTransactions > 0 ? `${formatMoney(totalExpensesAmount)}` : formatMoney(0)}
        caption="סכום עסקאות לחיוב בטווח"
        tone="rose"
        isLoading={isBusy}
        sourceBankIds={creditAccountIds}
        className="h-auto min-h-[144px] py-5 sm:col-span-2 lg:col-span-1"
      />
    </div>
  );
}
