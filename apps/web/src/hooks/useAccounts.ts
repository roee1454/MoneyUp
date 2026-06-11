import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { emitScraperSocket } from '@/lib/scraper-socket';
import { useAppStore } from '@/store';

import type { BankAccount } from '@money-up/types';
export type { BankAccount };

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

/**
 * Determines whether a given bank ID corresponds to a credit card company.
 *
 * @param bankId - The unique identifier of the bank/company.
 * @returns True if the bank ID belongs to a credit company (e.g., max, isracard, cal), false otherwise.
 */
export function isCreditCompanyBankId(bankId: string): boolean {
  const normalized = String(bankId ?? '').toLowerCase();
  return (
    normalized === 'max' || normalized === 'isracard' || normalized === 'cal'
  );
}

/**
 * Determines whether a given bank ID corresponds to a standard bank account.
 *
 * @param bankId - The unique identifier of the bank/company.
 * @returns True if the bank ID belongs to a standard bank account, false otherwise.
 */
export function isBankAccountBankId(bankId: string): boolean {
  return !isCreditCompanyBankId(bankId);
}

/**
 * Fetches the list of all connected bank accounts using query filters.
 *
 * @param filters - Optional filters containing date ranges for the accounts fetch.
 * @returns The React Query result containing the list of connected bank accounts.
 */
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

/**
 * Fetches and filters connected accounts to return only credit card company accounts.
 *
 * @returns An object containing the query state and the filtered list of credit card accounts.
 */
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

/**
 * Fetches and filters connected accounts to return only standard bank accounts.
 *
 * @returns An object containing the query state and the filtered list of standard bank accounts.
 */
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

/**
 * Starts a manual background synchronization process for accounts and transactions.
 *
 * @returns The React Query mutation object for triggering the accounts sync.
 */
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

/**
 * Toggles the duplicate status of a specific transaction.
 *
 * @returns The React Query mutation object for updating the transaction's duplicate status.
 */
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

/**
 * Disconnects a specific bank account from the system.
 *
 * @returns The React Query mutation object for disconnecting the bank account.
 */
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
