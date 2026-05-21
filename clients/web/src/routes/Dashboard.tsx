import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleNotch, CreditCard } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import { AddBankAccountDialog } from '@/components/AddBankAccountDialog';
import { isCreditCompanyBankId, useAccounts, useSyncAccounts } from '@/hooks/useAccounts';
import { AccountStrip } from '@/components/AccountStrip';
import { SpendingCategories } from '@/components/SpendingCategories';
import { useUserProfile } from '@/hooks/useUsers';
import { useSpendingScans, useSpendingScansDebug, useAnnotateSpendingScans } from '@/hooks/useAi';
import { PremiumCard } from '@/components/ui/premium-card';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getOneMonthAgoUtc(date: Date): Date {
  const targetMonth = date.getUTCMonth() - 1;
  const firstOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonth, 1),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      targetDay,
    ),
  );
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

function getRangeFromPeriod(period: 'current' | 'previous' | 'both'): { startDate: string; endDate: string } {
  const now = new Date();
  const currentStart = getOneMonthAgoUtc(now);
  const currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));

  if (period === 'previous') {
    return { startDate: toDateInputValue(previousStart), endDate: toDateInputValue(previousEnd) };
  }
  if (period === 'both') {
    return { startDate: toDateInputValue(previousStart), endDate: toDateInputValue(currentEnd) };
  }
  return { startDate: toDateInputValue(currentStart), endDate: toDateInputValue(currentEnd) };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAppStore((s) => s.session);
  const syncState = useAppStore((s) => s.sync);
  const [greeting, setGreeting] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDebugPipeline, setShowDebugPipeline] = useState(false);
  const [debugStatusFilter, setDebugStatusFilter] = useState<string[]>([]);
  const [debugFromDate, setDebugFromDate] = useState('');
  const [debugToDate, setDebugToDate] = useState('');
  const [scanPeriod] = useState<'current' | 'previous' | 'both'>('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isWidgetBusy, setIsWidgetBusy] = useState(false);

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
    const range = getRangeFromPeriod('current');
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    isFetching: isFetchingAccounts,
    refetch,
  } = useAccounts();
  const { data: userProfile } = useUserProfile(session?.userId);
  const hasCreditAccounts = accounts.some((account) => isCreditCompanyBankId(account.bankId));
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
  const { data: debugScans, isLoading: isLoadingDebugScans } = useSpendingScansDebug(
    {
      period: scanPeriod,
      startDate,
      endDate,
    },
    showDebugPipeline && hasAiProvider && hasCreditAccounts,
  );
  const syncMutation = useSyncAccounts();
  const isSyncing = syncState.status === 'running' || syncState.status === 'reconnecting';
  const annotateMutation = useAnnotateSpendingScans();
  const isInitialLoad = isLoadingAccounts;
  const isAccountsRefreshing = isFetchingAccounts && !isInitialLoad;
  const isScansInitialLoading = hasCreditAccounts && isLoadingScans;
  const isScansRefreshing = hasCreditAccounts && isFetchingScans && !isLoadingScans;
  const maxEndDate = toDateInputValue(new Date());
  const minStartDate = useMemo(() => {
    const limits = accounts.map((account) =>
      getMinimumStartDateForBank(account.bankId),
    );
    return limits.length > 0 ? limits.sort().at(-1) : undefined;
  }, [accounts]);
  
  // Consolidate busy state for the entire widget area
  const isAnyActionBusy = isSyncing || isScansInitialLoading || isScansRefreshing || isWidgetBusy;

  async function handleSync() {
    if (accounts.length === 0) return;
    await syncMutation.mutateAsync({
      startDate,
      endDate,
    });
  }

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

  const handleAccountConnected = useCallback(async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
    await queryClient.invalidateQueries({ queryKey: ['spending-scans'] });
    await queryClient.invalidateQueries({ queryKey: ['spending-scans-debug'] });
    await refetchScans();
  }, [queryClient, refetch, refetchScans]);

  useEffect(() => {
    // When sync completes, we should refetch scans to ensure UI is fresh
    if (syncState.status === 'done' || syncState.status === 'failed') {
      refetchScans();
      refetch();
    }
  }, [syncState.status]);

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

  const debugStatuses = useMemo(() => {
    const statuses = debugScans?.debugTrace?.transactions.map((txn) => txn.status) ?? [];
    return Array.from(new Set(statuses)).sort();
  }, [debugScans?.debugTrace?.transactions]);

  const filteredDebugTransactions = useMemo(() => {
    const txns = debugScans?.debugTrace?.transactions ?? [];
    const hasStatusFilter = debugStatusFilter.length > 0;
    return txns.filter((txn) => {
      if (hasStatusFilter && !debugStatusFilter.includes(txn.status)) return false;
      const txnDate = txn.date?.slice(0, 10) ?? '';
      if (debugFromDate && txnDate < debugFromDate) return false;
      if (debugToDate && txnDate > debugToDate) return false;
      return true;
    });
  }, [debugScans?.debugTrace?.transactions, debugFromDate, debugStatusFilter, debugToDate]);

  function toggleDebugStatus(status: string) {
    setDebugStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }

  return (
    <section className="space-y-8 py-10" dir="rtl">
      <>
          <AccountStrip
            accounts={accounts}
            onAddClick={() => setIsDialogOpen(true)}
            isInitialLoading={isInitialLoad}
            isRefreshingValues={isAnyActionBusy || isAccountsRefreshing}
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
                {greeting}, <span className="text-zinc-400 dark:text-zinc-500">{session?.username}</span>
              </h1>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                הגעת למקום הנכון לקחת שליטה על ההוצאות שלך.
              </p>
            </div>

            <Button
              onClick={handleSync}
              disabled={isAnyActionBusy || accounts.length === 0}
              className="group h-11 rounded-none px-6 font-bold text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:dark:bg-zinc-800 disabled:text-zinc-500 text-white transition-all duration-300 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CircleNotch className={`h-4 w-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>{isSyncing ? 'מסנכרן תנועות...' : 'סנכרן כעת'}</span>
            </Button>
          </div>

          {isInitialLoad ? (
            <PremiumCard className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
                <div className="space-y-3 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 p-4">
                  <div className="h-5 w-44 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                  <div className="h-3 w-64 bg-zinc-100 dark:bg-zinc-900" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <div className="h-9 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                    <div className="h-9 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                  </div>
                </div>
                <div className="space-y-3 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 p-4">
                  <div className="h-4 w-28 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                  <div className="h-10 w-40 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-900" />
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 p-3 space-y-2"
                  >
                    <div className="h-4 w-7 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                    <div className="h-3 w-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                    <div className="h-4 w-2/3 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                  </div>
                ))}
              </div>
            </PremiumCard>
          ) : hasCreditAccounts ? (
            <div className="grid gap-6 animate-in fade-in-50 duration-300">
              <SpendingCategories
                scans={scans}
                period={scanPeriod}
                startDate={startDate}
                endDate={endDate}
                minStartDate={minStartDate}
                maxEndDate={maxEndDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                isLoadingScans={isScansInitialLoading}
                isRefreshingScans={isAnyActionBusy}
                hasConnectedAccounts={hasCreditAccounts}
                canUseAiAnnotation={hasAiProvider}
                isAnnotatingWithAi={annotateMutation.isPending}
                isWidgetBusy={isAnyActionBusy}
                onAnnotateWithAi={handleAnnotateWithAi}
                onGoToAiStudio={() => navigate({ to: '/ai-studio' })}
              />

              {false ? (
                <PremiumCard className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-right">
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">Pipeline Debug</h3>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      תצוגת החלטות מלאה לכל טרנזקציה בסריקה
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowDebugPipeline((prev) => !prev)}
                    className="h-9 px-4 rounded-none text-xs font-bold"
                    variant={showDebugPipeline ? 'destructive' : 'outline'}
                  >
                    {showDebugPipeline ? 'הסתר דיבאג' : 'הצג דיבאג'}
                  </Button>
                </div>

                {false ? (
                  isLoadingDebugScans ? (
                    <div className="py-10 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      טוען נתוני דיבאג...
                    </div>
                  ) : !debugScans?.debugTrace ? (
                    <div className="py-10 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      אין נתוני דיבאג זמינים
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-3 text-xs">
                        <div className="border border-zinc-200 dark:border-zinc-800 p-3">
                          <p className="font-bold text-zinc-600 dark:text-zinc-300">Period</p>
                          <p className="font-black text-zinc-900 dark:text-zinc-100">{debugScans?.debugTrace?.period}</p>
                        </div>
                        <div className="border border-zinc-200 dark:border-zinc-800 p-3">
                          <p className="font-bold text-zinc-600 dark:text-zinc-300">Transactions</p>
                          <p className="font-black text-zinc-900 dark:text-zinc-100">
                            {filteredDebugTransactions.length} / {debugScans?.debugTrace?.transactions.length ?? 0}
                          </p>
                        </div>
                        <div className="border border-zinc-200 dark:border-zinc-800 p-3">
                          <p className="font-bold text-zinc-600 dark:text-zinc-300">Accounts</p>
                          <p className="font-black text-zinc-900 dark:text-zinc-100">
                            {debugScans?.debugTrace?.accountsSummary.length ?? 0}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {debugStatuses.map((status) => {
                            const active = debugStatusFilter.includes(status);
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => toggleDebugStatus(status)}
                                className={`h-7 px-2 text-[11px] font-bold border cursor-pointer ${
                                  active
                                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                                }`}
                              >
                                {status}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setDebugStatusFilter([])}
                            className="h-7 px-2 text-[11px] font-bold border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                          >
                            נקה סטטוסים
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            <span>מדיבאג מתאריך</span>
                            <input
                              type="date"
                              value={debugFromDate}
                              onChange={(e) => setDebugFromDate(e.target.value)}
                              className="h-8 px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                            <span>מדיבאג עד תאריך</span>
                            <input
                              type="date"
                              value={debugToDate}
                              onChange={(e) => setDebugToDate(e.target.value)}
                              className="h-8 px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-auto border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-xs">
                          <thead className="bg-zinc-100 dark:bg-zinc-900 sticky top-0">
                            <tr className="text-right">
                              <th className="p-2 font-black">תאריך</th>
                              <th className="p-2 font-black">סכום</th>
                              <th className="p-2 font-black">בית עסק</th>
                              <th className="p-2 font-black">סטטוס</th>
                              <th className="p-2 font-black">קטגוריה</th>
                              <th className="p-2 font-black">סיבה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredDebugTransactions.map((txn, idx) => (
                              <tr key={`${txn.dedupKey}-${idx}`} className="border-t border-zinc-100 dark:border-zinc-900">
                                <td className="p-2 whitespace-nowrap">{txn.date ? new Date(txn.date).toLocaleDateString('he-IL') : '-'}</td>
                                <td className="p-2 whitespace-nowrap" dir="ltr">
                                  {Number.isFinite(txn.amount) ? txn.amount.toLocaleString('he-IL') : '-'}
                                </td>
                                <td className="p-2 max-w-56 truncate">{txn.description || '-'}</td>
                                <td className="p-2 whitespace-nowrap">{txn.status}</td>
                                <td className="p-2 whitespace-nowrap">{txn.category || '-'}</td>
                                <td className="p-2 min-w-64">{txn.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : null}
                </PremiumCard>
              ) : null}
            </div>
          ) : !isSyncing ? (
            <PremiumCard className="relative overflow-hidden py-16 px-6 flex flex-col items-center justify-center text-center border border-zinc-200 dark:border-zinc-800 bg-linear-to-br from-white via-zinc-50/10 to-zinc-50/20 dark:from-zinc-950 dark:via-zinc-900/10 dark:to-zinc-900/20 rounded-none shadow-sm animate-in fade-in-50 duration-500">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
              
              {/* Premium Glow effect */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-zinc-900/5 dark:bg-white/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 space-y-6 max-w-md">
                <div className="mx-auto w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shadow-inner group">
                  <CreditCard className="h-7 w-7 text-zinc-700 dark:text-zinc-300 transition-transform duration-500 group-hover:scale-110" weight="duotone" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight text-zinc-950 dark:text-white">
                    ניתוח הוצאות חכם מבוסס AI
                  </h3>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    שימו לב: כדי להשתמש בווידג'ט זה ולצפות בניתוח ההוצאות, עליכם לחבר חשבון מחברת האשראי (כמו Cal, Max או Isracard).
                  </p>
                </div>
              </div>
            </PremiumCard>
          ) : null}

      {/* Add Bank Account Dialog */}
      <AddBankAccountDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleAccountConnected}
      />
      </>
    </section>
  );
}
