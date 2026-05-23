import { useEffect, useState } from 'react';
import {
  ArrowsClockwise,
  CircleNotch,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useSyncAccounts } from '@/hooks/useAccounts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store';

function getPhaseLabel(phase: string | null): string {
  if (phase === 'initializing') return 'אתחול';
  if (phase === 'syncing_scrapers') return 'סנכרון מקורות';
  if (phase === 'recomputing_spending') return 'חישוב הוצאות';
  if (phase === 'finalizing') return 'סיום';
  return 'מעבד נתונים';
}

export function GlobalSyncBubble() {
  const sync = useAppStore((s) => s.sync);
  const dashboardRange = useAppStore((s) => s.dashboardRange);
  const setSync = useAppStore((s) => s.setSync);
  const syncMutation = useSyncAccounts();
  const [now, setNow] = useState(() => Date.now());
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  useEffect(() => {
    if (sync.status !== 'failed' || !sync.cooldownBlockedUntil) return;
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sync.cooldownBlockedUntil, sync.status]);

  if (!sync.visible) return null;

  const isFailed = sync.status === 'failed';
  const title = isFailed ? 'סנכרון נכשל' : 'סנכרון נתונים';
  const message =
    sync.message || (isFailed ? 'אירעה שגיאה במהלך הסנכרון' : 'מעדכן נתונים ברקע...');
  const errorMessage =
    sync.error || (isFailed ? 'אירעה שגיאה במהלך הסנכרון' : '');

  const progressValue =
    sync.status === 'running' && Number.isFinite(sync.displayProgress)
      ? Math.max(6, Math.min(sync.displayProgress, 99))
      : 100;
  const phaseLabel = getPhaseLabel(sync.phase);
  const cooldownRemainingMs = sync.cooldownBlockedUntil
    ? Math.max(0, new Date(sync.cooldownBlockedUntil).getTime() - now)
    : Math.max(0, sync.cooldownRemainingMs ?? 0);
  const hasCooldown = isFailed && cooldownRemainingMs > 0;

  function formatRemainingTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  async function handleRetry() {
    await syncMutation.mutateAsync({
      startDate:
        dashboardRange.committedStartDate ??
        dashboardRange.startDate ??
        undefined,
      endDate:
        dashboardRange.committedEndDate ??
        dashboardRange.endDate ??
        undefined,
      silent: true,
    });
  }

  return (
    <>
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto w-[760px] max-w-[calc(100vw-1.25rem)] rounded-4xl border border-zinc-200 dark:border-zinc-800 bg-white/96 dark:bg-zinc-950/96 shadow-2xl px-7 py-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {isFailed ? (
                <button
                  type="button"
                  onClick={() => setSync({ visible: false })}
                  className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                  aria-label="סגירת חלון סנכרון"
                >
                  <X className="h-4 w-4" weight="bold" />
                </button>
              ) : null}
              <div className="text-right">
                <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{title}</p>
                {!isFailed && <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  {message}
                </p>}
                <div className="mt-1 flex items-center justify-end gap-2">
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {isFailed
                      ? hasCooldown
                        ? `ניסיון אוטומטי נוסף יתאפשר בעוד ${formatRemainingTime(cooldownRemainingMs)}`
                        : message
                      : phaseLabel}
                  </p>
                  {isFailed ? (
                    <button
                      type="button"
                      onClick={() => setIsErrorDialogOpen(true)}
                      className="text-[14px] font-black text-zinc-700 underline underline-offset-2 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    >
                      פרטים
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isFailed ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRetry()}
                    disabled={syncMutation.isPending}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-900 bg-zinc-900 px-4 text-xs font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {syncMutation.isPending ? (
                      <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                    ) : (
                      <ArrowsClockwise className="h-4 w-4" weight="bold" />
                    )}
                    <span>נסה שוב</span>
                  </button>
                  <WarningCircle className="h-7 w-7 shrink-0 text-rose-600 dark:text-rose-400" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {Math.round(progressValue)}%
                  </p>
                  <CircleNotch className="h-7 w-7 animate-spin text-zinc-600 dark:text-zinc-300 shrink-0" />
                </>
              )}
            </div>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
            <div
              className={`h-full relative transition-[width] duration-500 ${
                isFailed ? 'bg-rose-300/80 dark:bg-rose-800/80' : 'bg-zinc-300/70 dark:bg-zinc-700/70'
              }`}
              style={{ width: `${progressValue}%` }}
            >
              <span className="absolute inset-0 animate-soft-shimmer opacity-80" />
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent
          className="max-w-xl rounded-none border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          dir="rtl"
        >
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-black text-zinc-950 dark:text-white">
              פרטי שגיאת סנכרון
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              הודעת השגיאה המלאה מהסנכרון האחרון
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto border border-zinc-200 bg-zinc-50/70 p-4 text-right text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
            <p className="whitespace-pre-wrap break-words">{errorMessage}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
