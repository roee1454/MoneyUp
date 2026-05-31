import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
  isBankAccountBankId,
  isCreditCompanyBankId,
  useAccounts,
} from '@/hooks/useAccounts';
import { useUserProfile } from '@/hooks/useUsers';
import { useAnnotateSpendingScans, useSpendingScans } from '@/hooks/useAi';
import { useAppStore } from '@/store';

// Feature Components
import { DashboardMetricsGrid } from '@/features/dashboard/components/DashboardMetricsGrid';
import { IncomeTransactionsDialog } from '@/features/dashboard/components/IncomeTransactionsDialog';
import { DashboardRangeCard } from '@/features/dashboard/components/DashboardRangeCard';
import { SpendingCategories } from '@/features/dashboard/components/SpendingCategories';
import { getBankName } from '@/lib/bank-branding';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getCurrentRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const currentStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const currentEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return {
    startDate: toDateInputValue(currentStart),
    endDate: toDateInputValue(currentEnd),
  };
}

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

function subtractUtcDate(date: Date, amount: ScraperDateLimit): Date {
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

function getMinimumStartDateForBank(bankId: string, now = new Date()): string {
  const limit = SCRAPER_MIN_LOOKBACKS[String(bankId).toLowerCase()] ?? {
    years: 1,
  };
  return toDateInputValue(subtractUtcDate(now, limit));
}

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
    data: scans,
    isLoading: isLoadingScans,
    isFetching: isFetchingScans,
    refetch: refetchScans,
  } = useSpendingScans({ period: scanPeriod, startDate, endDate });

  const annotateMutation = useAnnotateSpendingScans();

  const isSyncing = syncState.status === 'running' || syncState.status === 'reconnecting';
  const isInitialLoad = isLoadingAccounts;
  const isAccountsRefreshing = isFetchingAccounts && !isInitialLoad;
  const isScansInitialLoading = isLoadingScans;
  const isScansRefreshing = isFetchingScans && !isLoadingScans;
  const maxEndDate = toDateInputValue(new Date());

  const minStartDate = useMemo(() => {
    const limits = accounts.map((account) => getMinimumStartDateForBank(account.bankId));
    return limits.length > 0 ? limits.sort().at(-1) : undefined;
  }, [accounts]);

  const isAnyActionBusy = isSyncing || isScansInitialLoading || isScansRefreshing || isWidgetBusy;

  // Range Sync
  useEffect(() => {
    setDashboardRange({ startDate: startDate || null, endDate: endDate || null });
  }, [startDate, endDate, setDashboardRange]);

  useEffect(() => {
    if (!startDate || !endDate || isFetchingAccounts || isFetchingScans || isSyncing) return;
    setDashboardRange({ committedStartDate: startDate, committedEndDate: endDate });
  }, [startDate, endDate, isFetchingAccounts, isFetchingScans, isSyncing, setDashboardRange]);

  useEffect(() => {
    if (syncState.status !== 'failed' || !dashboardRange.committedStartDate || !dashboardRange.committedEndDate) return;
    if (syncState.rangeStartDate === startDate && syncState.rangeEndDate === endDate && 
       (startDate !== dashboardRange.committedStartDate || endDate !== dashboardRange.committedEndDate)) {
      setStartDate(dashboardRange.committedStartDate);
      setEndDate(dashboardRange.committedEndDate);
    }
  }, [syncState.status, syncState.rangeStartDate, syncState.rangeEndDate, startDate, endDate, dashboardRange.committedStartDate, dashboardRange.committedEndDate]);

  useEffect(() => {
    if (syncState.status === 'done' || syncState.status === 'failed') {
      void refetchScans();
      void refetch();
    }
  }, [refetch, refetchScans, syncState.status]);

  async function handleAnnotateWithAi() {
    setIsWidgetBusy(true);
    try {
      await annotateMutation.mutateAsync({ period: scanPeriod, startDate, endDate });
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

  const hasCreditAccounts = accounts.some((account) => isCreditCompanyBankId(account.bankId));
  const hasBankAccounts = accounts.some((account) => isBankAccountBankId(account.bankId));
  const hasAiProvider = !!userProfile?.activeAiProvider;

  return (
    <section className="space-y-7 py-8" dir="rtl">
      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-stretch">
        <div className="relative overflow-hidden border border-border bg-linear-to-br from-background via-muted/20 to-muted/40 p-6 shadow-sm">
          <div className="absolute -left-16 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">דשבורד MoneyUp</p>
            <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
              {greeting}, <span className="text-muted-foreground">{session?.username}</span>
            </h1>
            {!isInitialLoad && accounts.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <p className="text-sm font-semibold leading-relaxed text-muted-foreground">חבר מקור נתונים כדי להתחיל.</p>
                <Link to="/settings" className="shrink-0 border border-border bg-card/80 px-4 py-1.5 text-xs font-black text-foreground transition-colors hover:border-primary/50 hover:text-primary">עבור להגדרות ←</Link>
              </div>
            ) : (
              <p className="max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">הוצאות מגיעות מכרטיסי אשראי. הכנסות ויתרה מגיעות מחשבונות בנק. טווח התאריכים משותף לכל הדשבורד.</p>
            )}
          </div>
        </div>

        <DashboardRangeCard
          startDate={startDate}
          endDate={endDate}
          minStartDate={minStartDate}
          maxEndDate={maxEndDate}
          isBusy={isAnyActionBusy}
          isLocked={!isInitialLoad && accounts.length === 0}
          onStartDateChange={(v) => {
            const clamped = minStartDate && v < minStartDate ? minStartDate : v;
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
      </div>

      <DashboardMetricsGrid
        accounts={accounts}
        scans={scans}
        hasBankAccounts={hasBankAccounts}
        hasCreditAccounts={hasCreditAccounts}
        isCreditExpensesLoading={hasCreditAccounts && (isScansInitialLoading || !scans)}
        isIncomeLoading={hasBankAccounts && (isInitialLoad || isAccountsRefreshing || !accounts.length)}
        isNetSpendingLoading={(hasCreditAccounts && (isScansInitialLoading || !scans)) || (hasBankAccounts && (isInitialLoad || isAccountsRefreshing || !accounts.length))}
        isBalanceLoading={hasBankAccounts && (isInitialLoad || isAccountsRefreshing || !accounts.length)}
        isSyncing={isSyncing}
        excludedExpenseAmount={excludedExpenseAmount}
        onShowIncomeClick={() => setIsIncomeDialogOpen(true)}
      />

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
        isRefreshingScans={hasCreditAccounts && isFetchingScans && !isLoadingScans}
        hasConnectedAccounts={hasCreditAccounts}
        canUseAiAnnotation={hasAiProvider}
        isAnnotatingWithAi={annotateMutation.isPending}
        isWidgetBusy={isAnyActionBusy}
        onAnnotateWithAi={handleAnnotateWithAi}
        onGoToAiStudio={() => navigate({ to: '/ai-studio' })}
        onExcludedExpensesChange={setExcludedExpenseAmount}
      />

      <IncomeTransactionsDialog
        open={isIncomeDialogOpen}
        onOpenChange={setIsIncomeDialogOpen}
        transactions={recentIncomeTransactions}
      />
    </section>
  );
}
