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
}

export interface BankAccount {
  bankId: string;
  accountNumber: string;
  balance?: number;
  transactions: Transaction[];
}

type SyncRangePayload = {
  startDate?: string;
  endDate?: string;
  silent?: boolean;
};

export function isCreditCompanyBankId(bankId: string): boolean {
  const normalized = String(bankId ?? '').toLowerCase();
  return normalized === 'max' || normalized === 'isracard' || normalized === 'cal';
}

export function isBankAccountBankId(bankId: string): boolean {
  return !isCreditCompanyBankId(bankId);
}

export function useAccounts() {
  const session = useAppStore((s) => s.session);

  return useQuery({
    queryKey: ['connected-accounts'],
    queryFn: () => api.get<BankAccount[]>('/scrapers/accounts'),
    enabled: !!session,
  });
}

export function useCreditAccount() {
  const query = useAccounts();
  const accounts = (query.data ?? []).filter((account) => isCreditCompanyBankId(account.bankId));
  return {
    ...query,
    accounts,
  };
}

export function useBankAccount() {
  const query = useAccounts();
  const accounts = (query.data ?? []).filter((account) => isBankAccountBankId(account.bankId));
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
