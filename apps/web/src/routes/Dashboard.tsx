import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  isBankAccountBankId,
  isCreditCompanyBankId,
  useAccounts,
} from '@/hooks/useAccounts';
import { useUserProfile } from '@/hooks/useUsers';
import { useAnnotateSpendingScans, useSpendingScans } from '@/hooks/useAi';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { PremiumCard } from '@/components/ui/premium-card';
import { ArrowLeft } from '@phosphor-icons/react';


// Feature Components
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardRangePicker } from '@/features/dashboard/components/DashboardRangePicker';
import { DashboardMetricsGrid } from '@/features/dashboard/components/DashboardMetricsGrid';
import { IncomeTransactionsSheet } from '@/features/dashboard/components/IncomeTransactionsSheet';
import { SpendingCategories } from '@/features/dashboard/components/SpendingCategories';
import {
  getBankName,
  getCurrentRange,
  getMinimumStartDateForBank,
  toDateInputValue,
} from '@money-up/common';

export default function Dashboard() {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const syncState = useAppStore((s) => s.sync);
  const dashboardRange = useAppStore((s) => s.dashboardRange);
  const setDashboardRange = useAppStore((s) => s.setDashboardRange);

  const [greeting, setGreeting] = useState('');
  const [scanPeriod] = useState<'current' | 'previous' | 'both'>('current');
  const [startDate, setStartDate] = useState(() => {
    return dashboardRange.startDate ?? getCurrentRange().startDate;
  });
  const [endDate, setEndDate] = useState(() => {
    return dashboardRange.endDate ?? getCurrentRange().endDate;
  });
  const [isWidgetBusy, setIsWidgetBusy] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [excludedExpenseAmount, setExcludedExpenseAmount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('בוקר טוב');
    else if (hour >= 12 && hour < 18) setGreeting('צהריים טובים');
    else if (hour >= 18 && hour < 22) setGreeting('ערב טוב');
    else setGreeting('לילה טוב');
  }, []);

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    isFetching: isFetchingAccounts,
    refetch,
  } = useAccounts({ startDate, endDate });

  const { data: userProfile } = useUserProfile(session?.userId);
  const {
    data: rawScans,
    isLoading: isLoadingScans,
    isFetching: isFetchingScans,
    refetch: refetchScans,
  } = useSpendingScans({ period: scanPeriod, startDate, endDate });

  const scans = useMemo(() => {
    if (!rawScans) return rawScans;

    const categoryTransactions: Record<string, any[]> = {};
    const categories: any[] = [];
    let totalExpenses = 0;

    for (const catName in rawScans.categoryTransactions) {
      const txns = rawScans.categoryTransactions[catName].filter((t) =>
        isCreditCompanyBankId(t.bankId),
      );
      if (txns.length > 0) {
        const catAmount = txns.reduce((sum, t) => sum + t.amount, 0);
        categoryTransactions[catName] = txns;
        totalExpenses += catAmount;

        const originalCat = rawScans.categories.find((c) => c.name === catName);
        if (originalCat) {
          categories.push({
            ...originalCat,
            amount: catAmount,
            count: txns.length,
          });
        }
      }
    }

    categories.sort((a, b) => b.amount - a.amount);

    return {
      ...rawScans,
      totalExpenses,
      categories,
      categoryTransactions,
    };
  }, [rawScans]);

  const annotateMutation = useAnnotateSpendingScans();

  const isSyncing =
    syncState.status === 'running' || syncState.status === 'reconnecting';
  const isInitialLoad = isLoadingAccounts;
  const isAccountsRefreshing = isFetchingAccounts && !isInitialLoad;
  const isScansInitialLoading = isLoadingScans;
  const isScansRefreshing = isFetchingScans && !isLoadingScans;
  const maxEndDate = toDateInputValue(new Date());

  const minStartDate = useMemo(() => {
    const limits = accounts.map((account) =>
      getMinimumStartDateForBank(account.bankId),
    );
    return limits.length > 0 ? limits.sort().at(0) : undefined;
  }, [accounts]);

  const isAnyActionBusy =
    isSyncing || isScansInitialLoading || isScansRefreshing || isWidgetBusy;

  // Range Sync
  useEffect(() => {
    setDashboardRange({
      startDate: startDate || null,
      endDate: endDate || null,
    });
  }, [startDate, endDate, setDashboardRange]);

  useEffect(() => {
    if (
      !startDate ||
      !endDate ||
      isFetchingAccounts ||
      isFetchingScans ||
      isSyncing
    )
      return;
    setDashboardRange({
      committedStartDate: startDate,
      committedEndDate: endDate,
    });
  }, [
    startDate,
    endDate,
    isFetchingAccounts,
    isFetchingScans,
    isSyncing,
    setDashboardRange,
  ]);

  useEffect(() => {
    if (
      syncState.status !== 'failed' ||
      !dashboardRange.committedStartDate ||
      !dashboardRange.committedEndDate
    )
      return;
    if (
      syncState.rangeStartDate === startDate &&
      syncState.rangeEndDate === endDate &&
      (startDate !== dashboardRange.committedStartDate ||
        endDate !== dashboardRange.committedEndDate)
    ) {
      setStartDate(dashboardRange.committedStartDate);
      setEndDate(dashboardRange.committedEndDate);
    }
  }, [
    syncState.status,
    syncState.rangeStartDate,
    syncState.rangeEndDate,
    startDate,
    endDate,
    dashboardRange.committedStartDate,
    dashboardRange.committedEndDate,
  ]);

  useEffect(() => {
    if (syncState.status === 'done' || syncState.status === 'failed') {
      void refetchScans();
      void refetch();
    }
  }, [refetch, refetchScans, syncState.status]);

  async function handleAnnotateWithAi(provider?: 'openai' | 'claude' | 'gemini', model?: string) {
    setIsWidgetBusy(true);
    try {
      await annotateMutation.mutateAsync({
        period: scanPeriod,
        startDate,
        endDate,
        provider,
        model,
      });
      await refetchScans();
    } finally {
      setIsWidgetBusy(false);
    }
  }

  const recentIncomeTransactions = useMemo(() => {
    return accounts
      .filter((account) => isBankAccountBankId(account.bankId))
      .flatMap((account) => {
        const accountLabel = `${getBankName(account.bankId)} • ${account.accountNumber}`;
        const accountKey = `${account.bankId}:${account.accountNumber}`;
        return (account.transactions ?? [])
          .map((txn) => ({
            id: txn.id,
            bankId: account.bankId,
            accountNumber: account.accountNumber,
            accountKey,
            accountLabel,
            amount: Number(txn.chargedAmount ?? txn.amount ?? 0),
            date: txn.date,
            description: String(txn.description || txn.memo || 'הכנסה').trim(),
            isDuplicate: txn.isDuplicate,
          }))
          .filter((txn) => Number.isFinite(txn.amount) && txn.amount > 0);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accounts]);

  const hasCreditAccounts = accounts.some((account) =>
    isCreditCompanyBankId(account.bankId),
  );
  const hasBankAccounts = accounts.some((account) =>
    isBankAccountBankId(account.bankId),
  );
  const hasAiProvider = (userProfile?.configuredProviders ?? []).length > 0;

  const isCreditExpensesLoading =
    hasCreditAccounts && (isScansInitialLoading || !scans);
  const isIncomeLoading =
    hasBankAccounts &&
    (isInitialLoad || isAccountsRefreshing || !accounts.length);
  const isNetSpendingLoading = isCreditExpensesLoading || isIncomeLoading;
  const isBalanceLoading = isIncomeLoading;

  return (
    <section className="space-y-7 py-8" dir="rtl">
      <DashboardHeader
        greeting={greeting}
        username={session?.username}
        controls={
          <DashboardRangePicker
            startDate={startDate}
            endDate={endDate}
            minStartDate={minStartDate}
            maxEndDate={maxEndDate}
            isBusy={isAnyActionBusy}
            isLocked={!isInitialLoad && accounts.length === 0}
            onStartDateChange={(v) => {
              const clamped =
                minStartDate && v < minStartDate ? minStartDate : v;
              if (clamped !== startDate) {
                setStartDate(clamped);
                if (endDate && clamped > endDate) setEndDate(clamped);
              }
            }}
            onEndDateChange={(v) => {
              let clamped = v > maxEndDate ? maxEndDate : v;
              if (startDate && clamped < startDate) clamped = startDate;
              if (clamped !== endDate) setEndDate(clamped);
            }}
          />
        }
      />

      {accounts.length === 0 && !isLoadingAccounts && (
        <PremiumCard className="relative border border-dashed border-primary/40 bg-linear-to-br from-primary/5 via-background to-muted/20 p-6 md:p-8 text-right space-y-4 animate-in fade-in-50 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                <span>🚀 ברוך הבא ל-MoneyUp!</span>
              </h3>
              <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-2xl">
                כדי שנוכל להתחיל לנתח את ההוצאות שלך, להפיק דוחות חכמים ולהפעיל את סוכן ה-AI,
                עליך לחבר תחילה את חשבון הבנק או כרטיס האשראי שלך.
              </p>
            </div>
            <div className="shrink-0">
              <Button
                onClick={() => navigate({ to: '/settings' })}
                className="rounded-none font-black text-xs h-11 bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <span>חבר חשבון ראשון</span>
                <ArrowLeft className="h-4 w-4" weight="bold" />
              </Button>
            </div>
          </div>
        </PremiumCard>
      )}

      <DashboardMetricsGrid
        accounts={accounts}
        scans={scans}
        hasBankAccounts={hasBankAccounts}
        hasCreditAccounts={hasCreditAccounts}
        isCreditExpensesLoading={isCreditExpensesLoading}
        isIncomeLoading={isIncomeLoading}
        isNetSpendingLoading={isNetSpendingLoading}
        isBalanceLoading={isBalanceLoading}
        isSyncing={isSyncing}
        excludedExpenseAmount={excludedExpenseAmount}
        onShowIncomeClick={() => setIsIncomeDialogOpen(true)}
      />

      <div className="space-y-8">
        <SpendingCategories
          scans={scans}
          period={scanPeriod}
          startDate={startDate}
          endDate={endDate}
          minStartDate={minStartDate}
          maxEndDate={maxEndDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          isLoadingScans={hasCreditAccounts && isLoadingScans}
          isRefreshingScans={
            hasCreditAccounts && isFetchingScans && !isLoadingScans
          }
          hasConnectedAccounts={hasCreditAccounts}
          canUseAiAnnotation={hasAiProvider}
          configuredProviders={(userProfile?.configuredProviders ?? []) as string[]}
          isAnnotatingWithAi={annotateMutation.isPending}
          isWidgetBusy={isAnyActionBusy}
          onAnnotateWithAi={handleAnnotateWithAi}
          onGoToAiStudio={() => navigate({ to: '/ai-studio' })}
          onExcludedExpensesChange={setExcludedExpenseAmount}
        />
      </div>

      <IncomeTransactionsSheet
        open={isIncomeDialogOpen}
        onOpenChange={setIsIncomeDialogOpen}
        transactions={recentIncomeTransactions}
        isLoading={isIncomeLoading}
      />
    </section>
  );
}