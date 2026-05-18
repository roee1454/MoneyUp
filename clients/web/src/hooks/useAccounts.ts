import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
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

export function useAccounts() {
  const session = useAppStore((s) => s.session);

  return useQuery({
    queryKey: ['connected-accounts'],
    queryFn: () => api.get<BankAccount[]>('/scrapers/accounts'),
    enabled: !!session,
  });
}

export function useSyncAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/scrapers/sync'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      toast.success('הנתונים סונכרנו בהצלחה מהבנק!');
    },
    onError: () => {
      toast.error('אירעה שגיאה במהלך הסנכרון החי מול הבנק. אנא נסה שנית.');
    },
  });
}
