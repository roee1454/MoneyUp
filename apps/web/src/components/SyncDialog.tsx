import { useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PremiumButton } from '@/components/ui/premium-button';
import { DashboardRangePicker } from '@/features/dashboard/components/DashboardRangePicker';

interface SyncDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (startDate: string, endDate: string) => void;
  defaultStartDate: string;
  defaultEndDate: string;
  isSyncing: boolean;
  lastSyncTime?: string | null;
  autoPrompted?: boolean;
}

export function SyncDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  defaultStartDate,
  defaultEndDate,
  isSyncing,
  lastSyncTime,
  autoPrompted = false,
}: SyncDialogProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  useEffect(() => {
    if (isOpen) {
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
    }
  }, [isOpen, defaultStartDate, defaultEndDate]);

  const handleConfirmSync = () => {
    onConfirm(startDate, endDate);
    onOpenChange(false);
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('he-IL', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'טרם בוצע סנכרון';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-card border border-border/30 rounded-none p-6 shadow-2xl"
        dir="rtl"
        showCloseButton={true}
      >
        <DialogHeader className="pb-4 border-b border-border/30 text-right">
          <DialogTitle className="text-base font-black text-foreground">
            עדכון וסנכרון נתונים
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground mt-1.5">
            {autoPrompted
              ? 'מומלץ לעדכן את הנתונים כעת על מנת להציג מידע פיננסי מעודכן ומדויק.'
              : 'פעולה זו תבצע סנכרון מחדש מול מוסדות הפיננסים המחוברים עבור טווח התאריכים המוגדר.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {autoPrompted ? (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 flex gap-3 rounded-none text-right">
              <Warning
                className="h-5.5 w-5.5 text-amber-500 shrink-0 mt-0.5"
                weight="fill"
              />
              <div className="space-y-1">
                <p className="text-xs font-black text-amber-600 dark:text-amber-400">
                  הנתונים אינם מעודכנים לחלוטין
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                  עברה יותר משעה מאז הסנכרון האחרון ({formattedLastSync}). מומלץ לבצע סנכרון כעת.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border border-border/30 p-3 flex gap-2.5 rounded-none text-right">
              <Warning
                className="h-5 w-5 text-foreground/80 shrink-0 mt-0.5"
                weight="fill"
              />
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">שים לב!</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  הסנכרון ימשוך את כל התנועות והסיווגים עבור טווח התאריכים שתבחר. באפשרותך להתאים את הטווח לפי הצורך.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground block text-right">
              טווח תאריכים לסנכרון
            </label>
            <div className="border border-border/30 bg-muted/5 px-3 py-2">
              <DashboardRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                className="w-full"
                pickerClassName="flex-1 h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/30 flex flex-col sm:flex-row gap-2 w-full justify-end">
          <PremiumButton
            variant="outline"
            size="sm"
            className="w-full sm:w-auto font-bold h-10"
            onClick={() => onOpenChange(false)}
            disabled={isSyncing}
          >
            ביטול
          </PremiumButton>
          <PremiumButton
            variant="default"
            size="sm"
            className="w-full sm:w-auto font-bold h-10 animate-soft-shimmer"
            onClick={handleConfirmSync}
            disabled={isSyncing}
          >
            {isSyncing ? 'בסנכרון...' : 'התחל סנכרון'}
          </PremiumButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
