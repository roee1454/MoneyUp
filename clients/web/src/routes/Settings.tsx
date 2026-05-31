import { useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { useAccounts } from '@/hooks/useAccounts';
import { AddBankAccountDialog } from '@/features/accounts/components/AddBankAccountDialog';
import { AddAiProviderDialog } from '@/features/ai/components/AddAiProviderDialog';

// Feature Components
import { BankConnectionsSection } from '@/features/settings/components/BankConnectionsSection';
import { AiProvidersSection } from '@/features/settings/components/AiProvidersSection';
import { ScraperSettingsSection } from '@/features/settings/components/ScraperSettingsSection';

export default function Settings() {
  const session = useAppStore((s) => s.session);
  const syncState = useAppStore((s) => s.sync);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const { data: accounts = [], isLoading: isLoadingAccounts } = useAccounts();
  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    refetch: refetchProfile,
  } = useUserProfile(session?.userId);

  const isSyncing =
    syncState.status === 'running' || syncState.status === 'reconnecting';

  if (isLoadingAccounts || isLoadingProfile) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center animate-in fade-in-50 duration-300" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">טוען הגדרות מערכת...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-right animate-in fade-in-50 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight">הגדרות מערכת</h1>
          <p className="text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
            נהל את כל היבטי המערכת שלך במקום אחד: מחיבורי הבנקים והאשראי, דרך
            הגדרות ה-AI ועד לקונפיגורציה מתקדמת של הסורקים האוטומטיים.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            מחובר כ-{userProfile?.username}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <BankConnectionsSection
            accounts={accounts}
            isLoadingAccounts={isLoadingAccounts}
            isSyncing={isSyncing}
            onAddClick={() => setIsBankDialogOpen(true)}
          />
          <AiProvidersSection
            userProfile={userProfile}
            onAddClick={() => setIsAiDialogOpen(true)}
          />
        </div>

        <ScraperSettingsSection userProfile={userProfile} />
      </div>

      <AddBankAccountDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSuccess={() => {}}
      />
      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={refetchProfile}
      />
    </div>
  );
}
