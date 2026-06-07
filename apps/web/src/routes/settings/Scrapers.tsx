import { useAppStore } from '@/store';
import { useUserProfile } from '@/hooks/useUsers';
import { ScraperSettingsSection } from '@/features/settings/components/ScraperSettingsSection';

export default function ScrapersSettings() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile } = useUserProfile(session?.userId);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase">
          הגדרות סריקה
        </h2>
        <p className="text-muted-foreground font-medium max-w-2xl">
          קונפיגורציה מתקדמת לסורקים האוטומטיים, ניהול זמני המתנה ואיתור רכיבי
          דפדפן.
        </p>
      </div>

      <ScraperSettingsSection userProfile={userProfile} />
    </div>
  );
}
