import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, CreditCard, Sparkle, Info } from '@phosphor-icons/react';
import { getBankName } from '@/lib/bank-branding';
import { getFriendlyModelName } from '@/lib/ai-models';
import { Select, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SpendingScansResponse } from '@/hooks/useAi';
import { AiIcon } from '@/features/ai/components/AiIcon';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { PremiumButton } from '@/components/ui/premium-button';
import type { SpendingCategoryItem, SpendingTransactionItem } from '../types';
import { SpendingCategoryList } from './SpendingCategoryList';
import { CategoryDetailsSheet } from './CategoryDetailsSheet';
import { FilterChips } from '@/components/ui/filter-chips';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  isAnnotatingWithAi?: boolean;
  isWidgetBusy?: boolean;
  onAnnotateWithAi?: (provider?: 'openai' | 'claude' | 'gemini', model?: string) => void;
  onGoToAiStudio?: () => void;
  onExcludedExpensesChange?: (amount: number) => void;
}

const categoryEmojis: Record<string, string> = {
  מזון: '🍔',
  קניות: '🛒',
  'בילויים ופנאי': '🎉',
  'דלק/תחבורה': '⛽',
  מנויים: '📱',
  'לא מסווג': '📦',
};

function getTransactionKey(
  categoryName: string,
  txn: SpendingTransactionItem,
): string {
  const effectiveCategory = txn.originalCategory ?? categoryName;
  return `${effectiveCategory}::${txn.id ?? `${txn.merchant}|${txn.rawDate}|${txn.amount}`}`;
}

import { OPENAI_MODELS, MODEL_TAGS } from '@money-up/common';

function getDisplayReason(reason?: string): string | null {
  if (!reason) return null;
  const normalized = reason.toLowerCase();
  if (normalized.includes('matched rule-based category')) return null;
  if (normalized.includes('uncategorized')) return 'סווג כלא מסווג';
  if (normalized.includes('credit-company expense'))
    return 'הוצאה מכרטיס אשראי';
  return null;
}

const MODELS_BY_PROVIDER = {
  openai: OPENAI_MODELS,
  claude: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  gemini: [
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
  ],
};

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
  isAnnotatingWithAi = false,
  isWidgetBusy = false,
  onAnnotateWithAi,
  onGoToAiStudio,
  onExcludedExpensesChange,
}: SpendingCategoriesProps) {
  const navigate = useNavigate();

  const [classProvider, setClassProvider] = useState<'openai' | 'claude' | 'gemini'>(() => {
    const saved = localStorage.getItem('moneyup_classification_provider');
    if (saved && configuredProviders.includes(saved)) {
      return saved as any;
    }
    return (configuredProviders[0] as any) || 'gemini';
  });

  const [classModel, setClassModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_classification_model');
    if (saved) return saved;
    const provider = (configuredProviders[0] as any) || 'gemini';
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'claude') return 'claude-3-5-haiku-20241022';
    return 'gemini-1.5-flash';
  });

  useEffect(() => {
    if (configuredProviders.length > 0 && !configuredProviders.includes(classProvider)) {
      const fallbackProvider = configuredProviders[0] as 'openai' | 'claude' | 'gemini';
      setClassProvider(fallbackProvider);
      let defaultModel = 'gemini-1.5-flash';
      if (fallbackProvider === 'openai') defaultModel = 'gpt-4o-mini';
      else if (fallbackProvider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
      setClassModel(defaultModel);
    }
  }, [configuredProviders, classProvider]);

  const handleProviderChange = (provider: 'openai' | 'claude' | 'gemini') => {
    if (!configuredProviders.includes(provider)) {
      toast.error(`ספק ${provider.toUpperCase()} אינו מחובר.`, {
        action: {
          label: 'להגדרות',
          onClick: () => void navigate({ to: '/settings/ai' }),
        },
      });
      return;
    }

    setClassProvider(provider);
    localStorage.setItem('moneyup_classification_provider', provider);
    let defaultModel = 'gemini-1.5-flash';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    else if (provider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
    
    setClassModel(defaultModel);
    localStorage.setItem('moneyup_classification_model', defaultModel);
  };

  const handleModelChange = (model: string) => {
    setClassModel(model);
    localStorage.setItem('moneyup_classification_model', model);
  };

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
  const isBusy = (isWidgetBusy || isAnnotatingWithAi) && !showShimmer;
  const shouldShimmerSpendingValues = showShimmer || isRefreshingScans;

  const aiAction = hasConnectedAccounts ? (
    <div className="flex items-center gap-2">
      {canUseAiAnnotation && onAnnotateWithAi ? (
        <div className={cn(
          "flex items-center gap-2 border border-border/80 bg-muted/30 p-1.5 rounded-none shadow-xs",
          (isAnnotatingWithAi || isWidgetBusy) && "pointer-events-none opacity-60"
        )}>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button className="flex h-8.5 w-8.5 cursor-help items-center justify-center border border-border bg-background text-muted-foreground hover:bg-muted/40 transition-colors shadow-xs rounded-none p-0">
                  <Info className="h-4.5 w-4.5" weight="bold" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="text-right rounded-none border border-border bg-card/95 backdrop-blur-md text-foreground px-4 py-3 font-semibold shadow-xl"
              >
                <p className="text-sm leading-relaxed">
                  הקפד להשתמש בסיווג החכם פעם בשבוע לשיפור הדיוק. ה-AI לומד את הרגלי
                  הקנייה שלך ומשפר את הדיוק לאורך זמן.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Select
            value={classProvider}
            onValueChange={(val) => handleProviderChange(val as any)}
            className="h-8.5 rounded-none border border-border/60 bg-background text-xs font-bold uppercase tracking-tight shadow-xs min-w-[125px] px-3 hover:border-border transition-colors"
          >
            <SelectItem value="gemini">
              <div className="flex items-center gap-1.5">
                <AiIcon provider="gemini" size="xs" />
                <span>Gemini</span>
              </div>
            </SelectItem>
            <SelectItem value="openai">
              <div className="flex items-center gap-1.5">
                <AiIcon provider="openai" size="xs" />
                <span>OpenAI</span>
              </div>
            </SelectItem>
            <SelectItem value="claude">
              <div className="flex items-center gap-1.5">
                <AiIcon provider="claude" size="xs" />
                <span>Claude</span>
              </div>
            </SelectItem>
          </Select>

          <Select
            value={classModel}
            onValueChange={(val) => handleModelChange(val)}
            className="h-8.5 rounded-none border border-border/60 bg-background text-xs font-bold uppercase tracking-tight shadow-xs min-w-[190px] px-3 hover:border-border transition-colors"
          >
            {(MODELS_BY_PROVIDER[classProvider] || []).map((m) => (
              <SelectItem
                key={m}
                value={m}
                displayValue={
                  <div className="flex items-center gap-1.5 truncate">
                    <AiIcon provider={classProvider} size="xs" />
                    <span className="truncate">{getFriendlyModelName(m)}</span>
                  </div>
                }
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5">
                    <AiIcon provider={classProvider} size="xs" />
                    <span>{getFriendlyModelName(m)}</span>
                  </div>
                  {MODEL_TAGS[m] && (
                    <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-primary/10 text-primary rounded-xs tracking-wider shrink-0">
                      {MODEL_TAGS[m]}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </Select>

          <PremiumButton
            type="button"
            onClick={() => onAnnotateWithAi(classProvider, classModel)}
            disabled={isAnnotatingWithAi || isWidgetBusy}
            size="sm"
            className="h-8.5 px-5 rounded-none border-none shadow-sm font-black text-xs min-w-[160px] cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
          >
            {isAnnotatingWithAi ? (
              <CircleNotch className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkle className="h-4 w-4" weight="fill" />
            )}
            <span>{isAnnotatingWithAi ? 'מסווג...' : 'סיווג חכם'}</span>
          </PremiumButton>
        </div>
      ) : onGoToAiStudio ? (
        <div className={cn(
          "flex items-center gap-2 border border-border/80 bg-muted/30 p-1.5 rounded-none shadow-xs",
          isWidgetBusy && "pointer-events-none opacity-60"
        )}>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button className="flex h-8.5 w-8.5 cursor-help items-center justify-center border border-border bg-background text-muted-foreground hover:bg-muted/40 transition-colors shadow-xs rounded-none p-0">
                  <Info className="h-4.5 w-4.5" weight="bold" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[280px] text-right rounded-none border border-border bg-card/95 backdrop-blur-md text-foreground px-4 py-3 font-semibold shadow-xl"
              >
                <p className="text-xs leading-relaxed">
                  הקפד להשתמש בסיווג החכם פעם בשבוע לשיפור הדיוק. ה-AI לומד את הרגלי
                  הקנייה שלך ומשפר את הדיוק לאורך זמן.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            type="button"
            onClick={onGoToAiStudio}
            className="inline-flex h-8.5 cursor-pointer items-center justify-center gap-2 border-none bg-primary px-5 text-xs font-black text-primary-foreground shadow-md transition-all hover:bg-primary/95 active:scale-95 rounded-none"
          >
            <Sparkle className="h-4 w-4" weight="fill" />
            <span>הפעל עוזר AI</span>
          </button>
        </div>
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
      {(isWidgetBusy || isRefreshingScans) && !showShimmer ? (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 border border-border bg-background px-4 py-2 text-xs font-black text-foreground shadow-lg">
          {isAnnotatingWithAi
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
                {isAnnotatingWithAi ? 'מבצע סיווג חכם...' : 'סנכרון נתונים פעיל...'}
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
    </div>
  );
}
