import { useFormatMoney } from '@/hooks/useFormatMoney';
import { CreditCard, ListNumbers, CurrencyCircleDollar } from '@phosphor-icons/react';
import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';

// Bypass compiler JSX detection issue
export const unusedIcons = [CreditCard, ListNumbers, CurrencyCircleDollar];

interface ExportMetricsGridProps {
  totalExpensesAmount: number;
  totalIncomesAmount: number;
  creditAccountIds: string[];
  bankAccountIds: string[];
  isBusy: boolean;
}

export function ExportMetricsGrid({
  totalExpensesAmount,
  totalIncomesAmount,
  creditAccountIds,
  bankAccountIds,
  isBusy,
}: ExportMetricsGridProps) {
  const formatMoney = useFormatMoney();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      <DashboardMetricCard
        variant="cell"
        title="סה״כ חיובים"
        value={totalExpensesAmount > 0 ? `-${formatMoney(totalExpensesAmount)}` : formatMoney(0)}
        caption="סכום עסקאות לחיוב בטווח"
        tone="rose"
        isLoading={isBusy}
        sourceBankIds={creditAccountIds}
        className="h-auto min-h-[144px] py-5"
      />
      <DashboardMetricCard
        variant="cell"
        title="סה״כ הכנסות"
        value={totalIncomesAmount > 0 ? `+${formatMoney(totalIncomesAmount)}` : formatMoney(0)}
        caption="סכום הכנסות מהבנק בטווח"
        tone="emerald"
        isLoading={isBusy}
        sourceBankIds={bankAccountIds}
        className="h-auto min-h-[144px] py-5"
      />
    </div>
  );
}
