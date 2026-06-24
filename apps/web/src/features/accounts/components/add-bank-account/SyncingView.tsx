import { Check, CircleNotch, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { BankIcon } from '../BankIcon';
import { Button } from '@/components/ui/button';
import { SYNC_STEPS, SYNC_STEP_KEYS } from './constants';
import type { SyncingViewProps } from './types';

/** Animated progress view shown while the scraper connects and syncs, supporting sync failure states. */
export function SyncingView({
  bankId,
  bankName,
  syncStep,
  errorMsg,
  onRetry,
  onClose,
}: SyncingViewProps) {
  const getStepStatus = (stepKey: string) => {
    const currentIndex = (SYNC_STEP_KEYS as readonly string[]).indexOf(syncStep || 'logging_in');
    const stepIndex = (SYNC_STEP_KEYS as readonly string[]).indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const isFailed = !!errorMsg;

  return (
    <div className="animate-in fade-in-50 duration-300 slide-in-from-bottom-1 min-h-[380px] flex flex-col items-center justify-center gap-6">
      {/* Icon Header */}
      <div className="relative flex items-center justify-center h-28 w-28 shrink-0">
        {!isFailed ? (
          <>
            <span className="absolute h-20 w-20 rounded-full border border-border animate-ping [animation-duration:2s]" />
            <span className="absolute h-16 w-16 rounded-full bg-muted animate-pulse" />
          </>
        ) : (
          <span className="absolute h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20" />
        )}
        <div className="relative z-10">
          <BankIcon
            bankId={bankId}
            shape="circle"
            size="lg"
          />
          {isFailed && (
            <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-full bg-rose-500 grid place-items-center border-2 border-card z-20 animate-in zoom-in-50 duration-200">
              <X className="h-3 w-3 text-white" weight="bold" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 text-center w-full">
        <p className="text-base font-black text-foreground">
          {isFailed ? `החיבור ל${bankName} נכשל` : `מבצע נסיון חיבור ל${bankName}`}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          {isFailed ? 'אנא קרא את השגיאה הבאה ונסה שוב' : 'אנא המתן, מבצע סנכרון מאובטח..'}
        </p>
      </div>

      {/* Step checklist */}
      <div className="w-full bg-muted/20 border border-border p-4 space-y-4 rounded-none">
        {SYNC_STEPS.map((s) => {
          const status = getStepStatus(s.key);
          const stepFailed = isFailed && status === 'active';

          return (
            <div
              key={s.key}
              className={cn(
                'flex items-center justify-start gap-3 transition-all duration-300',
                status === 'completed' && 'text-emerald-600 font-bold',
                stepFailed && 'text-rose-600 font-bold',
                status === 'active' && !isFailed && 'text-primary font-black',
                status === 'pending' && 'text-muted-foreground/50 font-semibold'
              )}
            >
              <div className="h-5 w-5 shrink-0 flex items-center justify-center">
                {stepFailed ? (
                  <div className="h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center animate-in zoom-in-50 duration-200">
                    <X className="h-2.5 w-2.5 text-white" weight="bold" />
                  </div>
                ) : status === 'completed' ? (
                  <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in-50 duration-200">
                    <Check className="h-2.5 w-2.5 text-white" weight="bold" />
                  </div>
                ) : status === 'active' ? (
                  <CircleNotch className="h-4 w-4 animate-spin text-primary" weight="bold" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-border" />
                )}
              </div>
              <span className="text-sm leading-none">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Failure details & retry button if connection failed */}
      {isFailed && (
        <div className="w-full space-y-4 animate-in fade-in duration-300">
          <div className="w-full text-right bg-rose-500/5 border border-rose-500/20 p-4 rounded-none">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-relaxed">
              {errorMsg || 'שגיאת התחברות לא ידועה. אנא ודא שהפרטים שהזנת נכונים ונסה שוב.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={onRetry}
              className="w-full rounded-none font-black text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              חזור להזנת פרטים
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full rounded-none font-black text-xs h-10 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
