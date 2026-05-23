import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, CreditCard, Sparkle } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PremiumCard } from '@/components/ui/premium-card';
import { getBankName } from '@/lib/bank-branding';
import type { SpendingScansResponse } from '@/hooks/useAi';
import {
  SpendingCategoryGridCard,
  type SpendingCategoryItem,
  type SpendingTransactionItem,
} from './dashboard/SpendingCategoryGridCard';
import { SpendingCategoryDetailsCard } from './dashboard/SpendingCategoryDetailsCard';

interface SpendingCategoriesProps {
  scans?: SpendingScansResponse | null;
  period: 'current' | 'previous' | 'both';
  startDate: string;
  endDate: string;
  minStartDate?: string;
  maxEndDate?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  isLoadingScans?: boolean;
  isRefreshingScans?: boolean;
  hasConnectedAccounts?: boolean;
  canUseAiAnnotation?: boolean;
  isAnnotatingWithAi?: boolean;
  isWidgetBusy?: boolean;
  onAnnotateWithAi?: () => void;
  onGoToAiStudio?: () => void;
  onExcludedExpensesChange?: (amount: number) => void;
}

const categoryEmojis: Record<string, string> = {
  מזון: '🍔',
  ביגוד: '👗',
  בידור: '🎬',
  בילויים: '🎉',
  אלקטרוניקה: '💻',
  אונליין: '🛍️',
  'דלק/תחבורה': '⛽',
  סופר: '🛒',
  מנויים: '📱',
  'לא מסווג': '📦',
};

function getTransactionKey(
  categoryName: string,
  txn: SpendingTransactionItem,
): string {
  return `${categoryName}::${txn.id ?? `${txn.merchant}|${txn.date}|${txn.amount}`}`;
}

function getDisplayReason(reason?: string): string | null {
  if (!reason) return null;
  const normalized = reason.toLowerCase();
  if (normalized.includes('matched rule-based category')) return null;
  if (normalized.includes('uncategorized')) return 'סווג כלא מסווג';
  if (normalized.includes('credit-company expense'))
    return 'הוצאה מכרטיס אשראי';
  return null;
}

export function SpendingCategories({
  scans,
  period,
  startDate,
  endDate,
  isLoadingScans = false,
  isRefreshingScans = false,
  hasConnectedAccounts = false,
  canUseAiAnnotation = false,
  isAnnotatingWithAi = false,
  isWidgetBusy = false,
  onAnnotateWithAi,
  onGoToAiStudio,
  onExcludedExpensesChange,
}: SpendingCategoriesProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<SpendingCategoryItem | null>(null);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [excludedTransactionKeys, setExcludedTransactionKeys] = useState<
    Set<string>
  >(new Set());
  const [selectedCardKeys, setSelectedCardKeys] = useState<Set<string>>(
    new Set(),
  );

  const displayCategories = useMemo<SpendingCategoryItem[]>(() => {
    if (!hasConnectedAccounts || !scans) return [];

    return scans.categories.map((category) => ({
      name: category.name,
      emoji: categoryEmojis[category.name] || '📦',
      amount: category.amount,
      count: category.count,
      transactions: (scans.categoryTransactions[category.name] ?? [])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((txn) => ({
          id: txn.transactionId,
          merchant: txn.merchant,
          date: txn.date ? new Date(txn.date).toLocaleDateString('he-IL') : '',
          amount: txn.amount,
          confidence: txn.confidence,
          reason: txn.reason,
          tags: txn.tags,
          cardKey:
            String(txn.bankId ?? '').trim() &&
            String(txn.cardLast4 ?? '').trim()
              ? `${String(txn.bankId)}:${String(txn.cardLast4)}`
              : undefined,
          cardLabel:
            String(txn.bankId ?? '').trim() &&
            String(txn.cardLast4 ?? '').trim()
              ? `${getBankName(txn.bankId)} • ${String(txn.cardLast4)}`
              : undefined,
        })),
    }));
  }, [hasConnectedAccounts, scans]);

  const cardOptions = useMemo(() => {
    const optionMap = new Map<string, string>();
    for (const category of displayCategories) {
      for (const txn of category.transactions) {
        if (txn.cardKey && txn.cardLabel && !optionMap.has(txn.cardKey)) {
          optionMap.set(txn.cardKey, txn.cardLabel);
        }
      }
    }
    return Array.from(optionMap.entries()).map(([id, label]) => ({
      id,
      label,
    }));
  }, [displayCategories]);

  const cardFilteredCategories = useMemo<SpendingCategoryItem[]>(() => {
    if (selectedCardKeys.size === 0) return displayCategories;
    return displayCategories.map((category) => {
      const filteredTransactions = category.transactions.filter(
        (txn) => !!txn.cardKey && selectedCardKeys.has(txn.cardKey),
      );
      return {
        ...category,
        amount: filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0),
        count: filteredTransactions.length,
        transactions: filteredTransactions,
      };
    });
  }, [displayCategories, selectedCardKeys]);

  const unmappedTransactionsCount = useMemo(
    () =>
      displayCategories.reduce(
        (sum, category) =>
          sum + category.transactions.filter((txn) => !txn.cardKey).length,
        0,
      ),
    [displayCategories],
  );

  const displayCategoriesWithExclusionMeta = useMemo<
    SpendingCategoryItem[]
  >(() => {
    return cardFilteredCategories.map((category) => {
      const excludedTransactions = category.transactions.filter((txn) =>
        excludedTransactionKeys.has(getTransactionKey(category.name, txn)),
      );
      const excludedAmount = excludedTransactions.reduce(
        (sum, txn) => sum + txn.amount,
        0,
      );
      return {
        ...category,
        amount: Math.max(category.amount - excludedAmount, 0),
        totalCount: category.transactions.length,
        excludedCount: excludedTransactions.length,
      };
    });
  }, [cardFilteredCategories, excludedTransactionKeys]);

  const excludedTotalAmount = useMemo(() => {
    return displayCategories.reduce((sum, category) => {
      return (
        sum +
        category.transactions.reduce((categorySum, txn) => {
          return excludedTransactionKeys.has(
            getTransactionKey(category.name, txn),
          )
            ? categorySum + txn.amount
            : categorySum;
        }, 0)
      );
    }, 0);
  }, [displayCategories, excludedTransactionKeys]);

  const baseCategoryOrder = useMemo(
    () =>
      [...cardFilteredCategories]
        .sort((a, b) => b.amount - a.amount)
        .map((category) => category.name),
    [cardFilteredCategories],
  );
  const sortedCategories = useMemo(() => {
    const order = new Map(
      baseCategoryOrder.map((name, index) => [name, index]),
    );
    return [...displayCategoriesWithExclusionMeta].sort(
      (a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0),
    );
  }, [baseCategoryOrder, displayCategoriesWithExclusionMeta]);

  const activeCategory = useMemo(() => {
    if (
      selectedCategory &&
      sortedCategories.some(
        (category) => category.name === selectedCategory.name,
      )
    ) {
      return (
        sortedCategories.find(
          (category) => category.name === selectedCategory.name,
        ) ?? selectedCategory
      );
    }
    return sortedCategories[0] ?? null;
  }, [selectedCategory, sortedCategories]);

  const dialogCategory = useMemo(() => {
    if (!selectedCategory) return null;
    return (
      sortedCategories.find(
        (category) => category.name === selectedCategory.name,
      ) ?? selectedCategory
    );
  }, [selectedCategory, sortedCategories]);

  const showShimmer = isLoadingScans || (hasConnectedAccounts && !scans);
  const shouldShimmerSpendingValues = showShimmer || isRefreshingScans;
  const aiAction = hasConnectedAccounts ? (
    canUseAiAnnotation && onAnnotateWithAi ? (
      <button
        type="button"
        onClick={onAnnotateWithAi}
        disabled={isAnnotatingWithAi || isWidgetBusy}
        className="inline-flex h-8 items-center justify-center gap-1.5 border border-primary bg-primary px-3 text-[11px] font-black text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isAnnotatingWithAi ? (
          <CircleNotch className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkle className="h-3.5 w-3.5" weight="duotone" />
        )}
        <span>{isAnnotatingWithAi ? 'מסווג...' : 'סיווג חכם'}</span>
      </button>
    ) : onGoToAiStudio ? (
      <button
        type="button"
        onClick={onGoToAiStudio}
        className="inline-flex h-8 items-center justify-center gap-1.5 border border-primary bg-primary px-3 text-[11px] font-black text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Sparkle className="h-3.5 w-3.5" weight="duotone" />
        <span>הוסף סיווג חכם</span>
      </button>
    ) : null
  ) : null;

  function isTransactionExcluded(
    categoryName: string,
    txn: SpendingTransactionItem,
  ): boolean {
    return excludedTransactionKeys.has(getTransactionKey(categoryName, txn));
  }

  function toggleTransactionExcluded(
    categoryName: string,
    txn: SpendingTransactionItem,
  ) {
    const key = getTransactionKey(categoryName, txn);
    setExcludedTransactionKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleCategorySelect(category: SpendingCategoryItem) {
    setSelectedCategory(category);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      setIsMobileDialogOpen(true);
    }
  }

  useEffect(() => {
    if (
      selectedCategory &&
      !sortedCategories.some(
        (category) => category.name === selectedCategory.name,
      )
    ) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, sortedCategories]);

  useEffect(() => {
    setExcludedTransactionKeys(new Set());
    setSelectedCardKeys(new Set());
  }, [period, startDate, endDate]);

  useEffect(() => {
    onExcludedExpensesChange?.(excludedTotalAmount);
  }, [excludedTotalAmount, onExcludedExpensesChange]);

  if (!hasConnectedAccounts) {
    return (
      <PremiumCard className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden border-dashed px-6 py-14 text-center">
        <div className="absolute inset-0 bg-linear-to-br from-muted/20 via-background to-muted/40" />
        <div className="relative z-10 max-w-md space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background shadow-inner">
            <CreditCard
              className="h-7 w-7 text-muted-foreground"
              weight="duotone"
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black tracking-tight text-foreground">
              ניתוח הוצאות דורש חברת אשראי
            </h3>
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
              חבר חברת אשראי כדי לראות קטגוריות והוצאות.
            </p>
          </div>
        </div>
      </PremiumCard>
    );
  }

  return (
    <div className="relative grid gap-5">
      {(isWidgetBusy || isRefreshingScans) && !showShimmer ? (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 border border-border bg-background px-4 py-2 text-xs font-black text-foreground shadow-lg">
          {isAnnotatingWithAi
            ? 'מסווג בתי עסק ומעדכן נתונים...'
            : 'מעדכן נתוני הוצאות...'}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <SpendingCategoryGridCard
          categories={sortedCategories}
          activeCategoryName={activeCategory?.name}
          cardOptions={cardOptions}
          selectedCardIds={Array.from(selectedCardKeys)}
          isLoading={showShimmer}
          isBusy={isWidgetBusy}
          unmappedTransactionsCount={unmappedTransactionsCount}
          shouldShimmerValues={shouldShimmerSpendingValues}
          action={aiAction}
          onCardFilterChange={(ids) => setSelectedCardKeys(new Set(ids))}
          onCategorySelect={handleCategorySelect}
        />

        <div className="hidden xl:block">
          <SpendingCategoryDetailsCard
            category={activeCategory}
            isTransactionExcluded={isTransactionExcluded}
            onToggleTransactionExcluded={toggleTransactionExcluded}
            getDisplayReason={getDisplayReason}
          />
        </div>
      </div>

      <div className="hidden lg:block xl:hidden">
        <SpendingCategoryDetailsCard
          category={activeCategory}
          isTransactionExcluded={isTransactionExcluded}
          onToggleTransactionExcluded={toggleTransactionExcluded}
          getDisplayReason={getDisplayReason}
        />
      </div>

      {dialogCategory ? (
        <Dialog
          open={isMobileDialogOpen}
          onOpenChange={(open) => {
            setIsMobileDialogOpen(open);
            if (!open) setSelectedCategory(null);
          }}
        >
          <DialogContent
            className="max-w-md rounded-none border border-border bg-card p-6 shadow-2xl"
            dir="rtl"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black text-foreground">
                <span>{dialogCategory.emoji}</span>
                <span>{dialogCategory.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground">
                {dialogCategory.amount.toLocaleString('he-IL')} ₪
                {typeof dialogCategory.count === 'number'
                  ? ` • ${dialogCategory.count} תנועות`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <SpendingCategoryDetailsCard
                category={dialogCategory}
                isTransactionExcluded={isTransactionExcluded}
                onToggleTransactionExcluded={toggleTransactionExcluded}
                getDisplayReason={getDisplayReason}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
