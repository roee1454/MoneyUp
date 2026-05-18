import { useState } from 'react';
import { Loader2, Sparkles, Building2, Plus, PenSquare } from 'lucide-react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { useAccounts } from '@/hooks/useAccounts';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { AddBankAccountDialog } from '@/components/AddBankAccountDialog';
import { AddAiProviderDialog } from '@/components/AddAiProviderDialog';

export default function Settings() {
  const session = useAppStore((s) => s.session);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const { data: accounts = [], isLoading: isLoadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { data: userProfile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserProfile(session?.userId);

  const isLoading = isLoadingAccounts || isLoadingProfile;

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center animate-in fade-in-50 duration-300" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-400">טוען הגדרות מערכת...</span>
        </div>
      </div>
    );
  }

  const activeProvider = userProfile?.activeAiProvider;
  const preferredModel = userProfile?.preferredModel;

  return (
    <div className="space-y-6 text-right animate-in fade-in-50 duration-300" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-zinc-950 dark:text-white leading-tight">הגדרות חשבון</h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          נהל את קישוריות הבנקים והגדרות ספק הבינה המלאכותית שלך לצורך הפקת דוחות וניתוחים.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Right Column: Bank accounts integration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">חיבורי בנקים</h2>
            <Button
              onClick={() => setIsBankDialogOpen(true)}
              className="h-8 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-none flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>חבר בנק חדש</span>
            </Button>
          </div>

          {accounts.length === 0 ? (
            <PremiumCard className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 text-center flex flex-col items-center justify-center min-h-48">
              <Building2 className="h-8 w-8 text-zinc-400 mb-2" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">לא נמצאו חשבונות בנק מחוברים</p>
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
                חבר חשבון בנק כדי שנוכל לנתח את ההוצאות שלך ולהציג אותן בלוח הבקרה.
              </p>
            </PremiumCard>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <PremiumCard
                  key={acc.accountNumber}
                  className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                      <Building2 className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{acc.bankId}</h4>
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
                        מספר חשבון: {acc.accountNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ₪{acc.balance}
                    </p>
                    <p className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">מסונכרן</p>
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}
        </div>

        {/* Left Column: AI configuration integration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">ספק בינה מלאכותית (AI)</h2>
            {activeProvider && (
              <Button
                onClick={() => setIsAiDialogOpen(true)}
                className="h-8 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 rounded-none flex items-center gap-1.5"
              >
                <PenSquare className="h-3.5 w-3.5" />
                <span>שינוי הגדרות</span>
              </Button>
            )}
          </div>

          {activeProvider ? (
            <PremiumCard className="p-5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between min-h-48">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">ספק AI פעיל</h3>
                    <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">מפתח API הוגדר ומסונכרן מקומית</p>
                  </div>
                </div>

                <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-3.5 border border-zinc-200/50 dark:border-zinc-800/50 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 dark:text-zinc-500">פלטפורמה</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 capitalize">{activeProvider}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2.5">
                    <span className="text-zinc-400 dark:text-zinc-500">מודל ברירת מחדל</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 dir-ltr">{preferredModel || 'Use Default'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 text-center">
                סוכן הבינה המלאכותית מוכן ומחובר בפרטיות בעמוד 'ייעוץ עם סוכן'.
              </div>
            </PremiumCard>
          ) : (
            <PremiumCard className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-center flex flex-col items-center justify-center min-h-48">
              <Sparkles className="h-8 w-8 text-zinc-400 mb-2 animate-pulse" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">לא מוגדר ספק בינה מלאכותית</p>
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
                הגדר ספק API של OpenAI, Claude או Gemini כדי לאפשר ניתוחי הוצאות מתקדמים.
              </p>
              <Button
                onClick={() => setIsAiDialogOpen(true)}
                className="mt-5 text-xs font-bold rounded-none bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 h-9 px-5"
              >
                <span>הגדר ספק AI</span>
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </PremiumCard>
          )}
        </div>
      </div>

      {/* Dialog Containers */}
      <AddBankAccountDialog
        open={isBankDialogOpen}
        onOpenChange={setIsBankDialogOpen}
        onSuccess={refetchAccounts}
      />
      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={refetchProfile}
      />
    </div>
  );
}
