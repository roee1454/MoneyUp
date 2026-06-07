import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { emitScraperSocket } from '@/lib/scraper-socket';
import { useAppStore } from '@/store';

interface Transaction {
  id: string;
  date: string;
  processedDate: string;
  amount: number;
  chargedAmount: number;
  description: string;
  memo?: string;
  originalCurrency?: string;
  isDuplicate?: boolean;
}

export interface BankAccount {
  bankId: string;
  accountNumber: string;
  balance?: number;
  lastScrapedAt?: string | null;
  transactions: Transaction[];
}

type SyncRangePayload = {
  startDate?: string;
  endDate?: string;
  silent?: boolean;
};

type AccountsRangeFilters = {
  startDate?: string;
  endDate?: string;
};

function buildAccountsQuery(filters: AccountsRangeFilters = {}): string {
  const params = new URLSearchParams();
  if (
    filters.startDate &&
    filters.endDate &&
    filters.startDate <= filters.endDate
  ) {
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
  }
  const query = params.toString();
  return query ? `/scrapers/accounts?${query}` : '/scrapers/accounts';
}

export function isCreditCompanyBankId(bankId: string): boolean {
  const normalized = String(bankId ?? '').toLowerCase();
  return (
    normalized === 'max' || normalized === 'isracard' || normalized === 'cal'
  );
}

export function isBankAccountBankId(bankId: string): boolean {
  return !isCreditCompanyBankId(bankId);
}

export function useAccounts(filters: AccountsRangeFilters = {}) {
  const session = useAppStore((s) => s.session);

  return useQuery({
    queryKey: [
      'connected-accounts',
      filters.startDate ?? '',
      filters.endDate ?? '',
    ],
    queryFn: () => api.get<BankAccount[]>(buildAccountsQuery(filters)),
    enabled: !!session,
  });
}

export function useCreditAccount() {
  const query = useAccounts();
  const accounts = (query.data ?? []).filter((account) =>
    isCreditCompanyBankId(account.bankId),
  );
  return {
    ...query,
    accounts,
  };
}

export function useBankAccount() {
  const query = useAccounts();
  const accounts = (query.data ?? []).filter((account) =>
    isBankAccountBankId(account.bankId),
  );
  return {
    ...query,
    accounts,
  };
}

export function useSyncAccounts() {
  return useMutation({
    mutationFn: (payload?: SyncRangePayload) => {
      return emitScraperSocket('sync:start', { mode: 'manual', ...payload });
    },
    onSuccess: (_data, variables) => {
      if (!variables?.silent) {
        toast.success('הסנכרון התחיל ברקע.');
      }
    },
    onError: () => {
      toast.error('אירעה שגיאה בהפעלת הסנכרון. אנא נסה שנית.');
    },
  });
}

export function useToggleTransactionDuplicate() {
  return useMutation({
    mutationFn: (payload: {
      bankId: string;
      accountNumber: string;
      id: string;
      isDuplicate: boolean;
    }) => {
      return api.post(
        `/spending/transactions/${payload.bankId}/${payload.accountNumber}/${payload.id}/duplicate`,
        { isDuplicate: payload.isDuplicate },
      );
    },
    onError: () => {
      toast.error('שגיאה בעדכון התנועה');
    },
  });
}

export function useDisconnectAccount() {
  return useMutation({
    mutationFn: (bankId: string) => {
      return api.post('/scrapers/disconnect', { bankId });
    },
    onSuccess: () => {
      toast.success('החשבון נותק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה בניתוק החשבון');
    },
  });
}
