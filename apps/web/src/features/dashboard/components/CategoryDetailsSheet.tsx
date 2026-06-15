import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SpendingCategoryDetailsCard } from './SpendingCategoryDetailsCard';
import type { SpendingCategoryItem, SpendingTransactionItem } from '../types';

interface CategoryDetailsSheetProps {
  category: SpendingCategoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  isTransactionExcluded: (
    categoryName: string,
    txn: SpendingTransactionItem,
  ) => boolean;
  onToggleTransactionExcluded: (
    categoryName: string,
    txn: SpendingTransactionItem,
  ) => void;
  getDisplayReason?: (reason?: string) => string | null;
}

export function CategoryDetailsSheet({
  category,
  open,
  onOpenChange,
  isLoading,
  isTransactionExcluded,
  onToggleTransactionExcluded,
  getDisplayReason,
}: CategoryDetailsSheetProps) {
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
                <span className="h-10 w-10 flex items-center justify-center border border-border bg-background text-2xl shadow-sm">
                  {category?.emoji}
                </span>
                <span>{category?.name}</span>
              </SheetTitle>
              <SheetDescription className="text-[11px] font-black text-muted-foreground">
                פירוט תנועות והוצאות מהכרטיסים
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <SpendingCategoryDetailsCard
              category={category}
              isLoading={isLoading}
              isTransactionExcluded={isTransactionExcluded}
              onToggleTransactionExcluded={onToggleTransactionExcluded}
              getDisplayReason={getDisplayReason}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
