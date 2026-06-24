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
import { cn } from '@/lib/utils';
import { getScraperSocket } from '@/lib/scraper-socket';
import { PremiumInput } from '@/components/ui/premium-input';
import { Button } from '@/components/ui/button';
import { BankIcon } from './BankIcon';
import { getFriendlyScraperError } from '@/lib/error-formatter';
import { OTP_MIN_LENGTH, OTP_MAX_LENGTH } from './add-bank-account/constants';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const syncOtpSchema = z.object({
  otpCode: z.string().trim().min(OTP_MIN_LENGTH),
});

type SyncOtpValues = z.infer<typeof syncOtpSchema>;

function getPhaseLabel(phase: string | null): string {
  if (phase === 'initializing') return 'אתחול';
  if (phase === 'syncing_scrapers') return 'סנכרון מקורות';
  if (phase === 'recomputing_spending') return 'חישוב הוצאות';
  if (phase === 'finalizing') return 'סיום';
  return 'מעבד נתונים';
}

export function GlobalSyncBubble() {
  const status = useAppStore((s) => s.sync.status);
  const phase = useAppStore((s) => s.sync.phase);
  const displayProgress = useAppStore((s) => s.sync.displayProgress);
  const message = useAppStore((s) => s.sync.message);
  const error = useAppStore((s) => s.sync.error);
  const cooldownBlockedUntil = useAppStore((s) => s.sync.cooldownBlockedUntil);
  const cooldownRemainingMsStore = useAppStore((s) => s.sync.cooldownRemainingMs);
  const visible = useAppStore((s) => s.sync.visible);
  const jobId = useAppStore((s) => s.sync.jobId);
  const challenge = useAppStore((s) => s.sync.challenge);
  const bankId = useAppStore((s) => s.sync.challenge?.bankId);

  const dashboardRange = useAppStore((s) => s.dashboardRange);
  const setSync = useAppStore((s) => s.setSync);
  const userId = useAppStore((s) => s.session?.userId);

  const currentlySyncing = useAppStore((s) => s.sync.currentlySyncing);
  const [displayedBankId, setDisplayedBankId] = useState<string | null>(null);
  const [fade, setFade] = useState(true);
  const isChallenged = !!challenge;

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
  const syncMutation = useSyncAccounts();
  const [now, setNow] = useState(() => Date.now());
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  
  // OTP Challenge Form State
  const { control, handleSubmit: handleFormSubmit, reset, watch } = useForm<SyncOtpValues>({
    resolver: zodResolver(syncOtpSchema),
    defaultValues: {
      otpCode: '',
    },
  });

  const otpCode = watch('otpCode') || '';
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);

  useEffect(() => {
    if (isChallenged) {
      reset({ otpCode: '' });
    }
  }, [isChallenged, reset]);

  useEffect(() => {
    if (status !== 'failed' || !cooldownBlockedUntil) return;
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownBlockedUntil, status]);

  if (!visible) return null;

  const isFailed = status === 'failed';
  const title = isFailed ? 'סנכרון נכשל' : isChallenged ? 'נדרש אימות' : 'סנכרון נתונים';
  const displayMessage = isFailed
    ? (error ? getFriendlyScraperError(error) : (message || 'אירעה שגיאה במהלך הסנכרון'))
    : (message || 'מעדכן נתונים ברקע...');
  const errorMessage = error
    ? getFriendlyScraperError(error)
    : (isFailed ? 'אירעה שגיאה במהלך הסנכרון' : '');

  const progressValue =
    status === 'running' && Number.isFinite(displayProgress)
      ? Math.max(6, Math.min(displayProgress, 99))
      : 100;
  const phaseLabel = getPhaseLabel(phase);
  const cooldownRemainingMs = cooldownBlockedUntil
    ? Math.max(0, new Date(cooldownBlockedUntil).getTime() - now)
    : Math.max(0, cooldownRemainingMsStore ?? 0);
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

  const handleDismiss = () => {
    if (userId && jobId) {
      localStorage.setItem(`moneyup_dismissed_sync_error_${userId}`, jobId);
    }
    setSync({ visible: false });
  };

  async function handleRetry() {
    await syncMutation.mutateAsync({
      startDate:
        dashboardRange.committedStartDate ??
        dashboardRange.startDate ??
        undefined,
      endDate:
        dashboardRange.committedEndDate ?? dashboardRange.endDate ?? undefined,
      silent: true,
    });
  }

  async function handleSubmitOtp(values: SyncOtpValues) {
    if (!jobId || !values.otpCode) return;
    
    setIsSubmittingOtp(true);
    try {
      const socket = getScraperSocket();
      socket.emit('scraper:challenge:submit', { 
        sessionId: jobId, 
        code: values.otpCode 
      });
      // Clear challenge locally to hide dialog while waiting for server response
      setSync({ challenge: null });
      reset({ otpCode: '' });
    } finally {
      setIsSubmittingOtp(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center" dir="rtl">
        <div className="pointer-events-auto w-[640px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-background/98 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 zoom-in-95 group">
          <div className="relative px-6 py-5 flex items-center justify-between gap-8">
            {/* Status & Information (Right side in RTL) */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
               {/* Status Icon */}
               <div className="relative shrink-0">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500 shadow-sm",
                  isFailed 
                    ? "bg-rose-500 text-white rotate-3 shadow-rose-200 dark:shadow-none" 
                    : isChallenged 
                      ? "bg-amber-500 text-white shadow-amber-200 dark:shadow-none"
                      : "bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 text-foreground"
                )}>
                  {isFailed ? (
                    <WarningCircle className="h-6 w-6" weight="fill" />
                  ) : isChallenged ? (
                    <WarningCircle className="h-6 w-6 animate-pulse" weight="bold" />
                  ) : (
                    <div className={cn(
                      "relative flex h-10 w-10 items-center justify-center transition-all duration-300 ease-out transform",
                      fade ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90"
                    )}>
                      {displayedBankId ? (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
                          <BankIcon
                            bankId={displayedBankId}
                            size="sm"
                            className="h-6.5 w-6.5 border-none bg-transparent"
                            shape="circle"
                          />
                        </>
                      ) : (
                        <ArrowsClockwise className="h-6 w-6 animate-spin" style={{ animationDuration: '3s' }} weight="bold" />
                      )}
                    </div>
                  )}
                </div>
                {!isFailed && !isChallenged && (
                   <span className="absolute -top-1 -left-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
                  </span>
                )}
              </div>

              {/* Textual Content */}
              <div className="flex-1 min-w-0 text-right">
                <h4 className={cn(
                  "text-lg font-black tracking-tight leading-none mb-1.5",
                  isFailed ? "text-rose-600 dark:text-rose-400" : isChallenged ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {title}
                </h4>
                <div className="flex items-center gap-3">
                  <p className="text-[13px] font-bold text-muted-foreground truncate max-w-[300px]">
                    {isFailed 
                      ? hasCooldown 
                        ? `סנכרון חוזר בעוד ${formatRemainingTime(cooldownRemainingMs)}`
                        : displayMessage
                      : isChallenged
                        ? challenge?.message || 'נדרש קוד אימות להמשך'
                        : phaseLabel + (displayMessage ? ` • ${displayMessage}` : '')
                    }
                  </p>
                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => setIsErrorDialogOpen(true)}
                      className="shrink-0 h-5 px-2 bg-muted hover:bg-muted-foreground/10 text-[10px] font-black text-muted-foreground uppercase rounded-md transition-colors border border-border"
                    >
                      פרטי שגיאה
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions / Progress (Left side in RTL) */}
            <div className="flex items-center gap-6 border-r border-border/50 pr-8 mr-2">
               {isFailed ? (
                <div className="flex items-center gap-3">
                   <button
                    type="button"
                    onClick={handleDismiss}
                    className="h-11 w-11 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-90"
                    aria-label="ביטול"
                  >
                    <X className="h-5 w-5" weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRetry()}
                    disabled={syncMutation.isPending}
                    className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {syncMutation.isPending ? (
                      <CircleNotch className="h-4 w-4 animate-spin mx-auto" weight="bold" />
                    ) : (
                      'סנכרן שוב כעת'
                    )}
                  </button>
                </div>
              ) : isChallenged ? (
                <button
                  type="button"
                  className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 animate-bounce"
                  onClick={() => {/* Handled by dialog being open */}}
                >
                  הזן קוד אימות
                </button>
              ) : (
                <div className="flex flex-col items-center min-w-[60px]">
                  <span className="text-3xl font-black text-foreground tabular-nums tracking-tighter leading-none">
                    {Math.round(progressValue)}%
                  </span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mt-1.5 opacity-80">
                    הושלם
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Progress Bar */}
          <div className="h-1.5 w-full bg-muted/30 relative">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-in-out relative",
                isFailed ? "bg-rose-500" : isChallenged ? "bg-amber-500" : "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
              )}
              style={{ width: `${progressValue}%` }}
            >
               {!isFailed && (
                <div className="absolute top-0 left-0 h-full w-full bg-linear-to-l from-white/30 via-transparent to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              )}
            </div>
          </div>
        </div>
      </div>

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
              {jobId ? `מזהה סנכרון: ${jobId}` : 'הודעת השגיאה המלאה'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto border border-border bg-muted/30 p-5 text-right text-sm font-semibold text-foreground leading-relaxed">
            <p className="whitespace-pre-wrap break-words">{errorMessage}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP Challenge Dialog */}
      <Dialog 
        open={isChallenged} 
        onOpenChange={(open) => {
          if (!open) {
            setSync({ challenge: null });
          }
        }}
      >
        <DialogContent
          className="max-w-md bg-card border border-border rounded-none p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          dir="rtl"
          showCloseButton={false}
        >
          <DialogHeader className="text-right space-y-1 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              {bankId && (
                <BankIcon bankId={bankId} size="md" />
              )}
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  אימות דו-שלבי נדרש
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground">
                  {bankId ? `חיבור ל-${bankId} דורש קוד אימות` : 'נדרש קוד אימות נוסף להמשך הסנכרון'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleFormSubmit(handleSubmitOtp)} className="space-y-4 pt-4 text-right">
            <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
              {challenge?.message || 'הזן את קוד ה-SMS שנשלח אליך לצורך אימות הסנכרון'}
            </p>
            
            <div className="pt-2 pb-2 flex justify-center" dir="ltr">
              <Controller
                name="otpCode"
                control={control}
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <PremiumInput
                    {...fieldProps}
                    value={value}
                    onChange={(e) =>
                      onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))
                    }
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    className="text-center tracking-[0.35em] font-bold text-lg"
                  />
                )}
              />
            </div>

            <div className="flex items-center gap-3 pt-4 justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-bold text-xs h-10 border-border cursor-pointer"
                onClick={() => setSync({ challenge: null })}
                disabled={isSubmittingOtp}
              >
                בטל סנכרון
              </Button>
              <Button
                type="submit"
                className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                disabled={isSubmittingOtp || otpCode.length < OTP_MIN_LENGTH}
              >
                {isSubmittingOtp ? 'מאמת...' : 'אשר קוד והמשך'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
