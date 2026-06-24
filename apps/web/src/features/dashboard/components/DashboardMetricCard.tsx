import type { ReactNode } from 'react';
import { CircleNotch, LockKey } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { DataSourceCard } from './DataSourceCard';


type MetricTone = 'rose' | 'emerald' | 'sky' | 'zinc';

const iconToneClasses: Record<MetricTone, string> = {
  rose: 'text-rose-600 dark:text-rose-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  sky: 'text-sky-600 dark:text-sky-400',
  zinc: 'text-foreground/80',
};

interface DashboardMetricCardProps {
  title: string;
  value: ReactNode;
  caption?: string;
  icon?: ReactNode;
  tone?: MetricTone;
  isLoading?: boolean;
  isLocked?: boolean;
  lockedLabel?: string;
  footer?: ReactNode;
  variant?: 'default' | 'slim' | 'cell';
  sourceBankIds?: string[];
  className?: string;
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
  variant = 'default',
  sourceBankIds = [],
  className,
}: DashboardMetricCardProps) {


  if (variant === 'cell') {
    return (
      <div
        className={cn(
          'relative p-6 text-foreground flex flex-col justify-between min-h-[9rem] h-auto select-none bg-card border border-border rounded-none shadow-xs transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg',
          isLocked && 'opacity-75',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="space-y-1 text-right min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <p className="text-sm sm:text-base font-black text-foreground truncate max-w-full">
                {title}
              </p>
              <DataSourceCard bankIds={sourceBankIds} className="shrink-0" />
            </div>
            {caption && (
              <p className="text-xs font-bold text-muted-foreground/60 leading-tight">
                {caption}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background shadow-xs text-foreground/80 rounded-none',
                iconToneClasses[tone],
              )}
            >
              {isLocked ? (
                <LockKey className="h-4.5 w-4.5" weight="duotone" />
              ) : (
                icon
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-right mt-4 min-w-0">
          {isLoading ? (
            <div className="ml-auto h-8 w-28 animate-soft-shimmer bg-muted/80 rounded-none" />
          ) : isLocked ? (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground leading-none">
                {lockedLabel}
              </p>
              <Link
                to="/settings"
                className="inline-block border border-border bg-background px-3 py-1 text-[9px] font-black text-foreground/75 transition-all hover:border-foreground/20 hover:text-primary active:scale-95 shadow-xs rounded-none"
              >
                חיבור חשבון ←
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'text-lg sm:text-2xl font-black tracking-tight',
                iconToneClasses[tone],
              )}
              dir="ltr"
            >
              {value}
            </div>
          )}
          {footer && !isLoading && (
            <div className="text-[10px] font-bold text-muted-foreground/70">
              {footer}
            </div>
          )}
        </div>

        {isLoading && (
          <CircleNotch className="absolute bottom-4 left-4 h-4 w-4 animate-spin text-muted-foreground/30" />
        )}
      </div>
    );
  }

  if (variant === 'slim') {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-card p-4 text-foreground flex flex-col justify-between min-h-[7rem] h-auto border border-border shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg rounded-none',
          isLocked && 'opacity-75',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <p className="text-sm sm:text-base font-black text-foreground truncate max-w-full">
              {title}
            </p>
            <DataSourceCard bankIds={sourceBankIds} className="shrink-0" />
          </div>
        </div>

        <div className="space-y-1 text-right mt-3 min-w-0">
          {isLoading ? (
            <div className="ml-auto h-7 w-28 animate-soft-shimmer bg-muted/80" />
          ) : isLocked ? (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground leading-none">
                {lockedLabel}
              </p>
              <Link
                to="/settings"
                className="inline-block border border-border bg-background px-2 py-1 text-[9px] font-black text-foreground/70 transition-all hover:border-foreground/20 hover:text-primary active:scale-95 shadow-xs"
              >
                להגדרות ←
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'text-sm sm:text-base font-black tracking-tight',
                iconToneClasses[tone],
              )}
              dir="ltr"
            >
              {value}
            </div>
          )}
          {footer && !isLoading && (
            <div className="text-[10px] font-bold text-muted-foreground/70">
              {footer}
            </div>
          )}
        </div>

        {isLoading && (
          <CircleNotch className="absolute bottom-3 left-3 h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative min-h-[10rem] h-auto overflow-hidden bg-card p-5 text-foreground border border-border shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg rounded-none',
        isLocked && 'opacity-75',
        className,
      )}
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-5 min-w-0">
        <div className="flex items-start justify-between gap-4 min-w-0">
          <div className="space-y-1 text-right min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <p className="text-lg sm:text-xl font-black text-foreground truncate max-w-full">
                {title}
              </p>
              <DataSourceCard bankIds={sourceBankIds} className="shrink-0" />
            </div>
            {caption && (
              <p className="text-xs font-bold text-muted-foreground/80">
                {caption}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background shadow-sm',
                iconToneClasses[tone],
              )}
            >
              {isLocked ? (
                <LockKey className="h-5 w-5" weight="duotone" />
              ) : (
                icon
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 text-right min-w-0">
          {isLoading ? (
            <div className="ml-auto h-9 w-40 animate-soft-shimmer bg-muted/80" />
          ) : isLocked ? (
            <div className="space-y-2">
              <p className="text-sm font-black text-muted-foreground">
                {lockedLabel}
              </p>
              <Link
                to="/settings"
                className="inline-block border border-border bg-background px-3 py-1.5 text-[11px] font-black text-foreground/70 transition-all hover:border-foreground/20 hover:text-primary active:scale-95 shadow-xs"
              >
                עבור להגדרות ←
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight',
                iconToneClasses[tone],
              )}
              dir="ltr"
            >
              {value}
            </div>
          )}
          {isLoading ? (
            <div className="ml-auto h-3 w-28 animate-soft-shimmer bg-muted" />
          ) : (
            footer
          )}
        </div>
      </div>
      {isLoading ? (
        <CircleNotch className="absolute bottom-4 left-4 h-4 w-4 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
