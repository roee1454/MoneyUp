import { useEffect, useState } from 'react';
import {
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  Warning,
} from '@phosphor-icons/react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BankIcon } from '@/features/accounts/components/BankIcon';

interface SyncStatusCardProps {
  onSync: () => void;
  isSyncing: boolean;
  className?: string;
}

export function SyncStatusCard({
  onSync,
  isSyncing,
  className,
}: SyncStatusCardProps) {
  const sync = useAppStore((s) => s.sync);
  const [timeAgo, setTimeAgo] = useState<string>('');
  const isFailed = sync.status === 'failed';

  const [displayedBankId, setDisplayedBankId] = useState<string | null>(null);
  const [fade, setFade] = useState(true);

  const currentlySyncing = sync.currentlySyncing;

  useEffect(() => {
    if (currentlySyncing !== displayedBankId) {
      setFade(false);
      const timeout = setTimeout(() => {
        setDisplayedBankId(currentlySyncing);
        setFade(true);
      }, 180);
      return () => clearTimeout(timeout);
    }
  }, [currentlySyncing, displayedBankId]);

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!sync.updatedAt) {
        setTimeAgo('טרם בוצע סנכרון');
        return;
      }

      const updated = new Date(sync.updatedAt);
      const now = new Date();
      const diffInSeconds = Math.floor(
        (now.getTime() - updated.getTime()) / 1000,
      );

      if (diffInSeconds < 60) {
        setTimeAgo('ממש עכשיו');
      } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        setTimeAgo(`לפני ${mins} דק׳`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`לפני ${hours} שעות`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`לפני ${days} ימים`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [sync.updatedAt]);

  return (
    <div
      className={cn(
        'flex items-center justify-between border border-border bg-card p-2 group transition-all hover:border-foreground/20',
        isFailed && 'border-destructive/30 bg-destructive/5',
        className,
      )}
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-9 w-9 flex items-center justify-center">
          {isSyncing ? (
            <div className={cn("relative flex h-8 w-8 items-center justify-center transition-opacity duration-200", fade ? "opacity-100" : "opacity-0")}>
              {displayedBankId ? (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <BankIcon
                    bankId={displayedBankId}
                    size="sm"
                    className="h-5.5 w-5.5 border-none bg-transparent"
                    shape="circle"
                  />
                </>
              ) : (
                <CircleNotch
                  className="h-5 w-5 animate-spin text-primary"
                  weight="bold"
                />
              )}
            </div>
          ) : isFailed ? (
            <Warning className="h-6 w-6 text-destructive" weight="fill" />
          ) : (
            <CheckCircle className="h-6 w-6 text-emerald-600" weight="fill" />
          )}
        </div>
        <div className="min-w-0 flex flex-col text-right">
          <p
            className={cn(
              'truncate text-xs font-black leading-none mb-1',
              isFailed ? 'text-destructive' : 'text-foreground',
            )}
          >
            {isSyncing
              ? 'סנכרון בתהליך...'
              : isFailed
                ? 'הסנכרון נכשל'
                : 'נתונים מעודכנים'}
          </p>
          <p className="truncate text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
            {isFailed ? 'לחץ לנסות שנית' : timeAgo}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors',
          isSyncing && 'opacity-50 cursor-not-allowed',
          isFailed &&
            'text-destructive hover:text-destructive hover:bg-destructive/10',
        )}
        onClick={onSync}
        disabled={isSyncing}
        title="סנכרן נתונים"
      >
        <ArrowsClockwise
          className={cn('h-4 w-4', isSyncing && 'animate-spin')}
          weight="bold"
        />
      </Button>
    </div>
  );
}
