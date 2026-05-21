import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { AddBankAccountDialog } from '@/components/AddBankAccountDialog';
import { isCreditCompanyBankId, useAccounts, useSyncAccounts } from '@/hooks/useAccounts';
import { AccountStrip } from '@/components/AccountStrip';
import { SpendingCategories } from '@/components/SpendingCategories';
import { useUserProfile } from '@/hooks/useUsers';
import { SyncDialog } from '@/components/SyncDialog';
import { useAiScans, useAiScansDebug, useAnnotateAiScans } from '@/hooks/useAi';
import { PremiumCard } from '@/components/ui/premium-card';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getRangeFromPeriod(period: 'current' | 'previous' | 'both'): { startDate: string; endDate: string } {
  const now = new Date();
  const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
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
  const session = useAppStore((s) => s.session);
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

  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const { data: userProfile } = useUserProfile(session?.userId);
  const hasCreditAccounts = accounts.some((account) => isCreditCompanyBankId(account.bankId));
  const hasAiProvider = !!userProfile?.activeAiProvider;
  const { data: scans, isLoading: isLoadingScans, refetch: refetchScans } = useAiScans({
    period: scanPeriod,
    startDate,
    endDate,
  });
  const { data: debugScans, isLoading: isLoadingDebugScans } = useAiScansDebug(
    {
      period: scanPeriod,
      startDate,
      endDate,
    },
    showDebugPipeline && hasAiProvider && hasCreditAccounts,
  );
  const syncMutation = useSyncAccounts();
  const isSyncing = syncMutation.isPending;
  const annotateMutation = useAnnotateAiScans();

  async function handleSync() {
    await syncMutation.mutateAsync();
  }

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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">טוען את נתוני החשבונות המסונכרנים...</span>
        </div>
      ) : (
        <>
          <AccountStrip accounts={accounts} onAddClick={() => setIsDialogOpen(true)} isSyncing={isSyncing} />

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
              disabled={isSyncing}
              className="group h-11 rounded-none px-6 font-bold text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:dark:bg-zinc-800 disabled:text-zinc-500 text-white transition-all duration-300 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Loader2 className={`h-4 w-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>{isSyncing ? 'מסנכרן תנועות...' : 'סנכרן כעת'}</span>
            </Button>
          </div>

          {hasCreditAccounts && (
            <div className="grid gap-6 animate-in fade-in-50 duration-300">
              <SpendingCategories
                scans={scans}
                period={scanPeriod}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                isLoadingScans={isLoadingScans}
                isSyncing={isSyncing}
                hasConnectedAccounts={hasCreditAccounts}
                canUseAiAnnotation={hasAiProvider}
                isAnnotatingWithAi={annotateMutation.isPending}
                isWidgetBusy={isWidgetBusy}
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
                          <p className="font-black text-zinc-900 dark:text-zinc-100">{debugScans.debugTrace.period}</p>
                        </div>
                        <div className="border border-zinc-200 dark:border-zinc-800 p-3">
                          <p className="font-bold text-zinc-600 dark:text-zinc-300">Transactions</p>
                          <p className="font-black text-zinc-900 dark:text-zinc-100">
                            {filteredDebugTransactions.length} / {debugScans.debugTrace.transactions.length}
                          </p>
                        </div>
                        <div className="border border-zinc-200 dark:border-zinc-800 p-3">
                          <p className="font-bold text-zinc-600 dark:text-zinc-300">Accounts</p>
                          <p className="font-black text-zinc-900 dark:text-zinc-100">
                            {debugScans.debugTrace.accountsSummary.length}
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
          )}
        </>
      )}

      {/* Add Bank Account Dialog */}
      <AddBankAccountDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={refetch}
      />
      <SyncDialog open={isSyncing} />
    </section>
  );
}
