import { useEffect, useMemo, useState } from 'react';
import {
  ArrowsDownUp,
  TrendDown,
  TrendUp,
  Wallet,
} from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  isBankAccountBankId,
  isCreditCompanyBankId,
  useAccounts,
} from '@/hooks/useAccounts';
import { SpendingCategories } from '@/components/SpendingCategories';
import { useUserProfile } from '@/hooks/useUsers';
import { useAnnotateSpendingScans, useSpendingScans } from '@/hooks/useAi';
import { useAppStore } from '@/store';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DashboardRangeCard } from '@/components/dashboard/DashboardRangeCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getBankName } from '@/lib/bank-branding';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function formatMoney(value: number): string {
  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const syncState = useAppStore((s) => s.sync);
  const dashboardRange = useAppStore((s) => s.dashboardRange);
  const setDashboardRange = useAppStore((s) => s.setDashboardRange);
  const [greeting, setGreeting] = useState('');
  const [scanPeriod] = useState<'current' | 'previous' | 'both'>('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isWidgetBusy, setIsWidgetBusy] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [excludedExpenseAmount, setExcludedExpenseAmount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('בוקר טוב');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('צהריים טובים');
    } else if (hour >= 18 && hour < 22) {
      setGreeting('ערב טוב');
    } else {
      setGreeting('לילה טוב');
    }
  }, []);

  useEffect(() => {
    const range =
      dashboardRange.startDate && dashboardRange.endDate
        ? {
            startDate: dashboardRange.startDate,
            endDate: dashboardRange.endDate,
          }
        : getCurrentRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setDashboardRange({
      startDate: range.startDate,
      endDate: range.endDate,
      committedStartDate: dashboardRange.committedStartDate ?? range.startDate,
      committedEndDate: dashboardRange.committedEndDate ?? range.endDate,
    });
  }, [
    dashboardRange.committedEndDate,
    dashboardRange.committedStartDate,
    dashboardRange.endDate,
    dashboardRange.startDate,
    setDashboardRange,
  ]);

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    isFetching: isFetchingAccounts,
    refetch,
  } = useAccounts({ startDate, endDate });
  const { data: userProfile } = useUserProfile(session?.userId);
  const hasCreditAccounts = accounts.some((account) =>
    isCreditCompanyBankId(account.bankId),
  );
  const hasBankAccounts = accounts.some((account) =>
    isBankAccountBankId(account.bankId),
  );
  const hasAiProvider = !!userProfile?.activeAiProvider;
  const {
    data: scans,
    isLoading: isLoadingScans,
    isFetching: isFetchingScans,
    refetch: refetchScans,
  } = useSpendingScans({
    period: scanPeriod,
    startDate,
    endDate,
  });
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
    return limits.length > 0 ? limits.sort().at(-1) : undefined;
  }, [accounts]);
  const isAnyActionBusy =
    isSyncing || isScansInitialLoading || isScansRefreshing || isWidgetBusy;

  useEffect(() => {
    setDashboardRange({
      startDate: startDate || null,
      endDate: endDate || null,
    });
  }, [endDate, setDashboardRange, startDate]);

  useEffect(() => {
    if (syncState.status !== 'done') return;
    if (
      syncState.rangeStartDate !== startDate ||
      syncState.rangeEndDate !== endDate
    ) {
      return;
    }
    setDashboardRange({
      committedStartDate: startDate || null,
      committedEndDate: endDate || null,
    });
  }, [
    endDate,
    setDashboardRange,
    startDate,
    syncState.rangeEndDate,
    syncState.rangeStartDate,
    syncState.status,
  ]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (
      dashboardRange.committedStartDate === startDate &&
      dashboardRange.committedEndDate === endDate
    ) {
      return;
    }
    if (isFetchingAccounts || isFetchingScans) return;
    if (
      (syncState.status === 'running' || syncState.status === 'reconnecting') &&
      syncState.rangeStartDate === startDate &&
      syncState.rangeEndDate === endDate
    ) {
      return;
    }
    if (
      syncState.status === 'failed' &&
      syncState.rangeStartDate === startDate &&
      syncState.rangeEndDate === endDate
    ) {
      return;
    }

    setDashboardRange({
      committedStartDate: startDate,
      committedEndDate: endDate,
    });
  }, [
    dashboardRange.committedEndDate,
    dashboardRange.committedStartDate,
    endDate,
    isFetchingAccounts,
    isFetchingScans,
    setDashboardRange,
    startDate,
    syncState.rangeEndDate,
    syncState.rangeStartDate,
    syncState.status,
  ]);

  useEffect(() => {
    if (syncState.status !== 'failed') return;
    if (
      syncState.rangeStartDate !== startDate ||
      syncState.rangeEndDate !== endDate
    ) {
      return;
    }
    if (
      !dashboardRange.committedStartDate ||
      !dashboardRange.committedEndDate ||
      (dashboardRange.committedStartDate === startDate &&
        dashboardRange.committedEndDate === endDate)
    ) {
      return;
    }

    setStartDate(dashboardRange.committedStartDate);
    setEndDate(dashboardRange.committedEndDate);
    setDashboardRange({
      startDate: dashboardRange.committedStartDate,
      endDate: dashboardRange.committedEndDate,
    });
  }, [
    dashboardRange.committedEndDate,
    dashboardRange.committedStartDate,
    endDate,
    setDashboardRange,
    startDate,
    syncState.rangeEndDate,
    syncState.rangeStartDate,
    syncState.status,
  ]);

  const currentBankBalance = useMemo(() => {
    return accounts
      .filter((account) => isBankAccountBankId(account.bankId))
      .reduce((sum, account) => sum + (Number(account.balance) || 0), 0);
  }, [accounts]);
  const isCreditExpensesLoading =
    hasCreditAccounts && (isScansInitialLoading || !scans);
  const isIncomeLoading =
    hasBankAccounts &&
    (isInitialLoad || isAccountsRefreshing || !accounts.length);
  const isNetSpendingLoading =
    (hasCreditAccounts && (isScansInitialLoading || !scans)) ||
    (hasBankAccounts &&
      (isInitialLoad || isAccountsRefreshing || !accounts.length));
  const isBalanceLoading =
    hasBankAccounts &&
    (isInitialLoad || isAccountsRefreshing || !accounts.length);

  const recentIncomeTransactions = useMemo(() => {
    return accounts
      .filter((account) => isBankAccountBankId(account.bankId))
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
            };
          })
          .filter((txn) => Number.isFinite(txn.amount) && txn.amount > 0);
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

  function handleStartDateChange(value: string) {
    const clamped = minStartDate && value < minStartDate ? minStartDate : value;
    if (clamped === startDate) return;
    setStartDate(clamped);
    if (endDate && clamped > endDate) {
      setEndDate(clamped);
    }
  }

  function handleEndDateChange(value: string) {
    let clamped = value > maxEndDate ? maxEndDate : value;
    if (startDate && clamped < startDate) {
      clamped = startDate;
    }
    if (clamped === endDate) return;
    setEndDate(clamped);
  }

  useEffect(() => {
    if (!minStartDate || !startDate || startDate >= minStartDate) return;
    setStartDate(minStartDate);
    if (endDate && endDate < minStartDate) {
      setEndDate(minStartDate);
    }
  }, [endDate, minStartDate, startDate]);

  useEffect(() => {
    if (syncState.status === 'done' || syncState.status === 'failed') {
      void refetchScans();
      void refetch();
    }
  }, [refetch, refetchScans, syncState.status]);

  async function handleAnnotateWithAi() {
    setIsWidgetBusy(true);
    try {
      await annotateMutation.mutateAsync({
        period: scanPeriod,
        startDate,
        endDate,
      });
      await refetchScans();
    } finally {
      setIsWidgetBusy(false);
    }
  }

  const hasAccounts = accounts.length > 0;

  return (
    <section className="space-y-7 py-8" dir="rtl">
      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-stretch">
        <div className="relative overflow-hidden border border-border bg-linear-to-br from-background via-muted/20 to-muted/40 p-6 shadow-sm">
          <div className="absolute -left-16 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative z-10 space-y-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
              דשבורד MoneyUp
            </p>
            <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
              {greeting},{' '}
              <span className="text-muted-foreground">{session?.username}</span>
            </h1>
            {!isInitialLoad && !hasAccounts ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <p className="text-sm font-semibold leading-relaxed text-muted-foreground">
                  חבר מקור נתונים כדי להתחיל.
                </p>
                <Link
                  to="/settings"
                  className="shrink-0 border border-border bg-card/80 px-4 py-1.5 text-xs font-black text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  עבור להגדרות ←
                </Link>
              </div>
            ) : (
              <p className="max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
                הוצאות מגיעות מכרטיסי אשראי. הכנסות ויתרה מגיעות מחשבונות בנק.
                טווח התאריכים משותף לכל הדשבורד.
              </p>
            )}
          </div>
        </div>

        <DashboardRangeCard
          startDate={startDate}
          endDate={endDate}
          minStartDate={minStartDate}
          maxEndDate={maxEndDate}
          isBusy={isAnyActionBusy}
          isLocked={!isInitialLoad && !hasAccounts}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="סך הוצאות"
          value={`-${formatMoney(adjustedTotalExpenses)}`}
          caption="אשראי בלבד, לפי טווח התאריכים"
          icon={<TrendDown className="h-5 w-5" weight="duotone" />}
          tone="rose"
          isLoading={isCreditExpensesLoading}
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
          isLoading={isIncomeLoading}
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
                  onClick={() => setIsIncomeDialogOpen(true)}
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
          isLoading={isNetSpendingLoading}
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
          isLoading={isBalanceLoading}
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

      <div>
        <SpendingCategories
          scans={scans}
          period={scanPeriod}
          startDate={startDate}
          endDate={endDate}
          minStartDate={minStartDate}
          maxEndDate={maxEndDate}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          isLoadingScans={hasCreditAccounts && isLoadingScans}
          isRefreshingScans={
            hasCreditAccounts && isFetchingScans && !isLoadingScans
          }
          hasConnectedAccounts={hasCreditAccounts}
          canUseAiAnnotation={hasAiProvider}
          isAnnotatingWithAi={annotateMutation.isPending}
          isWidgetBusy={isAnyActionBusy}
          onAnnotateWithAi={handleAnnotateWithAi}
          onGoToAiStudio={() => navigate({ to: '/ai-studio' })}
          onExcludedExpensesChange={setExcludedExpenseAmount}
        />
      </div>

      <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
        <DialogContent
          className="max-w-2xl rounded-none border border-border bg-card p-5 shadow-2xl"
          dir="rtl"
        >
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-xl font-black text-foreground">
              הכנסות אחרונות
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              תנועות חיוביות מחשבונות בנק בטווח התאריכים הנבחר
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-112 space-y-2 overflow-y-auto pr-1">
            {recentIncomeTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-muted-foreground">
                  אין הכנסות בטווח התאריכים הנבחר
                </p>
              </div>
            ) : (
              recentIncomeTransactions.map((txn, index) => (
                <div
                  key={`${txn.accountKey}:${txn.id || txn.date}:${index}`}
                  className="flex items-start justify-between gap-4 border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0 text-right">
                    <p className="truncate text-sm font-black text-foreground">
                      {txn.description}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {txn.date
                        ? new Date(txn.date).toLocaleDateString('he-IL')
                        : '-'}{' '}
                      • {txn.accountLabel}
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-sm font-black text-emerald-600 dark:text-emerald-400"
                    dir="ltr"
                  >
                    {formatMoney(txn.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
