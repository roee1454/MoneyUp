import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AddBankAccountDialog } from '@/components/AddBankAccountDialog';
import { useAccounts, useSyncAccounts } from '@/hooks/useAccounts';
import { AccountStrip } from '@/components/AccountStrip';
import { SpendingCategories } from '@/components/SpendingCategories';
import { useUserProfile } from '@/hooks/useUsers';
import { AddAiProviderDialog } from '@/components/AddAiProviderDialog';

export default function Dashboard() {
  const session = useAppStore((s) => s.session);
  const [greeting, setGreeting] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('בוקר טוב');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('צהריים טובים');
    } else if (hour >= 18 && hour < 22) {
      setGreeting('ערב טוב');
    } else {
      setGreeting('לילה טוב');
    }
  }, []);

  const { data: accounts = [], isLoading, refetch } = useAccounts();
  const { data: userProfile, refetch: refetchProfile } = useUserProfile(session?.userId);
  const syncMutation = useSyncAccounts();
  const isSyncing = syncMutation.isPending;
  const hasAiProvider = !!userProfile?.activeAiProvider;

  async function handleSync() {
    await syncMutation.mutateAsync();
  }

  return (
    <section className="space-y-8 py-10" dir="rtl">
      {isSyncing && (
        <div className="fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-6 py-5 shadow-2xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-500" />
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">מסנכרן נתונים חיים מהבנק...</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500 dark:text-zinc-400" />
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">טוען את נתוני החשבונות המסונכרנים...</span>
        </div>
      ) : (
        <>
          <AccountStrip accounts={accounts} onAddClick={() => setIsDialogOpen(true)} />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-tight">
                {greeting}, <span className="text-zinc-400 dark:text-zinc-500">{session?.username}</span>
              </h1>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                הגעת למקום הנכון לקחת שליטה על ההוצאות שלך.
              </p>
            </div>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="group h-11 rounded-none px-6 font-bold text-xs bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:dark:bg-zinc-800 disabled:text-zinc-500 text-white transition-all duration-300 shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Loader2 className={`h-4 w-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span>{isSyncing ? 'מסנכרן תנועות...' : 'סנכרן כעת'}</span>
            </Button>
          </div>

          {!hasAiProvider && (
            <div className="border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-6 md:p-8 text-right space-y-3 animate-in fade-in-50 duration-300">
              <p className="text-lg font-black text-zinc-950 dark:text-zinc-100">🤖 נצל את כוחה של הבינה המלאכותית</p>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 leading-relaxed">
                חבר את מפתח הAPI של ספק הבינה המלאכותית האהוב עלייך וקבל ייעוץ פיננסי מסוכן חכם.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => setIsAiDialogOpen(true)}
                  className="rounded-none font-bold text-xs h-10 bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>לחץ להגדרת סוכן AI</span>
                </Button>
              </div>
            </div>
          )}

          {hasAiProvider && (
            <div className="grid gap-6 animate-in fade-in-50 duration-300">
              <SpendingCategories accounts={accounts} />
            </div>
          )}
        </>
      )}

      {/* Add Bank Account Dialog & Add AI Provider */}
      <AddBankAccountDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={refetch}
      />
      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={() => {
          void refetchProfile();
        }}
      />
    </section>
  );
}
