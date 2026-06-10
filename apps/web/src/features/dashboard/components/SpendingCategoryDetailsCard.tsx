import { useState, useEffect, useMemo } from 'react';
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { SpendingCategoryItem, SpendingTransactionItem } from '../types';
import { cn } from '@/lib/utils';
import { Select, SelectItem } from '@/components/ui/select';
import { PremiumInput } from '@/components/ui/premium-input';

interface SpendingCategoryDetailsCardProps {
  category: SpendingCategoryItem | null;
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

export function SpendingCategoryDetailsCard({
  category,
  isLoading = false,
  isTransactionExcluded,
  onToggleTransactionExcluded,
  getDisplayReason,
}: SpendingCategoryDetailsCardProps) {
  const [displayLimit, setDisplayLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name-asc'>('date-desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'excluded'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');

  // Reset limit when category or filter criteria change
  useEffect(() => {
    setDisplayLimit(50);
  }, [category?.name, searchTerm, sortBy, statusFilter, accountFilter, amountFilter]);

  const transactions = category?.transactions ?? [];

  const uniqueAccounts = useMemo(() => {
    const accs = new Map<string, string>();
    transactions.forEach((t) => {
      if (t.cardKey && t.cardLabel) {
        accs.set(t.cardKey, t.cardLabel);
      }
    });
    return Array.from(accs.entries()).map(([key, label]) => ({ key, label }));
  }, [transactions]);

  const filteredAndSortedTransactions = useMemo(() => {
    if (!category) return [];
    let result = [...transactions];

    // 1. Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.merchant || '').toLowerCase().includes(q) ||
          (t.cardLabel || '').toLowerCase().includes(q) ||
          (t.reason || '').toLowerCase().includes(q) ||
          (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (statusFilter === 'active') {
      result = result.filter((t) => !isTransactionExcluded(category.name, t));
    } else if (statusFilter === 'excluded') {
      result = result.filter((t) => isTransactionExcluded(category.name, t));
    }

    // 3. Account/Card Filter
    if (accountFilter !== 'all') {
      result = result.filter((t) => t.cardKey === accountFilter);
    }

    // 4. Amount Range Filter
    if (amountFilter !== 'all') {
      if (amountFilter === 'gt100') {
        result = result.filter((t) => t.amount > 100);
      } else if (amountFilter === 'gt500') {
        result = result.filter((t) => t.amount > 500);
      } else if (amountFilter === 'gt1000') {
        result = result.filter((t) => t.amount > 1000);
      }
    }

    // 5. Sort Results
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'date-asc') {
        const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      if (sortBy === 'name-asc') {
        return (a.merchant || '').localeCompare(b.merchant || '', 'he');
      }
      return 0;
    });

    return result;
  }, [category, transactions, searchTerm, sortBy, statusFilter, accountFilter, amountFilter, isTransactionExcluded]);

  const totalFilteredAmount = useMemo(() => {
    if (!category) return 0;
    return filteredAndSortedTransactions.reduce((sum, t) => {
      return isTransactionExcluded(category.name, t) ? sum : sum + t.amount;
    }, 0);
  }, [category, filteredAndSortedTransactions, isTransactionExcluded]);

  const visibleTransactions = filteredAndSortedTransactions.slice(0, displayLimit);
  const hasMore = filteredAndSortedTransactions.length > displayLimit;

  if (isLoading && !category) {
    return (
      <div className="flex-1 space-y-3 overflow-hidden p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full border border-border bg-muted/20 animate-soft-shimmer"
          />
        ))}
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-center">
        <p className="max-w-52 text-sm font-semibold leading-relaxed text-muted-foreground">
          בחר קטגוריה כדי לצפות בתנועות שמרכיבות אותה.
        </p>
      </div>
    );
  }

  const isAnyFilterActive =
    searchTerm ||
    sortBy !== 'date-desc' ||
    statusFilter !== 'all' ||
    accountFilter !== 'all' ||
    amountFilter !== 'all';

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-background/5 backdrop-blur-[0.5px] pointer-events-none" />
      )}

      {/* Control Panel (Sticky search/filter/sort) */}
      <div className="border-b border-border bg-muted/10 p-4 space-y-3 shrink-0">
        <div className="relative">
          <PremiumInput
            placeholder="חפש לפי תיאור, סיבה או תגיות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pr-10 pl-10 text-xs text-right"
          />
          <MagnifyingGlass className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block text-right">מיין לפי</span>
            <Select
              value={sortBy}
              onValueChange={(val) => setSortBy(val as any)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="date-desc">תאריך (חדש קודם)</SelectItem>
              <SelectItem value="date-asc">תאריך (ישן קודם)</SelectItem>
              <SelectItem value="amount-desc">סכום (גבוה קודם)</SelectItem>
              <SelectItem value="amount-asc">סכום (נמוך קודם)</SelectItem>
              <SelectItem value="name-asc">שם עסק (א-ב)</SelectItem>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block text-right">סטטוס תנועה</span>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as any)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="all">כל התנועות</SelectItem>
              <SelectItem value="active">פעיל בלבד</SelectItem>
              <SelectItem value="excluded">הוחרג (לא מחושב)</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block text-right">חשבון / כרטיס</span>
            <Select
              value={accountFilter}
              onValueChange={(val) => setAccountFilter(val)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="all">כל הכרטיסים</SelectItem>
              {uniqueAccounts.map((acc) => (
                <SelectItem key={acc.key} value={acc.key}>
                  {acc.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block text-right">טווח סכום</span>
            <Select
              value={amountFilter}
              onValueChange={(val) => setAmountFilter(val)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="all">כל הסכומים</SelectItem>
              <SelectItem value="gt100">מעל ₪100</SelectItem>
              <SelectItem value="gt500">מעל ₪500</SelectItem>
              <SelectItem value="gt1000">מעל ₪1,000</SelectItem>
            </Select>
          </div>
        </div>

        {isAnyFilterActive && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchTerm('');
                setSortBy('date-desc');
                setStatusFilter('all');
                setAccountFilter('all');
                setAmountFilter('all');
              }}
              className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 border border-rose-500/20 bg-rose-500/5 px-2 py-0.5"
            >
              אפס מסננים
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4 text-right">
        {filteredAndSortedTransactions.length === 0 ? (
          <p className="py-20 text-center text-sm font-semibold text-muted-foreground/60">
            {transactions.length === 0 ? 'אין תנועות זמינות בקטגוריה זו' : 'לא נמצאו תנועות העונות למסננים'}
          </p>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {isAnyFilterActive ? 'סה״כ הוצאה מסוננת (פעילה)' : 'סה״כ הוצאה בקטגוריה'}
              </span>
              <span
                className="text-xl font-black text-rose-600 dark:text-rose-400"
                dir="ltr"
              >
                {totalFilteredAmount.toLocaleString('he-IL')} ₪
              </span>
            </div>

            <div className="space-y-2">
              {visibleTransactions.map((txn, index) => {
                const excluded = isTransactionExcluded(category.name, txn);
                const displayReason = getDisplayReason?.(txn.reason) ?? null;
                return (
                  <div
                    key={txn.id || `${txn.merchant}-${txn.date}-${index}`}
                    className={cn(
                      'grid gap-2 border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/10',
                      excluded && 'opacity-60 grayscale-[0.5]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black leading-tight text-foreground",
                          excluded && "line-through decoration-rose-500/40"
                        )}>
                          {txn.merchant}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                          {txn.date}
                          {txn.cardLabel ? ` • ${txn.cardLabel}` : ''}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'text-sm font-black',
                          excluded
                            ? 'text-muted-foreground/40'
                            : 'text-rose-600 dark:text-rose-400',
                        )}
                        dir="ltr"
                      >
                        {isLoading ? (
                          <span className="inline-block h-3.5 w-16 animate-soft-shimmer bg-muted" />
                        ) : (
                          <>-{txn.amount.toLocaleString('he-IL')} ₪</>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleTransactionExcluded(category.name, txn)
                        }
                        className={cn(
                          'h-7 cursor-pointer border px-3 text-[10px] font-black uppercase transition-all active:scale-95 shadow-xs',
                          excluded
                            ? 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                            : 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground',
                        )}
                      >
                        {excluded ? 'החזר לחישוב' : 'החרג תנועה'}
                      </button>
                      {displayReason ? (
                        <span className="text-[10px] font-bold italic text-muted-foreground/60">
                          {displayReason}
                        </span>
                      ) : null}
                      {txn.tags && txn.tags.length > 0 ? (
                        <span className="truncate text-[10px] font-black uppercase tracking-tighter text-muted-foreground/50">
                          {txn.tags.join(' • ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <button
                onClick={() => setDisplayLimit((prev) => prev + 50)}
                className="mb-4 w-full cursor-pointer border border-dashed border-border py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
              >
                טען עוד תנועות ({filteredAndSortedTransactions.length - displayLimit} נותרו)
              </button>
            )}
          </>
        )}
      </div>

      {isLoading && (
        <CircleNotch className="absolute bottom-6 left-6 h-5 w-5 animate-spin text-muted-foreground/40" />
      )}
    </div>
  );
}
