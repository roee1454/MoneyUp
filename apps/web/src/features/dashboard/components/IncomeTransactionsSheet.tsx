import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TrendUp } from '@phosphor-icons/react';
import { IncomeTransactionsDetailsCard } from './IncomeTransactionsDetailsCard';

interface IncomeTransactionsSheetProps {
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
  isLoading?: boolean;
}

export function IncomeTransactionsSheet({
  open,
  onOpenChange,
  transactions,
  isLoading = false,
}: IncomeTransactionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-xl p-0 border-r border-border shadow-2xl"
        dir="rtl"
        showCloseButton={false}
      >
        <div className="h-full flex flex-col bg-card">
          <SheetHeader className="p-6 border-b border-border bg-muted/20">
            <div className="space-y-1.5 text-right">
              <SheetTitle className="text-2xl font-black text-foreground flex items-center gap-3">
                <span className="h-10 w-10 flex items-center justify-center border border-border bg-background shadow-sm text-emerald-600">
                  <TrendUp className="h-6 w-6" weight="bold" />
                </span>
                <span>הכנסות אחרונות</span>
              </SheetTitle>
              <SheetDescription className="text-[11px] font-black text-muted-foreground">
                תנועות חיוביות מחשבונות בנק • החרגת כפילויות
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <IncomeTransactionsDetailsCard
              transactions={transactions}
              isLoading={isLoading}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
