import type { ReactNode } from 'react';
import { CircleNotch, LockKey } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { PremiumCard } from '@/components/ui/premium-card';
import { cn } from '@/lib/utils';

type MetricTone = 'rose' | 'emerald' | 'sky' | 'zinc';

const iconToneClasses: Record<MetricTone, string> = {
  rose: 'text-rose-600 dark:text-rose-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  sky: 'text-sky-600 dark:text-sky-400',
  zinc: 'text-zinc-700 dark:text-zinc-200',
};

interface DashboardMetricCardProps {
  title: string;
  value: ReactNode;
  caption: string;
  icon: ReactNode;
  tone?: MetricTone;
  isLoading?: boolean;
  isLocked?: boolean;
  lockedLabel?: string;
  footer?: ReactNode;
}

export function DashboardMetricCard({
  title,
  value,
  caption,
  icon,
  tone = 'zinc',
  isLoading = false,
  isLocked = false,
  lockedLabel = 'נדרש חיבור לחשבון',
  footer,
}: DashboardMetricCardProps) {
  return (
    <PremiumCard
      className={cn(
        'relative min-h-40 overflow-hidden bg-white p-5 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100',
        isLocked && 'opacity-75',
      )}
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-right">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              {title}
            </p>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              {caption}
            </p>
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80',
              iconToneClasses[tone],
            )}
          >
            {isLocked ? <LockKey className="h-5 w-5" weight="duotone" /> : icon}
          </div>
        </div>

        <div className="space-y-2 text-right">
          {isLoading ? (
            <div className="ml-auto h-9 w-40 animate-soft-shimmer bg-zinc-200/80 dark:bg-zinc-800/80" />
          ) : isLocked ? (
            <div className="space-y-2">
              <p className="text-sm font-black text-zinc-500 dark:text-zinc-400">
                {lockedLabel}
              </p>
              <Link
                to="/settings"
                className="inline-block border border-zinc-200 bg-white/80 px-3 py-1.5 text-[11px] font-black text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-white"
              >
                עבור להגדרות ←
              </Link>
            </div>
          ) : (
            <div className="text-3xl font-black tracking-tight" dir="ltr">
              {value}
            </div>
          )}
          {isLoading ? (
            <div className="ml-auto h-3 w-28 animate-soft-shimmer bg-zinc-100 dark:bg-zinc-900" />
          ) : (
            footer
          )}
        </div>
      </div>
      {isLoading ? (
        <CircleNotch className="absolute bottom-4 left-4 h-4 w-4 animate-spin text-zinc-400" />
      ) : null}
    </PremiumCard>
  );
}
