import { useState } from 'react';
import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { AiProvidersSection } from '@/features/settings/components/AiProvidersSection';
import { AddAiProviderDialog } from '@/features/ai/components/AddAiProviderDialog';

export default function AiSettings() {
  const session = useAppStore((s) => s.session);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const { data: userProfile, refetch: refetchProfile } = useUserProfile(
    session?.userId,
  );

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          בינה מלאכותית
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          הגדר את ספקי ה-AI שישמשו לניתוח ההוצאות שלך, קבלת תובנות ויצירת דוחות
          חכמים.
        </p>
      </div>

      <AiProvidersSection
        userProfile={userProfile}
        onAddClick={() => setIsAiDialogOpen(true)}
      />

      <AddAiProviderDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        onSuccess={refetchProfile}
      />
    </div>
  );
}
