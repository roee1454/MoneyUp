import { Sparkle } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiConversation } from '@/components/AiConversation';
import { PremiumCard } from '@/components/ui/premium-card';
import { Button } from '@/components/ui/button';
import { AddAiProviderDialog } from '@/components/AddAiProviderDialog';

export default function AiStudio() {
  const session = useAppStore((s) => s.session);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const {
    data: userProfile,
    isLoading,
    refetch: refetchProfile,
  } = useUserProfile(session?.userId);

  if (isLoading) {
    return (
      <div
        className="h-[60vh] flex items-center justify-center text-center"
        dir="rtl"
      >
        <span className="text-sm font-semibold text-muted-foreground">
          טוען הגדרות AI...
        </span>
      </div>
    );
  }

  const hasAiProvider = !!userProfile?.activeAiProvider;

  return (
    <div
      className="text-right animate-in fade-in-50 duration-300 h-[calc(100vh-7.5rem)] flex flex-col gap-4 overflow-hidden"
      dir="rtl"
    >
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
          ייעוץ עם סוכן
        </h1>
        <p className="text-sm font-semibold text-muted-foreground">
          שאל שאלות פיננסיות, קבל ניתוח הוצאות חכם, ותכנן את העתיד הכלכלי שלך
          בעזרת סוכן AI חכם.
        </p>
      </div>

      {hasAiProvider && userProfile?.activeAiProvider ? (
        <div className="flex-1 flex flex-col min-h-0">
          <AiConversation
            provider={userProfile.activeAiProvider}
            preferredModel={userProfile.preferredModel}
            userProfile={userProfile}
          />
        </div>
      ) : (
        <div className="flex items-center justify-start">
          <PremiumCard className="border border-dashed border-border bg-muted/20 p-6 md:p-8 text-right space-y-3 animate-in fade-in-50 duration-300 max-w-xl w-full">
            <p className="text-lg font-black text-foreground">
              🤖 נצל את כוחה של הבינה המלאכותית
            </p>
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
              חבר את מפתח הAPI של ספק הבינה המלאכותית האהוב עלייך וקבל ייעוץ
              פיננסי מסוכן חכם.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setIsAiDialogOpen(true)}
                className="rounded-none font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Sparkle className="h-4 w-4" weight="duotone" />
                <span>הוסף ספק</span>
              </Button>
            </div>
          </PremiumCard>
        </div>
      )}

      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={() => {
          void refetchProfile();
        }}
      />
    </div>
  );
}
