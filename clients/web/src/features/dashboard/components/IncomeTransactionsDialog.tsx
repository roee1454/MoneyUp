import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToggleTransactionDuplicate } from '@/hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IncomeTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Array<{
    id: string;
    bankId: string;
    accountNumber: string;
    accountKey: string;
    accountLabel: string;
    amount: number;
    date: string;
    description: string;
    isDuplicate?: boolean;
  }>;
}

function formatMoney(value: number): string {
  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
}

export function IncomeTransactionsDialog({
  open,
  onOpenChange,
  transactions,
}: IncomeTransactionsDialogProps) {
  const [displayLimit, setDisplayLimit] = useState(50);
  const queryClient = useQueryClient();
  const toggleDuplicate = useToggleTransactionDuplicate();

  useEffect(() => {
    if (open) setDisplayLimit(50);
  }, [open]);

  const handleToggleDuplicate = async (txn: (typeof transactions)[0]) => {
    const newState = !txn.isDuplicate;
    try {
      await toggleDuplicate.mutateAsync({
        bankId: txn.bankId,
        accountNumber: txn.accountNumber,
        id: txn.id,
        isDuplicate: newState,
      });

      // Optimistically update query data or just invalidate
      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      toast.success(newState ? 'התנועה סומנה ככפולה' : 'התנועה הוחזרה לחישוב');
    } catch (e) {
      // Error handled by hook
    }
  };

  const visibleTransactions = transactions.slice(0, displayLimit);
  const hasMore = transactions.length > displayLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-none border border-border bg-card p-5 shadow-2xl"
        dir="rtl"
      >
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-black text-foreground">
            הכנסות אחרונות
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            תנועות חיוביות מחשבונות בנק. ניתן לסמן תנועות כפולות כדי להחריגן
            מהחישובים.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-112 space-y-2 overflow-y-auto pr-1">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-muted-foreground">
                אין הכנסות בטווח התאריכים הנבחר
              </p>
            </div>
          ) : (
            <>
              {visibleTransactions.map((txn, index) => (
                <div
                  key={`${txn.accountKey}:${txn.id || txn.date}:${index}`}
                  className={cn(
                    'flex items-center justify-between gap-4 border border-border px-4 py-3 transition-all group',
                    txn.isDuplicate
                      ? 'bg-muted/10 opacity-60 border-dashed'
                      : 'bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0 text-right">
                      <p
                        className={cn(
                          'truncate text-sm font-black text-foreground',
                          txn.isDuplicate && 'line-through decoration-rose-500',
                        )}
                      >
                        {txn.description}
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {txn.date
                          ? new Date(txn.date).toLocaleDateString('he-IL')
                          : '-'}{' '}
                        • {txn.accountLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <p
                      className={cn(
                        'text-sm font-black',
                        txn.isDuplicate
                          ? 'text-muted-foreground'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                      dir="ltr"
                    >
                      {formatMoney(txn.amount)}
                    </p>
                    <button
                      onClick={() => handleToggleDuplicate(txn)}
                      disabled={toggleDuplicate.isPending}
                      className={cn(
                        'px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border transition-all cursor-pointer select-none',
                        txn.isDuplicate
                          ? 'border-rose-600 bg-rose-600 text-white'
                          : 'border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white',
                      )}
                    >
                      {txn.isDuplicate ? 'בטל כפילות' : 'סמן ככפול'}
                    </button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 50)}
                  className="w-full py-4 text-xs font-black text-muted-foreground hover:text-primary transition-colors border border-dashed border-border mb-2 cursor-pointer"
                >
                  טען עוד תנועות ({transactions.length - displayLimit} נותרו)
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
