import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SyncDialogProps {
  open: boolean;
}

export function SyncDialog({ open }: SyncDialogProps) {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (!open) {
      setProgress(12);
      return;
    }

    const id = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 9;
        return next >= 92 ? 92 : next;
      });
    }, 900);

    return () => clearInterval(id);
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none p-6 shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="text-right space-y-2">
          <DialogTitle className="text-lg font-black text-zinc-950 dark:text-white">
            מסנכרן נתוני בנק...
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            הסנכרון מתבצע ברקע ועשוי להימשך מספר דקות.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-zinc-800 dark:bg-zinc-200 transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 text-right">
            הסנכרון ממשיך גם בזמן שימוש באפליקציה
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
