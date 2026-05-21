import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, Sparkle, TrendDownIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PremiumCard } from '@/components/ui/premium-card';
import { FilterChips } from '@/components/ui/filter-chips';
import { getBankName } from '@/lib/bank-branding';
import type { SpendingScansResponse } from '@/hooks/useAi';

interface Transaction {
  id?: string;
  merchant: string;
  date: string;
  amount: number;
  confidence?: number;
  reason?: string;
  tags?: string[];
  cardKey?: string;
  cardLabel?: string;
}

interface Category {
  name: string;
  emoji: string;
  amount: number;
  transactions: Transaction[];
  count?: number;
  totalCount?: number;
  excludedCount?: number;
}

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
}

const staticCategories: Category[] = [
  { name: 'מזון', emoji: '🍔', amount: 1240, transactions: [] },
  { name: 'ביגוד', emoji: '👗', amount: 640, transactions: [] },
  { name: 'בידור', emoji: '🎬', amount: 280, transactions: [] },
  { name: 'בילויים', emoji: '🎉', amount: 300, transactions: [] },
  { name: 'אלקטרוניקה', emoji: '💻', amount: 450, transactions: [] },
  { name: 'אונליין', emoji: '🛍️', amount: 260, transactions: [] },
  { name: 'דלק/תחבורה', emoji: '⛽', amount: 420, transactions: [] },
  { name: 'סופר', emoji: '🛒', amount: 890, transactions: [] },
  { name: 'מנויים', emoji: '📱', amount: 180, transactions: [] },
  { name: 'לא מסווג', emoji: '📦', amount: 210, transactions: [] },
];

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

export function SpendingCategories({
  scans,
  period,
  startDate,
  endDate,
  minStartDate,
  maxEndDate,
  onStartDateChange,
  onEndDateChange,
  isLoadingScans = false,
  isRefreshingScans = false,
  hasConnectedAccounts = false,
  canUseAiAnnotation = false,
  isAnnotatingWithAi = false,
  isWidgetBusy = false,
  onAnnotateWithAi,
  onGoToAiStudio,
}: SpendingCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [excludedTransactionKeys, setExcludedTransactionKeys] = useState<Set<string>>(new Set());
  const [selectedCardKeys, setSelectedCardKeys] = useState<Set<string>>(new Set());

  function getTransactionKey(categoryName: string, txn: Transaction): string {
    return `${categoryName}::${txn.id ?? `${txn.merchant}|${txn.date}|${txn.amount}`}`;
  }

  function isTransactionExcluded(categoryName: string, txn: Transaction): boolean {
    return excludedTransactionKeys.has(getTransactionKey(categoryName, txn));
  }

  function toggleTransactionExcluded(categoryName: string, txn: Transaction) {
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

  const displayCategories = useMemo<Category[]>(() => {
    if (!hasConnectedAccounts) {
      return staticCategories;
    }
    
    if (!scans) {
      return [];
    }

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
          String(txn.bankId ?? '').trim() && String(txn.cardLast4 ?? '').trim()
            ? `${String(txn.bankId)}:${String(txn.cardLast4)}`
            : undefined,
        cardLabel:
          String(txn.bankId ?? '').trim() && String(txn.cardLast4 ?? '').trim()
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
    return Array.from(optionMap.entries()).map(([id, label]) => ({ id, label }));
  }, [displayCategories]);

  const cardFilteredCategories = useMemo<Category[]>(() => {
    if (selectedCardKeys.size === 0) return displayCategories;
    return displayCategories.map((category) => {
      const filteredTransactions = category.transactions.filter(
        (txn) => !!txn.cardKey && selectedCardKeys.has(txn.cardKey),
      );
      const filteredAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
      return {
        ...category,
        amount: filteredAmount,
        count: filteredTransactions.length,
        transactions: filteredTransactions,
      };
    });
  }, [displayCategories, selectedCardKeys]);
  const unmappedTransactionsCount = useMemo(() => {
    return displayCategories.reduce(
      (sum, category) => sum + category.transactions.filter((txn) => !txn.cardKey).length,
      0,
    );
  }, [displayCategories]);

  const displayCategoriesWithExclusionMeta = useMemo<Category[]>(() => {
    return cardFilteredCategories.map((category) => {
      const excludedCount = category.transactions.filter((txn) =>
        excludedTransactionKeys.has(getTransactionKey(category.name, txn)),
      ).length;
      return {
        ...category,
        totalCount: category.transactions.length,
        excludedCount,
      };
    });
  }, [cardFilteredCategories, excludedTransactionKeys]);
  const excludedTotalAmount = useMemo(() => {
    return cardFilteredCategories.reduce((sum, category) => {
      const categoryExcludedSum = category.transactions.reduce((categorySum, txn) => {
        if (excludedTransactionKeys.has(getTransactionKey(category.name, txn))) {
          return categorySum + txn.amount;
        }
        return categorySum;
      }, 0);
      return sum + categoryExcludedSum;
    }, 0);
  }, [cardFilteredCategories, excludedTransactionKeys]);

  const baseTotalExpenses = hasConnectedAccounts && scans
    ? cardFilteredCategories.reduce((sum, category) => sum + category.amount, 0)
    : hasConnectedAccounts ? 0 : 3650;
  const displaySpent = Math.max(baseTotalExpenses - excludedTotalAmount, 0);
  const sortedCategories = useMemo(
    () => [...displayCategoriesWithExclusionMeta].sort((a, b) => b.amount - a.amount),
    [displayCategoriesWithExclusionMeta],
  );
  const topCategories = useMemo(() => sortedCategories.slice(0, 6), [sortedCategories]);
  const visibleCategories = showAllCategories ? sortedCategories : topCategories;
  const hiddenCategoriesCount = Math.max(sortedCategories.length - topCategories.length, 0);

  const showShimmer = isLoadingScans || (hasConnectedAccounts && !scans);

  const activeCategory = useMemo(() => {
    if (selectedCategory && sortedCategories.some((category) => category.name === selectedCategory.name)) {
      return sortedCategories.find((category) => category.name === selectedCategory.name) ?? selectedCategory;
    }
    return sortedCategories[0] ?? null;
  }, [selectedCategory, sortedCategories]);
  const dialogCategory = useMemo(() => {
    if (!selectedCategory) return null;
    return sortedCategories.find((category) => category.name === selectedCategory.name) ?? selectedCategory;
  }, [selectedCategory, sortedCategories]);

  function handleCategorySelect(category: Category) {
    setSelectedCategory(category);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setIsMobileDialogOpen(true);
    }
  }

  useEffect(() => {
    if (selectedCategory && !sortedCategories.some((category) => category.name === selectedCategory.name)) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, sortedCategories]);

  useEffect(() => {
    setExcludedTransactionKeys(new Set());
  }, [period, startDate, endDate]);

  useEffect(() => {
    setSelectedCardKeys(new Set());
  }, [period, startDate, endDate]);

  useEffect(() => {
    if (!hasConnectedAccounts || !scans) return;

    const debugEnabled =
      import.meta.env.DEV ||
      String(import.meta.env.VITE_SPENDING_SCANS_DEBUG ?? import.meta.env.VITE_AI_SCANS_DEBUG ?? '').toLowerCase() === 'true';

    if (!debugEnabled) return;

    console.log('[SPENDING_SCANS_DEBUG] displayed_categories', {
      period,
      totalExpenses: displaySpent,
      categories: displayCategories.map((category) => ({
        name: category.name,
        amount: category.amount,
        count: category.count ?? category.transactions.length,
        transactions: category.transactions.map((txn) => ({
          id: txn.id,
          merchant: txn.merchant,
          date: txn.date,
          amount: txn.amount,
          reason: txn.reason,
          confidence: txn.confidence,
          tags: txn.tags,
        })),
      })),
    });
  }, [displayCategories, displaySpent, hasConnectedAccounts, period, scans]);

  const shouldShimmerSpendingValues = showShimmer;

  return (
    <PremiumCard className="space-y-6 relative overflow-hidden">
      {(isWidgetBusy || isRefreshingScans) && !showShimmer ? (
        <div className="absolute inset-0 z-20 bg-white/75 dark:bg-zinc-950/75 backdrop-blur-[1px] flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <CircleNotch className="h-4 w-4 animate-spin text-zinc-700 dark:text-zinc-200" />
            <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">
              {isAnnotatingWithAi ? 'מסווג בתי עסק ומעדכן נתונים...' : 'מעדכן נתוני הוצאות...'}
            </span>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 p-4 space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
              <span>סיכום הוצאות</span>
              {isRefreshingScans && !showShimmer && (
                <CircleNotch className="h-4 w-4 animate-spin text-zinc-500 dark:text-zinc-400" />
              )}
            </h2>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {hasConnectedAccounts
                ? 'מחושב לפי תנועות מחברות אשראי מסונכרנות'
                : 'התצוגה זמינה לאחר סנכרון חברת אשראי'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
              <span className="block">מתאריך</span>
              <input
                type="date"
                value={startDate}
                min={minStartDate}
                max={endDate || maxEndDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                disabled={isWidgetBusy}
                className="h-9 w-full px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
              />
            </label>
            <label className="space-y-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
              <span className="block">עד תאריך</span>
              <input
                type="date"
                value={endDate}
                min={startDate || minStartDate}
                max={maxEndDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                disabled={isWidgetBusy}
                className="h-9 w-full px-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
              />
            </label>
          </div>
        </div>

        <div className="border border-zinc-100 dark:border-zinc-800 bg-rose-50/20 dark:bg-rose-950/10 p-4 space-y-3 text-right">
          <div dir="ltr" className="space-y-1.5">
            <div className="flex items-center gap-1.5 justify-end text-rose-600 dark:text-rose-500">
              <span className="text-[11px] font-black">הוצאות</span>
              <TrendDownIcon className="h-4 w-4" weight="duotone" />
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {shouldShimmerSpendingValues ? (
                <span className="inline-block h-8 w-36 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
              ) : (
                <>-{displaySpent.toLocaleString('he-IL')} ₪</>
              )}
            </p>
            {excludedTransactionKeys.size > 0 ? (
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400" dir="rtl">
                הוחרגו {excludedTransactionKeys.size} תנועות מהחישוב
              </p>
            ) : null}
          </div>

          {excludedTransactionKeys.size > 0 ? (
            <button
              type="button"
              onClick={() => setExcludedTransactionKeys(new Set())}
              className="h-8 px-3 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors w-fit"
            >
              אפס החרגות
            </button>
          ) : null}

          {hasConnectedAccounts && canUseAiAnnotation && onAnnotateWithAi ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onAnnotateWithAi}
                disabled={isAnnotatingWithAi || isWidgetBusy}
                className="h-10 px-4 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-xs font-black text-white dark:text-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                {isAnnotatingWithAi ? (
                  <>
                    <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                    <span>מסווג עם AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkle className="h-3.5 w-3.5" weight="duotone" />
                    <span>סווג בתי עסק לא מזוהים עם AI</span>
                  </>
                )}
              </button>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                הפעולה מסווגת בתי עסק לא מזוהים ושומרת ללמידה עתידית
              </p>
            </div>
          ) : null}

          {hasConnectedAccounts && !canUseAiAnnotation && onGoToAiStudio ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onGoToAiStudio}
                className="h-10 px-4 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-xs font-black text-white dark:text-zinc-900 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <Sparkle className="h-3.5 w-3.5" weight="duotone" />
                <span>הוספת ספק AI</span>
              </button>
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                כדי להפעיל סיווג בינה מלאכותית, יש להוסיף ספק.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          {cardOptions.length > 0 ? (
            <div className="space-y-1.5">
              <FilterChips
                options={cardOptions}
                selectedIds={Array.from(selectedCardKeys)}
                onChange={(ids) => setSelectedCardKeys(new Set(ids))}
                allLabel="כל הכרטיסים"
                disabled={isWidgetBusy}
              />
              {selectedCardKeys.size > 0 && unmappedTransactionsCount > 0 ? (
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  חלק מהתנועות אינן משויכות לכרטיס ספציפי ומוצגות רק בתצוגת "כל הכרטיסים".
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-right">
              התפלגות הוצאות לפי קטגוריות
            </h3>
            {hiddenCategoriesCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="h-8 px-3 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                {showAllCategories ? 'הצג פחות' : `הצג הכל (+${hiddenCategoriesCount})`}
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3">
            {showShimmer ? (
              Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className="aspect-square border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 p-2 space-y-2 animate-pulse"
                >
                  <div className="mx-auto h-6 w-6 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
                  <div className="h-3 w-full bg-zinc-200/80 dark:bg-zinc-800/80" />
                  <div className="h-4 w-2/3 mx-auto bg-zinc-200/80 dark:bg-zinc-800/80" />
                </div>
              ))
            ) : visibleCategories.length === 0 ? (
              <div className="col-span-full py-10 text-center">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">אין נתונים להצגה בטווח התאריכים הנבחר</p>
              </div>
            ) : visibleCategories.map((category) => {
              const isActive = activeCategory?.name === category.name;
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  disabled={isWidgetBusy}
                  className={`w-full aspect-square border p-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center select-none disabled:opacity-60 disabled:cursor-not-allowed ${
                    isActive
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/90'
                  }`}
                >
                  <span className="text-2xl">{category.emoji}</span>
                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 leading-none">
                    {category.name}
                  </span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 leading-none" dir="ltr">
                    {shouldShimmerSpendingValues ? (
                      <span className="inline-block h-3.5 w-14 bg-zinc-200/80 dark:bg-zinc-800/80 animate-soft-shimmer" />
                    ) : (
                      <>-{category.amount.toLocaleString()} ₪</>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 p-4">
          {showShimmer ? (
            <div className="space-y-4">
              <div className="h-5 w-1/2 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
              <div className="h-3 w-1/3 bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
              <div className="space-y-2 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 w-full bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                ))}
              </div>
            </div>
          ) : activeCategory ? (
            <div className="space-y-3">
              <div className="space-y-1 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h4 className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <span>קטגוריה: {activeCategory.name}</span>
                  <span>{activeCategory.emoji}</span>
                </h4>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  סכום הוצאות: {activeCategory.amount.toLocaleString()} ₪
                  {typeof activeCategory.count === 'number'
                    ? ` • מספר תנועות: ${activeCategory.count}`
                    : ''}
                  {typeof activeCategory.excludedCount === 'number' && activeCategory.excludedCount > 0
                    ? ` • הוחרגו: ${activeCategory.excludedCount}`
                    : ''}
                </p>
              </div>
              <div className="space-y-2 h-80 overflow-y-auto pr-1">
                {activeCategory.transactions.length === 0 ? (
                  <p className="text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-6">
                    אין תנועות זמינות בקטגוריה זו
                  </p>
                ) : (
                  activeCategory.transactions.map((txn, index) => (
                    <div
                      key={txn.id || index}
                      className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 px-3 py-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {txn.merchant}
                          </p>
                          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                            {txn.date}
                          </p>
                        </div>
                        <p
                          className={`text-xs font-black ${
                            isTransactionExcluded(activeCategory.name, txn)
                              ? 'text-zinc-400 dark:text-zinc-500 line-through'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                          dir="ltr"
                        >
                          -{txn.amount.toLocaleString()} ₪
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTransactionExcluded(activeCategory.name, txn)}
                        className={`h-7 px-2 text-[10px] font-bold border cursor-pointer ${
                          isTransactionExcluded(activeCategory.name, txn)
                            ? 'border-zinc-400 text-zinc-600 dark:text-zinc-300'
                            : 'border-rose-300 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isTransactionExcluded(activeCategory.name, txn) ? 'החזר לחישוב' : 'החרג מהחישוב'}
                      </button>
                      {txn.reason ? (
                        <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                          {txn.reason}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between gap-2">
                        {typeof txn.confidence === 'number' ? (
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            confidence: {(txn.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span />
                        )}
                        {txn.tags && txn.tags.length > 0 ? (
                          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                            {txn.tags.join(', ')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              בחר קטגוריה כדי לצפות בתנועות.
            </p>
          )}
        </div>
      </div>

      {dialogCategory && (
        <Dialog
          open={isMobileDialogOpen}
          onOpenChange={(open) => {
            setIsMobileDialogOpen(open);
            if (!open) setSelectedCategory(null);
          }}
        >
          <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-none" dir="rtl" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <span>קטגוריה: {dialogCategory.name}</span>
                <span>{dialogCategory.emoji}</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                סכום הוצאות: {dialogCategory.amount.toLocaleString()} ₪
                {typeof dialogCategory.count === 'number' ? ` • מספר תנועות: ${dialogCategory.count}` : ''}
                {typeof dialogCategory.excludedCount === 'number' && dialogCategory.excludedCount > 0
                  ? ` • הוחרגו: ${dialogCategory.excludedCount}`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-2 h-80 overflow-y-auto pr-1">
              {dialogCategory.transactions.length === 0 ? (
                <p className="text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500 py-6">
                  אין תנועות זמינות בקטגוריה זו
                </p>
              ) : (
                dialogCategory.transactions.map((txn, index) => (
                  <div
                    key={txn.id || index}
                    className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 px-3 py-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{txn.merchant}</p>
                        <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">{txn.date}</p>
                      </div>
                      <p
                        className={`text-xs font-black ${
                          isTransactionExcluded(dialogCategory.name, txn)
                            ? 'text-zinc-400 dark:text-zinc-500 line-through'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                        dir="ltr"
                      >
                        -{txn.amount.toLocaleString()} ₪
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTransactionExcluded(dialogCategory.name, txn)}
                      className={`h-7 px-2 text-[10px] font-bold border cursor-pointer ${
                        isTransactionExcluded(dialogCategory.name, txn)
                          ? 'border-zinc-400 text-zinc-600 dark:text-zinc-300'
                          : 'border-rose-300 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {isTransactionExcluded(dialogCategory.name, txn) ? 'החזר לחישוב' : 'החרג מהחישוב'}
                    </button>
                    {txn.reason ? (
                      <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        {txn.reason}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between">
                      {typeof txn.confidence === 'number' ? (
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          confidence: {(txn.confidence * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span />
                      )}
                      {txn.tags && txn.tags.length > 0 ? (
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                          {txn.tags.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PremiumCard>
  );
}
