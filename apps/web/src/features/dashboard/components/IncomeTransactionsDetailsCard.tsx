import { useState, useEffect, useMemo } from 'react';
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useToggleTransactionDuplicate } from '@/hooks/useAccounts';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectItem } from '@/components/ui/select';
import { PremiumInput } from '@/components/ui/premium-input';

interface IncomeTransactionsDetailsCardProps {
  transactions: Array<{
    id: string;
    bankId: string;
    accountNumber: string;
    accountKey: string;
    accountLabel: string;
    amount: number;
    date: string;
    description: string;
    isDuplicate?: boolean;
  }>;
  isLoading?: boolean;
}

function formatMoney(value: number): string {
  return value.toLocaleString('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
}

export function IncomeTransactionsDetailsCard({
  transactions,
  isLoading = false,
}: IncomeTransactionsDetailsCardProps) {
  const [displayLimit, setDisplayLimit] = useState(50);
  const queryClient = useQueryClient();
  const toggleDuplicate = useToggleTransactionDuplicate();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'name-asc'>('date-desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'duplicate'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');

  // Reset limit when data or filter criteria change
  useEffect(() => {
    setDisplayLimit(50);
  }, [transactions.length, searchTerm, sortBy, statusFilter, accountFilter, amountFilter]);

  const uniqueAccounts = useMemo(() => {
    const accs = new Map<string, string>();
    transactions.forEach((t) => {
      if (t.accountKey && t.accountLabel) {
        accs.set(t.accountKey, t.accountLabel);
      }
    });
    return Array.from(accs.entries()).map(([key, label]) => ({ key, label }));
  }, [transactions]);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.accountLabel || '').toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (statusFilter === 'active') {
      result = result.filter((t) => !t.isDuplicate);
    } else if (statusFilter === 'duplicate') {
      result = result.filter((t) => t.isDuplicate);
    }

    // 3. Account/Card Filter
    if (accountFilter !== 'all') {
      result = result.filter((t) => t.accountKey === accountFilter);
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
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount;
      }
      if (sortBy === 'name-asc') {
        return (a.description || '').localeCompare(b.description || '', 'he');
      }
      return 0;
    });

    return result;
  }, [transactions, searchTerm, sortBy, statusFilter, accountFilter, amountFilter]);

  const handleToggleDuplicate = async (txn: (typeof transactions)[0]) => {
    const newState = !txn.isDuplicate;
    try {
      await toggleDuplicate.mutateAsync({
        bankId: txn.bankId,
        accountNumber: txn.accountNumber,
        id: txn.id,
        isDuplicate: newState,
      });

      void queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      toast.success(newState ? 'התנועה סומנה ככפולה' : 'התנועה הוחזרה לחישוב');
    } catch (e) {
      // Error handled by hook
    }
  };

  const totalAmount = useMemo(
    () =>
      filteredAndSortedTransactions.reduce((sum, t) => sum + (t.isDuplicate ? 0 : t.amount), 0),
    [filteredAndSortedTransactions],
  );

  const visibleTransactions = filteredAndSortedTransactions.slice(0, displayLimit);
  const hasMore = filteredAndSortedTransactions.length > displayLimit;

  if (isLoading && transactions.length === 0) {
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
        {/* Search Input */}
        <div className="relative">
          <PremiumInput
            placeholder="חפש לפי תיאור..."
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

        {/* Form Controls Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground block text-right">מיין לפי</span>
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
            <span className="text-[10px] font-black text-muted-foreground block text-right">סטטוס תנועה</span>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as any)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="all">כל התנועות</SelectItem>
              <SelectItem value="active">פעיל בלבד</SelectItem>
              <SelectItem value="duplicate">כפולות (שהוחרגו)</SelectItem>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground block text-right">חשבון / כרטיס</span>
            <Select
              value={accountFilter}
              onValueChange={(val) => setAccountFilter(val)}
              className="h-9 text-xs rounded-none border-border/80 bg-background"
            >
              <SelectItem value="all">כל החשבונות</SelectItem>
              {uniqueAccounts.map((acc) => (
                <SelectItem key={acc.key} value={acc.key}>
                  {acc.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black text-muted-foreground block text-right">טווח סכום</span>
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

        {/* Clear Filters indicator */}
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
              className="text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1 border border-destructive/20 bg-destructive/5 px-2 py-0.5"
            >
              אפס מסננים
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4 text-right">
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border bg-muted/5">
            <p className="text-sm font-black text-muted-foreground uppercase tracking-tight">
              {transactions.length === 0 ? 'אין הכנסות בטווח התאריכים הנבחר' : 'לא נמצאו תנועות העונות למסננים'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-black text-muted-foreground">
                {isAnyFilterActive ? 'סה״כ הכנסות מסוננות' : 'סה״כ הכנסות בטווח'}
              </span>
              <span
                className="text-xl font-black text-emerald-600 dark:text-emerald-400"
                dir="ltr"
              >
                {formatMoney(totalAmount)}
              </span>
            </div>

            <div className="space-y-2">
              {visibleTransactions.map((txn, index) => (
                <div
                  key={`${txn.accountKey}:${txn.id || txn.date}:${index}`}
                  className={cn(
                    'grid gap-2 border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/10',
                    txn.isDuplicate && 'opacity-60 grayscale-[0.5]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-right">
                      <p
                        className={cn(
                          'text-sm font-black leading-tight text-foreground',
                          txn.isDuplicate &&
                            'line-through decoration-destructive/40',
                        )}
                      >
                        {txn.description}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                        {txn.date
                          ? new Date(txn.date).toLocaleDateString('he-IL')
                          : '-'}{' '}
                        • {txn.accountLabel}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'text-sm font-black',
                        txn.isDuplicate
                          ? 'text-muted-foreground/40'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                      dir="ltr"
                    >
                      {formatMoney(txn.amount)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-right">
                    <button
                      onClick={() => handleToggleDuplicate(txn)}
                      disabled={toggleDuplicate.isPending}
                      className={cn(
                        'h-7 cursor-pointer border px-3 text-[10px] font-black uppercase transition-all active:scale-95 shadow-xs',
                        txn.isDuplicate
                          ? 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                          : 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground',
                      )}
                    >
                      {txn.isDuplicate ? 'בטל כפילות' : 'סמן ככפול'}
                    </button>
                    {txn.isDuplicate && (
                      <span className="text-[10px] font-bold italic text-muted-foreground/60 uppercase tracking-tighter">
                        תנועה כפולה - הוחרגה מהחישוב
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setDisplayLimit((prev) => prev + 50)}
                className="mb-4 w-full cursor-pointer border border-dashed border-border py-6 text-[10px] font-black text-muted-foreground transition-colors hover:text-primary"
              >
                טען עוד תנועות ({filteredAndSortedTransactions.length - displayLimit} נותרו)
              </button>
            )}
          </>
        )}
      </div>

      {(isLoading || toggleDuplicate.isPending) && (
        <CircleNotch className="absolute bottom-6 left-6 h-5 w-5 animate-spin text-muted-foreground/40" />
      )}
    </div>
  );
}

