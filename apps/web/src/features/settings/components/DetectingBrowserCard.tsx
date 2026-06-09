import { CircleNotch } from '@phosphor-icons/react';
import { PremiumCard } from '@/components/ui/premium-card';

export function DetectingBrowserCard() {
  return (
    <PremiumCard className="p-12 flex flex-col items-center justify-center text-center space-y-4">
      <CircleNotch className="h-10 w-10 animate-spin text-primary" />
      <div className="space-y-1">
        <p className="text-sm font-black text-foreground">
          מחפש דפדפן תואם במערכת...
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">
          פעולה זו מתבצעת באופן אוטומטי לצורך הגדרת הסורקים
        </p>
      </div>
    </PremiumCard>
  );
}
