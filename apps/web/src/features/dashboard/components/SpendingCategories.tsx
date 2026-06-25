import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, CreditCard, Sparkle } from '@phosphor-icons/react';
import type { SpendingScansResponse } from '@/hooks/useAiSpending';
import { PremiumButton } from '@/components/ui/premium-button';
import type { SpendingCategoryItem, SpendingTransactionItem } from '../types';
import { SpendingCategoryList } from './SpendingCategoryList';
import { CategoryDetailsSheet } from './CategoryDetailsSheet';
import { FilterChips } from '@/components/ui/filter-chips';
import { getBankName, CATEGORY_EMOJIS } from '@money-up/common';
import { AiClassificationDialog } from './AiClassificationDialog';

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
  configuredProviders?: string[];
  isWidgetBusy?: boolean;
  onGoToAiStudio?: () => void;
  onExcludedExpensesChange?: (amount: number) => void;
}

const categoryEmojis: Record<string, string> = CATEGORY_EMOJIS;

function getTransactionKey(
  categoryName: string,
  txn: SpendingTransactionItem,
): string {
  const effectiveCategory = txn.originalCategory ?? categoryName;
  return `${effectiveCategory}::${txn.id ?? `${txn.merchant}|${txn.rawDate}|${txn.amount}`}`;
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
  configuredProviders = [],
  isWidgetBusy = false,
  onGoToAiStudio,
  onExcludedExpensesChange,
}: SpendingCategoriesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<SpendingCategoryItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
          rawDate: txn.date,
          amount: txn.amount,
          originalCategory: category.name,
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

  const allExpensesCategory = useMemo<SpendingCategoryItem | null>(() => {
    if (displayCategories.length === 0) return null;

    const allTransactions = displayCategories
      .flatMap((c) => c.transactions)
      .sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
      );

    return {
      name: 'כל ההוצאות',
      emoji: '📊',
      amount: displayCategories.reduce((sum, c) => sum + c.amount, 0),
      count: displayCategories.reduce((sum, c) => sum + (c.count ?? 0), 0),
      transactions: allTransactions,
    };
  }, [displayCategories]);

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
    if (!selectedCategory) return allExpensesCategory;

    return (
      sortedCategories.find(
        (category) => category.name === selectedCategory.name,
      ) ?? allExpensesCategory
    );
  }, [selectedCategory, sortedCategories, allExpensesCategory]);

  const showShimmer = isLoadingScans || (hasConnectedAccounts && !scans);
  const isBusy = (isWidgetBusy || isAnnotating) && !showShimmer;
  const shouldShimmerSpendingValues = showShimmer || isRefreshingScans;

  const aiAction = hasConnectedAccounts ? (
    <div className="flex items-center gap-2">
      {canUseAiAnnotation ? (
        <PremiumButton
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={isWidgetBusy || isAnnotating}
          size="sm"
          className="h-8.5 px-5 rounded-none border border-border/40 shadow-xs font-black text-xs min-w-[140px] cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
        >
          <Sparkle className="h-4 w-4" weight="fill" />
          <span>סיווג חכם</span>
        </PremiumButton>
      ) : onGoToAiStudio ? (
        <button
          type="button"
          onClick={onGoToAiStudio}
          className="inline-flex h-8.5 cursor-pointer items-center justify-center gap-2 border-none bg-primary px-5 text-xs font-black text-primary-foreground shadow-md transition-all hover:bg-primary/95 active:scale-95 rounded-none"
        >
          <Sparkle className="h-4 w-4" weight="fill" />
          <span>הפעל עוזר AI</span>
        </button>
      ) : null}
    </div>
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
    setIsSheetOpen(true);
  }

  useEffect(() => {
    if (
      selectedCategory &&
      !sortedCategories.some(
        (category) => category.name === selectedCategory.name,
      )
    ) {
      if (selectedCategory.name !== 'כל ההוצאות') {
        setSelectedCategory(null);
      }
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
      <div className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
        <div className="absolute inset-0 bg-linear-to-br from-muted/20 via-background to-muted/40" />
        <div className="relative z-10 max-w-md space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border border-border bg-background shadow-inner">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(isWidgetBusy || isRefreshingScans || isAnnotating) && !showShimmer ? (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 border border-border bg-background px-4 py-2 text-xs font-black text-foreground shadow-lg">
          {isAnnotating
            ? 'מסווג בתי עסק ומעדכן נתונים...'
            : 'מעדכן נתוני הוצאות...'}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border pb-4">
        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
            ניתוח הוצאות
          </h2>
          <FilterChips
            options={cardOptions}
            selectedIds={Array.from(selectedCardKeys)}
            onChange={(ids) => setSelectedCardKeys(new Set(ids))}
            allLabel="כל הכרטיסים"
            disabled={isWidgetBusy}
            className="min-w-0"
          />
        </div>

        <div className="shrink-0">{aiAction}</div>
      </div>

      {selectedCardKeys.size > 0 && unmappedTransactionsCount > 0 ? (
        <p className="inline-block border border-border bg-muted/30 p-2 text-[11px] font-semibold text-muted-foreground">
          חלק מהתנועות אינן משויכות לכרטיס ספציפי ומוצגות רק בתצוגת "כל
          הכרטיסים".
        </p>
      ) : null}

      <div className="relative w-full">
        {isBusy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/60 backdrop-blur-[1px] transition-all duration-300">
            <div className="flex items-center gap-3 border border-border bg-background px-5 py-4 shadow-xl rounded-none">
              <CircleNotch className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                {isAnnotating ? 'מבצע סיווג חכם...' : 'סנכרון נתונים פעיל...'}
              </span>
            </div>
          </div>
        )}

        {displayCategories.length === 0 && !showShimmer ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border bg-muted/5 space-y-4">
            <div className="h-16 w-16 bg-background border border-border flex items-center justify-center shadow-sm">
              <CreditCard
                className="h-8 w-8 text-muted-foreground/40"
                weight="thin"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-foreground uppercase tracking-tight">
                לא נמצאו הוצאות בטווח התאריכים הנבחר
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                נסה להרחיב את טווח התאריכים או לסנכרן נתונים
              </p>
            </div>
          </div>
        ) : (
          <SpendingCategoryList
            categories={sortedCategories}
            allExpensesCategory={allExpensesCategory}
            onCategorySelect={handleCategorySelect}
            isLoading={showShimmer}
          />
        )}
      </div>

      <CategoryDetailsSheet
        category={activeCategory}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        isLoading={shouldShimmerSpendingValues}
        isTransactionExcluded={isTransactionExcluded}
        onToggleTransactionExcluded={toggleTransactionExcluded}
        getDisplayReason={getDisplayReason}
      />

      <AiClassificationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        startDate={startDate}
        endDate={endDate}
        configuredProviders={configuredProviders}
        onAnnotatingChange={setIsAnnotating}
      />
    </div>
  );
}
