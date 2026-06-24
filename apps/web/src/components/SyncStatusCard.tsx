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
import { getCurrentRange, toDateInputValue } from '@money-up/common';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getFriendlyScraperError } from '@/lib/error-formatter';
import { SyncDialog } from './SyncDialog';

interface SyncStatusCardProps {
  onSync: (startDate: string, endDate: string) => void;
  isSyncing: boolean;
  className?: string;
}

export function SyncStatusCard({
  onSync,
  isSyncing,
  className,
}: SyncStatusCardProps) {
  const sync = useAppStore((s) => s.sync);
  const dashboardRange = useAppStore((s) => s.dashboardRange);

  const [timeAgo, setTimeAgo] = useState<string>('');
  const isFailed = sync.status === 'failed';
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);

  const isNeedsSync =
    !sync.updatedAt ||
    Date.now() - new Date(sync.updatedAt).getTime() > 24 * 60 * 60 * 1000;

  const [displayedBankId, setDisplayedBankId] = useState<string | null>(null);
  const [fade, setFade] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [autoPrompted, setAutoPrompted] = useState(false);

  const currentlySyncing = sync.currentlySyncing;

  const handleOpenDialog = () => {
    setStartDate(dashboardRange.startDate ?? getCurrentRange().startDate);
    setEndDate(dashboardRange.endDate ?? getCurrentRange().endDate);
    setAutoPrompted(false);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasChecked = sessionStorage.getItem('sync_prompt_checked') === '1';
    if (hasChecked) return;

    api.get<{ needsSync: boolean; lastTransactionDate?: string }>('/scrapers/check-sync-needed')
      .then((res) => {
        sessionStorage.setItem('sync_prompt_checked', '1');
        if (res.needsSync) {
          setStartDate(res.lastTransactionDate ?? getCurrentRange().startDate);
          setEndDate(toDateInputValue(new Date()));
          setAutoPrompted(true);
          setIsDialogOpen(true);
        }
      })
      .catch((err) => {
        console.error('[SyncStatusCard] Failed to check sync status:', err);
      });
  }, []);

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
    <>
      <div
        className={cn(
          'flex items-center justify-between border border-border bg-card p-2 group transition-all hover:border-foreground/20',
          isFailed && 'border-destructive/30 bg-destructive/5',
          !isSyncing && !isFailed && isNeedsSync && 'border-amber-500/20 bg-amber-500/5',
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
            ) : isNeedsSync ? (
              <Warning className="h-6 w-6 text-amber-500" weight="bold" />
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
              {isSyncing ? (
                'סנכרון בתהליך...'
              ) : isFailed ? (
                <span className="flex items-center gap-1.5">
                  לא מעודכן בגלל שגיאה
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsErrorDialogOpen(true);
                    }}
                    className="shrink-0 h-4.5 px-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-[8px] font-black uppercase rounded-sm border border-destructive/20 transition-colors"
                  >
                    פרטי שגיאה
                  </button>
                </span>
              ) : isNeedsSync ? (
                'לא עודכן לאחרונה'
              ) : (
                'נתונים מעודכנים'
              )}
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
          onClick={handleOpenDialog}
          disabled={isSyncing}
          title="סנכרן נתונים"
        >
          <ArrowsClockwise
            className={cn('h-4 w-4', isSyncing && 'animate-spin')}
            weight="bold"
          />
        </Button>
      </div>

      <SyncDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={onSync}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
        isSyncing={isSyncing}
        lastSyncTime={sync.updatedAt}
        autoPrompted={autoPrompted}
      />

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent
          className="max-w-xl rounded-none border border-border bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          dir="rtl"
        >
          <DialogHeader className="text-right border-b border-border pb-4 mb-4">
            <DialogTitle className="text-xl font-black text-foreground">
              פרטי שגיאת סנכרון
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1">
              {sync.jobId ? `מזהה סנכרון: ${sync.jobId}` : 'הודעת השגיאה המלאה'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto border border-border bg-muted/30 p-5 text-right text-sm font-semibold text-foreground leading-relaxed">
            <p className="whitespace-pre-wrap break-words">
              {sync.error ? getFriendlyScraperError(sync.error) : 'אירעה שגיאה במהלך הסנכרון'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
