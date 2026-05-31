import { useState, useEffect } from 'react';
import { PremiumCard } from '@/components/ui/premium-card';
import type {
  SpendingCategoryItem,
  SpendingTransactionItem,
} from './SpendingCategoryGridCard';
import { cn } from '@/lib/utils';

interface SpendingCategoryDetailsCardProps {
  category: SpendingCategoryItem | null;
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

export function SpendingCategoryDetailsCard({
  category,
  isTransactionExcluded,
  onToggleTransactionExcluded,
  getDisplayReason,
}: SpendingCategoryDetailsCardProps) {
  const [displayLimit, setDisplayLimit] = useState(50);

  // Reset limit when category changes
  useEffect(() => {
    setDisplayLimit(50);
  }, [category?.name]);

  const transactions = category?.transactions ?? [];
  const visibleTransactions = transactions.slice(0, displayLimit);
  const hasMore = transactions.length > displayLimit;

  return (
    <PremiumCard className="flex h-[34rem] flex-col gap-3 overflow-hidden p-4">
      {category ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3 text-right">
            <h3 className="flex items-center gap-2 text-xl font-black text-foreground">
              <span>{category.emoji}</span>
              <span>{category.name}</span>
            </h3>
            <p
              className="shrink-0 text-sm font-black text-rose-600 dark:text-rose-400"
              dir="ltr"
            >
              {category.amount.toLocaleString('he-IL')} ₪
            </p>
            <p className="sr-only">
              {typeof category.count === 'number'
                ? `${category.count} תנועות`
                : ''}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-right">
            {transactions.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-muted-foreground/60">
                אין תנועות זמינות בקטגוריה זו
              </p>
            ) : (
              <>
                {visibleTransactions.map((txn, index) => {
                  const excluded = isTransactionExcluded(category.name, txn);
                  const displayReason = getDisplayReason?.(txn.reason) ?? null;
                  return (
                    <div
                      key={txn.id || `${txn.merchant}-${txn.date}-${index}`}
                      className="grid gap-2 border border-border bg-card px-3 py-2.5 dark:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black leading-snug text-foreground">
                            {txn.merchant}
                          </p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {txn.date}
                            {txn.cardLabel ? ` • ${txn.cardLabel}` : ''}
                          </p>
                        </div>
                        <p
                          className={cn(
                            'text-sm font-black',
                            excluded
                              ? 'text-muted-foreground/40 line-through'
                              : 'text-rose-600 dark:text-rose-400',
                          )}
                          dir="ltr"
                        >
                          -{txn.amount.toLocaleString('he-IL')} ₪
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleTransactionExcluded(category.name, txn)
                          }
                          className={cn(
                            'h-7 border px-2 text-xs font-bold transition-colors cursor-pointer',
                            excluded
                              ? 'border-border text-muted-foreground hover:bg-muted'
                              : 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400',
                          )}
                        >
                          {excluded ? 'החזר' : 'החרג'}
                        </button>
                        {displayReason ? (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {displayReason}
                          </span>
                        ) : null}
                        {txn.tags && txn.tags.length > 0 ? (
                          <span className="truncate text-xs font-bold text-muted-foreground/80">
                            {txn.tags.join(', ')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                
                {hasMore && (
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="w-full py-4 text-xs font-black text-muted-foreground hover:text-primary transition-colors border border-dashed border-border mb-2 cursor-pointer"
                  >
                    טען עוד תנועות ({transactions.length - displayLimit} נותרו)
                  </button>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-72 items-center justify-center text-center">
          <p className="max-w-52 text-sm font-semibold text-muted-foreground">
            בחר קטגוריה כדי לצפות בתנועות שמרכיבות אותה.
          </p>
        </div>
      )}
    </PremiumCard>
  );
}
