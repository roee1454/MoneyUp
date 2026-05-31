import type { ReactNode } from 'react';
import {
  FilterChips,
  type FilterChipOption,
} from '@/components/ui/filter-chips';
import { PremiumCard } from '@/components/ui/premium-card';
import { cn } from '@/lib/utils';

export interface SpendingTransactionItem {
  id?: string;
  merchant: string;
  date: string;
  rawDate: string;
  amount: number;
  originalCategory?: string;
  confidence?: number;
  reason?: string;
  tags?: string[];
  cardKey?: string;
  cardLabel?: string;
}

export interface SpendingCategoryItem {
  name: string;
  emoji: string;
  amount: number;
  transactions: SpendingTransactionItem[];
  count?: number;
  totalCount?: number;
  excludedCount?: number;
}

interface SpendingCategoryGridCardProps {
  categories: SpendingCategoryItem[];
  allExpensesCategory?: SpendingCategoryItem | null;
  activeCategoryName?: string;
  cardOptions: FilterChipOption[];
  selectedCardIds: string[];
  isLoading?: boolean;
  isBusy?: boolean;
  unmappedTransactionsCount?: number;
  shouldShimmerValues?: boolean;
  action?: ReactNode;
  onCardFilterChange: (ids: string[]) => void;
  onCategorySelect: (category: SpendingCategoryItem) => void;
}

export function SpendingCategoryGridCard({
  categories,
  allExpensesCategory,
  activeCategoryName,
  cardOptions,
  selectedCardIds,
  isLoading = false,
  isBusy = false,
  unmappedTransactionsCount = 0,
  shouldShimmerValues = false,
  action,
  onCardFilterChange,
  onCategorySelect,
}: SpendingCategoryGridCardProps) {
  return (
    <PremiumCard className="flex h-136 flex-col gap-4 overflow-hidden">
      {cardOptions.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips
              options={cardOptions}
              selectedIds={selectedCardIds}
              onChange={onCardFilterChange}
              allLabel="כל הכרטיסים"
              disabled={isBusy}
              className="min-w-0"
            />
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {selectedCardIds.length > 0 && unmappedTransactionsCount > 0 ? (
            <p className="text-[11px] font-semibold text-muted-foreground">
              חלק מהתנועות אינן משויכות לכרטיס ספציפי ומוצגות רק בתצוגת "כל
              הכרטיסים".
            </p>
          ) : null}
        </div>
      ) : action ? (
        <div className="flex justify-end">{action}</div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square animate-pulse border border-border bg-muted/30 p-3"
            >
              <div className="mx-auto h-7 w-7 rounded-full bg-muted" />
              <div className="mx-auto mt-4 h-3 w-16 bg-muted" />
              <div className="mx-auto mt-3 h-4 w-20 bg-muted" />
            </div>
          ))
        ) : (
          <>
            {allExpensesCategory && (
              <button
                type="button"
                onClick={() => onCategorySelect(allExpensesCategory)}
                disabled={isBusy}
                className={cn(
                  'aspect-square border p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-60',
                  'flex flex-col items-center justify-center gap-2',
                  !activeCategoryName || activeCategoryName === allExpensesCategory.name
                    ? 'border-primary bg-primary/5 shadow-sm dark:bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50 dark:hover:bg-muted/20',
                )}
              >
                <span className="text-3xl">{allExpensesCategory.emoji}</span>
                <span className="text-xs font-black text-foreground">
                  {allExpensesCategory.name}
                </span>
                <span
                  className="text-xs font-black text-rose-600 dark:text-rose-400"
                  dir="ltr"
                >
                  {shouldShimmerValues ? (
                    <span className="inline-block h-3.5 w-16 animate-soft-shimmer bg-muted" />
                  ) : (
                    <>-{allExpensesCategory.amount.toLocaleString('he-IL')} ₪</>
                  )}
                </span>
              </button>
            )}

            {categories.length === 0 && !allExpensesCategory ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  אין נתוני הוצאות בטווח הנבחר
                </p>
              </div>
            ) : (
              categories.map((category) => {
                const isActive = activeCategoryName === category.name;
                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => onCategorySelect(category)}
                    disabled={isBusy}
                    className={cn(
                      'aspect-square border p-3 text-center transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      'flex flex-col items-center justify-center gap-2',
                      isActive
                        ? 'border-primary bg-primary/5 shadow-sm dark:bg-primary/10'
                        : (category.excludedCount ?? 0) > 0
                          ? 'border-rose-200 bg-rose-50 hover:bg-rose-100/50 dark:border-rose-900/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/20'
                          : 'border-border bg-card hover:bg-muted/50 dark:hover:bg-muted/20',
                    )}
                  >
                    <span className="text-3xl">{category.emoji}</span>
                    <span className="text-xs font-black text-foreground">
                      {category.name}
                    </span>
                    <span
                      className="text-xs font-black text-rose-600 dark:text-rose-400"
                      dir="ltr"
                    >
                      {shouldShimmerValues ? (
                        <span className="inline-block h-3.5 w-16 animate-soft-shimmer bg-muted" />
                      ) : (
                        <>-{category.amount.toLocaleString('he-IL')} ₪</>
                      )}
                    </span>
                    {(category.excludedCount ?? 0) > 0 ? (
                      <span className="border border-rose-200 bg-white/70 px-1.5 py-0.5 text-[10px] font-black text-rose-700 dark:border-rose-900 dark:bg-zinc-950/70 dark:text-rose-400">
                        הוחרגו {category.excludedCount}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </>
        )}
      </div>
    </PremiumCard>
  );
}
