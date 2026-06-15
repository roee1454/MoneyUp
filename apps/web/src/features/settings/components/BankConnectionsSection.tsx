import { Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { AccountStrip } from '@/features/accounts/components/AccountStrip';
import type { BankAccount } from '@/hooks/useAccounts';

interface BankConnectionsSectionProps {
  accounts: BankAccount[];
  isLoadingAccounts: boolean;
  isSyncing?: boolean;
  onAddClick: () => void;
}

export function BankConnectionsSection({
  accounts,
  isLoadingAccounts,
  isSyncing = false,
  onAddClick,
}: BankConnectionsSectionProps) {
  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-none bg-primary flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary-foreground" weight="bold" />
          </div>
          <h2 className="text-xl font-black text-foreground">
            מקורות מידע פיננסי
          </h2>
        </div>
        <Button
          onClick={onAddClick}
          disabled={isSyncing}
          className="h-9 px-4 text-xs font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-none shadow-lg shadow-primary/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{isSyncing ? 'מסנכרן כעת...' : 'הוספת חשבון / כרטיס'}</span>
        </Button>
      </div>

      <AccountStrip
        accounts={accounts}
        onAddClick={onAddClick}
        isInitialLoading={isLoadingAccounts}
        isRefreshingValues={isSyncing}
      />
    </section>
  );
}
