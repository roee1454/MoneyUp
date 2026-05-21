import { CircleNotch, WarningCircle } from '@phosphor-icons/react';
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

  if (!sync.visible) return null;

  const isFailed = sync.status === 'failed';
  const title = isFailed ? 'סנכרון נכשל' : 'סנכרון נתונים';
  const message = sync.message || (isFailed ? 'אירעה שגיאה במהלך הסנכרון' : 'מעדכן נתונים ברקע...');

  const progressValue =
    sync.status === 'running' && Number.isFinite(sync.displayProgress)
      ? Math.max(6, Math.min(sync.displayProgress, 99))
      : 100;
  const phaseLabel = getPhaseLabel(sync.phase);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="w-[760px] max-w-[calc(100vw-1.25rem)] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white/96 dark:bg-zinc-950/96 shadow-2xl px-7 py-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-right">
            <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{title}</p>
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{message}</p>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mt-1">{phaseLabel}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
              {Math.round(progressValue)}%
            </p>
          {isFailed ? (
              <WarningCircle className="h-7 w-7 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
              <CircleNotch className="h-7 w-7 animate-spin text-zinc-600 dark:text-zinc-300 shrink-0" />
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
  );
}
