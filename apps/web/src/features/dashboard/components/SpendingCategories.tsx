import { useEffect, useMemo, useState } from 'react';
import { CircleNotch, CreditCard, Sparkle, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { SpendingScansResponse } from '@/hooks/useAiSpending';
import { useAnnotateSpendingScansProgress, useUnresolvedMerchantsCount } from '@/hooks/useAiSpending';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';
import { AiModelDropdownSelector } from '@/features/ai/components/AiModelDropdownSelector';
import { PremiumButton } from '@/components/ui/premium-button';
import type { SpendingCategoryItem, SpendingTransactionItem } from '../types';
import { SpendingCategoryList } from './SpendingCategoryList';
import { CategoryDetailsSheet } from './CategoryDetailsSheet';
import { FilterChips } from '@/components/ui/filter-chips';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DashboardRangePicker } from './DashboardRangePicker';
import {
  AgentProvider,
  getBankName,
  OpenAiModels,
  GeminiModels,
  ClaudeModels,
  OllamaModels,
  OpenRouterModels,
  ALL_PROVIDERS,
  CATEGORY_EMOJIS,
  getModelPricing,
} from '@money-up/common';

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


const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: OpenAiModels,
  claude: ClaudeModels,
  gemini: GeminiModels,
  ollama: OllamaModels,
  openrouter: OpenRouterModels,
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
  isWidgetBusy = false,
  onGoToAiStudio,
  onExcludedExpensesChange,
}: SpendingCategoriesProps) {
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [diagStartDate, setDiagStartDate] = useState(startDate);
  const [diagEndDate, setDiagEndDate] = useState(endDate);

  // Sync dialog date range to dashboard range whenever the dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setDiagStartDate(startDate);
      setDiagEndDate(endDate);
    }
  }, [isDialogOpen, startDate, endDate]);

  const [classProvider, setClassProvider] = useState<AgentProvider>(() => {
    const saved = localStorage.getItem('moneyup_classification_provider');
    if (saved === 'openai' || saved === 'claude' || saved === 'gemini' || saved === 'ollama' || saved === 'openrouter') {
      return saved as AgentProvider;
    }
    return 'gemini';
  });

  const [classModel, setClassModel] = useState<string>(() => {
    const saved = localStorage.getItem('moneyup_classification_model');
    if (saved) return saved;
    return 'gemini-2.5-flash';
  });

  useEffect(() => {
    if (configuredProviders.length > 0) {
      const savedProvider = localStorage.getItem('moneyup_classification_provider') as AgentProvider | null;
      const savedModel = localStorage.getItem('moneyup_classification_model');

      let targetProvider: AgentProvider = 'gemini';
      if (savedProvider && configuredProviders.includes(savedProvider)) {
        targetProvider = savedProvider;
      } else if (configuredProviders.includes(classProvider)) {
        targetProvider = classProvider;
      } else {
        targetProvider = (configuredProviders[0] as AgentProvider) || 'gemini';
      }

      setClassProvider(targetProvider);

      const availableModels = MODELS_BY_PROVIDER[targetProvider] || [];
      if (savedModel && availableModels.includes(savedModel)) {
        setClassModel(savedModel);
      } else {
        let defaultModel = 'gemini-2.5-flash';
        if (targetProvider === 'openai') defaultModel = 'gpt-4o-mini';
        else if (targetProvider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
        else if (targetProvider === 'gemini') defaultModel = 'gemini-2.5-flash';
        else defaultModel = MODELS_BY_PROVIDER[targetProvider]?.[0] || '';
        setClassModel(defaultModel);
      }
    }
  }, [configuredProviders]);

  const handleProviderChange = (provider: AgentProvider) => {
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
    let defaultModel = 'gemini-2.5-flash';
    if (provider === 'openai') defaultModel = 'gpt-4o-mini';
    else if (provider === 'claude') defaultModel = 'claude-3-5-haiku-20241022';
    else if (provider === 'gemini') defaultModel = 'gemini-2.5-flash';
    else defaultModel = MODELS_BY_PROVIDER[provider]?.[0] || '';
    
    setClassModel(defaultModel);
    localStorage.setItem('moneyup_classification_model', defaultModel);
  };

  const handleModelChange = (model: string) => {
    setClassModel(model);
    localStorage.setItem('moneyup_classification_model', model);
  };

  const {
    mutateAsync: annotateWithAiSocket,
    isPending: isAnnotatingSocket,
  } = useAnnotateSpendingScansProgress();

  // Live unresolved merchant count for the dialog's own date range.
  // Only fetches when the dialog is open; TanStack Query serves from cache
  // when diagRange === dashboardRange (zero extra network cost).
  const {
    count: uncategorizedCount,
    isLoading: isMerchantsLoading,
  } = useUnresolvedMerchantsCount(diagStartDate, diagEndDate, isDialogOpen);

  const tokenEstimation = useMemo(() => {
    const N = uncategorizedCount;
    if (N === 0) return { input: 0, output: 0, total: 0, batches: 0, estimatedUsd: null };
    const SYSTEM_PROMPT_TOKENS = 478;
    const INPUT_PER_MERCHANT = 18;
    const OUTPUT_PER_MERCHANT = 35;
    const batches = Math.ceil(N / 50);
    const input = (batches * SYSTEM_PROMPT_TOKENS) + (N * INPUT_PER_MERCHANT);
    const output = N * OUTPUT_PER_MERCHANT;
    const pricing = getModelPricing(classModel);
    const estimatedUsd = pricing
      ? (input / 1_000_000) * pricing.inputPer1M + (output / 1_000_000) * pricing.outputPer1M
      : null;
    return { input, output, total: input + output, batches, estimatedUsd };
  }, [uncategorizedCount, classModel]);

  const handleRunClassification = async () => {
    try {
      await annotateWithAiSocket({
        startDate: diagStartDate,
        endDate: diagEndDate,
        provider: classProvider as AgentProvider,
        model: classModel,
      });
      toast.success('הסיווג החכם הושלם בהצלחה!');
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'הסיווג נכשל');
    }
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
  const isBusy = (isWidgetBusy || isAnnotatingSocket) && !showShimmer;
  const shouldShimmerSpendingValues = showShimmer || isRefreshingScans;

  const aiAction = hasConnectedAccounts ? (
    <div className="flex items-center gap-2">
      {canUseAiAnnotation ? (
        <PremiumButton
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={isWidgetBusy || isAnnotatingSocket}
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
      {(isWidgetBusy || isRefreshingScans || isAnnotatingSocket) && !showShimmer ? (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 border border-border bg-background px-4 py-2 text-xs font-black text-foreground shadow-lg">
          {isAnnotatingSocket
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
                {isAnnotatingSocket ? 'מבצע סיווג חכם...' : 'סנכרון נתונים פעיל...'}
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!isAnnotatingSocket) {
          setIsDialogOpen(open);
        }
      }}>
        <DialogContent className="rounded-none border border-border bg-card text-foreground max-w-lg shadow-2xl p-6 text-right font-semibold" dir="rtl" showCloseButton={!isAnnotatingSocket}>
          <DialogHeader className="text-right space-y-1.5 border-b border-border/40 pb-4">
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sparkle className="h-5 w-5 text-primary" weight="fill" />
              סיווג עסקאות חכם (AI)
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              בחרו ספק, דגם וטווח תאריכים להפעלת סיווג אוטומטי של עסקאות לא מסווגות.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">

            {/* AI Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">ספק ודגם AI</label>
              <AiModelDropdownSelector
                selectedProvider={classProvider}
                setSelectedProvider={(p) => handleProviderChange(p as any)}
                selectedModel={classModel}
                setSelectedModel={handleModelChange}
                modelsByProvider={MODELS_BY_PROVIDER}
                providers={ALL_PROVIDERS}
                isLoading={isAnnotatingSocket}
                configuredProviders={configuredProviders}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">טווח תאריכים לסיווג</label>
              <div className="border border-border/60 bg-muted/5 px-3 py-2">
                <DashboardRangePicker
                  startDate={diagStartDate}
                  endDate={diagEndDate}
                  onStartDateChange={setDiagStartDate}
                  onEndDateChange={setDiagEndDate}
                  isBusy={isAnnotatingSocket}
                />
              </div>
            </div>

            <div className={cn(
              "border p-4 rounded-none text-sm leading-relaxed",
              isMerchantsLoading
                ? "border-border/60 bg-muted/10 text-muted-foreground animate-pulse"
                : uncategorizedCount === 0
                  ? "border-border/60 bg-muted/10 text-muted-foreground"
                  : "bg-primary/5 text-foreground border-primary/30"
            )}>
              {isMerchantsLoading ? (
                <div className="flex items-center gap-2">
                  <CircleNotch className="h-4 w-4 shrink-0 animate-spin" />
                  <span>טוען נתונים לטווח התאריכים...</span>
                </div>
              ) : uncategorizedCount === 0 ? (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" weight="bold" />
                  <span>אין ביתי עסק לא מסווגים בטווח זה. הכל מסווג!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-black text-primary">נמצאו <span className="text-xl">{uncategorizedCount}</span> בתי עסק ייחודיים שטרם סווגו.</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    עלות טוקנים מוערכת: <span className="font-bold text-foreground">{tokenEstimation.total.toLocaleString()} טוקנים</span>
                    {' '}(~{tokenEstimation.input.toLocaleString()} קלט, ~{tokenEstimation.output.toLocaleString()} פלט ב-{tokenEstimation.batches} סבבים).
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    עלות כספית מוערכת:{' '}
                    {classProvider === 'ollama' ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">חינם (מקומי)</span>
                    ) : tokenEstimation.estimatedUsd !== null ? (
                      <span className="font-bold text-foreground" dir="ltr">
                        ${tokenEstimation.estimatedUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    ) : (
                      <span className="font-bold text-muted-foreground">עלות לא ידועה</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {isAnnotatingSocket && (
              <div className="flex items-center justify-center gap-3 border border-border/60 bg-muted/10 p-5 rounded-none">
                <CircleNotch className="h-5 w-5 animate-spin text-primary" weight="bold" />
                <span className="text-sm font-bold text-foreground">מבצע סיווג חכם... אנא המתן.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-4">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              disabled={isAnnotatingSocket}
              className="inline-flex h-10 cursor-pointer items-center justify-center border border-border bg-background px-5 text-sm font-black text-foreground hover:bg-muted/40 transition-colors rounded-none"
            >
              ביטול
            </button>
            <PremiumButton
              type="button"
              onClick={handleRunClassification}
              disabled={uncategorizedCount === 0 || isAnnotatingSocket || isMerchantsLoading}
              className="h-10 px-6 rounded-none font-black text-sm"
            >
              {isAnnotatingSocket ? (
                <CircleNotch className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkle className="h-4 w-4" weight="fill" />
              )}
              <span>הפעל סיווג</span>
            </PremiumButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
