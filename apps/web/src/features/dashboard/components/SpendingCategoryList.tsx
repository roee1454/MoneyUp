import { cn } from '@/lib/utils';
import { CaretLeft } from '@phosphor-icons/react';
import type { SpendingCategoryItem } from '../types';
import { PremiumMotionCard } from '@/components/ui/premium-motion-card';
import { motion, useReducedMotion } from 'motion/react';

interface SpendingCategoryListProps {
  categories: SpendingCategoryItem[];
  allExpensesCategory?: SpendingCategoryItem | null;
  onCategorySelect: (category: SpendingCategoryItem) => void;
  isLoading?: boolean;
}

export function SpendingCategoryList({
  categories,
  allExpensesCategory,
  onCategorySelect,
  isLoading = false,
}: SpendingCategoryListProps) {
  const maxAmount = Math.max(...categories.map((c) => c.amount), 1);
  const shouldReduceMotion = useReducedMotion();
  const isAnimated = !shouldReduceMotion;

  if (isLoading && categories.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 w-full animate-pulse border border-border bg-muted/20 p-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-muted" />
                <div className="h-1.5 w-full bg-muted/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allExpensesCategory && (
        <PremiumMotionCard
          onClick={() => onCategorySelect(allExpensesCategory)}
          whileHover={{}}
          whileTap={{}}
          className={cn(
            'group w-full flex items-center gap-4 p-4 bg-linear-to-br from-primary/5 via-card to-muted/25 border-dashed border-border/80',
          )}
        >
          <div className="h-11 w-11 shrink-0 border border-border/80 flex items-center justify-center bg-card text-2xl shadow-xs transition-transform duration-300 group-hover:scale-105 group-hover:border-primary/20">
            {allExpensesCategory.emoji}
          </div>

          <div className="flex-1 min-w-0 space-y-2 text-right">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-foreground tracking-tight">
                {allExpensesCategory.name}
              </span>
              <span className="text-base font-black text-foreground" dir="ltr">
                {allExpensesCategory.amount.toLocaleString('he-IL')} ₪
              </span>
            </div>

            <div className="relative h-1.5 w-full bg-muted/40 overflow-hidden">
              <motion.div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary/60 to-primary/30 shadow-[0_0_8px_rgba(var(--primary),0.15)] rounded-full"
                initial={isAnimated ? { width: 0 } : { width: '100%' }}
                whileInView={isAnimated ? { width: '100%' } : {}}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              <span className="group-hover:text-foreground transition-colors">
                {allExpensesCategory.count} תנועות בכל הקטגוריות
              </span>
            </div>
          </div>
          <CaretLeft className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
        </PremiumMotionCard>
      )}

      {categories.map((category) => {
        const percentage = (category.amount / maxAmount) * 100;

        return (
          <PremiumMotionCard
            key={category.name}
            onClick={() => onCategorySelect(category)}
            whileHover={{}}
            whileTap={{}}
            className={cn(
              'group w-full flex items-center gap-4 p-4 border-border/80',
            )}
          >
            <div className="h-11 w-11 shrink-0 border border-border/80 flex items-center justify-center bg-linear-to-br from-card to-muted/25 text-2xl shadow-xs transition-transform duration-300 group-hover:scale-105 group-hover:border-primary/20">
              {category.emoji}
            </div>

            <div className="flex-1 min-w-0 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-foreground tracking-tight">
                  {category.name}
                </span>
                <span
                  className="text-base font-black text-rose-600 dark:text-rose-400"
                  dir="ltr"
                >
                  -{category.amount.toLocaleString('he-IL')} ₪
                </span>
              </div>

              <div className="relative h-1.5 w-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="absolute top-0 right-0 h-full bg-gradient-to-l from-rose-500/80 to-rose-400/40 shadow-[0_0_8px_rgba(244,63,94,0.15)] rounded-full"
                  initial={isAnimated ? { width: 0 } : { width: `${percentage}%` }}
                  whileInView={isAnimated ? { width: `${percentage}%` } : {}}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                <span className="group-hover:text-foreground transition-colors">
                  {category.count} תנועות
                </span>
                {category.excludedCount ? (
                  <span className="text-rose-500 font-black px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-[9px] uppercase tracking-tighter">
                    הוחרגו {category.excludedCount}
                  </span>
                ) : null}
              </div>
            </div>
            <CaretLeft className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
          </PremiumMotionCard>
        );
      })}
    </div>
  );
}
