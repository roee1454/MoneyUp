import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useAppStore } from '@/store';
import { BankConnectionsSection } from '@/features/settings/components/BankConnectionsSection';
import { AddBankAccountDialog } from '@/features/accounts/components/AddBankAccountDialog';

export default function AccountsSettings() {
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const syncState = useAppStore((s) => s.sync);
  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();

  const isSyncing =
    syncState.status === 'running' || syncState.status === 'reconnecting';

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          חשבונות ואשראי
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          נהל את החיבורים שלך למוסדות הפיננסיים וכרטיסי האשראי לסנכרון אוטומטי
          של הנתונים.
        </p>
      </div>

      <BankConnectionsSection
        accounts={accounts}
        isLoadingAccounts={isLoadingAccounts}
        isSyncing={isSyncing}
        onAddClick={() => setIsBankDialogOpen(true)}
      />

      <AddBankAccountDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSuccess={() => {}}
      />
    </div>
  );
}
