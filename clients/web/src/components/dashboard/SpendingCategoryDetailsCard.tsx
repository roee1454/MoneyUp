import { PremiumCard } from '@/components/ui/premium-card';
import type { SpendingCategoryItem, SpendingTransactionItem } from './SpendingCategoryGridCard';
import { cn } from '@/lib/utils';

interface SpendingCategoryDetailsCardProps {
  category: SpendingCategoryItem | null;
  isTransactionExcluded: (categoryName: string, txn: SpendingTransactionItem) => boolean;
  onToggleTransactionExcluded: (categoryName: string, txn: SpendingTransactionItem) => void;
  getDisplayReason?: (reason?: string) => string | null;
}

export function SpendingCategoryDetailsCard({
  category,
  isTransactionExcluded,
  onToggleTransactionExcluded,
  getDisplayReason,
}: SpendingCategoryDetailsCardProps) {
  return (
    <PremiumCard className="flex h-[34rem] flex-col gap-3 overflow-hidden p-4">
      {category ? (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3 text-right dark:border-zinc-900">
            <h3 className="flex items-center gap-2 text-xl font-black text-zinc-950 dark:text-white">
              <span>{category.emoji}</span>
              <span>{category.name}</span>
            </h3>
            <p className="shrink-0 text-sm font-black text-rose-600 dark:text-rose-400" dir="ltr">
              {category.amount.toLocaleString('he-IL')} ₪
            </p>
            <p className="sr-only">
              {typeof category.count === 'number' ? `${category.count} תנועות` : ''}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {category.transactions.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                אין תנועות זמינות בקטגוריה זו
              </p>
            ) : (
              category.transactions.map((txn, index) => {
                const excluded = isTransactionExcluded(category.name, txn);
                const displayReason = getDisplayReason?.(txn.reason) ?? null;
                return (
                  <div
                    key={txn.id || `${txn.merchant}-${txn.date}-${index}`}
                    className="grid gap-2 border border-zinc-100 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-900 dark:bg-zinc-900/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black leading-snug text-zinc-900 dark:text-zinc-100">
                          {txn.merchant}
                        </p>
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {txn.date}
                          {txn.cardLabel ? ` • ${txn.cardLabel}` : ''}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'text-sm font-black',
                          excluded
                            ? 'text-zinc-400 line-through dark:text-zinc-500'
                            : 'text-rose-600 dark:text-rose-400',
                        )}
                        dir="ltr"
                      >
                        -{txn.amount.toLocaleString('he-IL')} ₪
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleTransactionExcluded(category.name, txn)}
                        className={cn(
                          'h-7 border px-2 text-xs font-bold transition-colors',
                          excluded
                            ? 'border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
                            : 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400',
                        )}
                      >
                        {excluded ? 'החזר' : 'החרג'}
                      </button>
                      {displayReason ? (
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {displayReason}
                        </span>
                      ) : null}
                      {txn.tags && txn.tags.length > 0 ? (
                        <span className="truncate text-xs font-bold text-zinc-500 dark:text-zinc-400">
                          {txn.tags.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="flex min-h-72 items-center justify-center text-center">
          <p className="max-w-52 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            בחר קטגוריה כדי לצפות בתנועות שמרכיבות אותה.
          </p>
        </div>
      )}
    </PremiumCard>
  );
}
