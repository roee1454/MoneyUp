import { CircleNotch } from '@phosphor-icons/react';

export function DetectingBrowserCard() {
  return (
    <div className="border border-border bg-muted/10 p-12 flex flex-col items-center justify-center text-center space-y-4 rounded-none">
      <CircleNotch className="h-10 w-10 animate-spin text-primary" />
      <div className="space-y-1">
        <p className="text-sm font-black text-foreground">
          מחפש דפדפן תואם במערכת...
        </p>
        <p className="text-[11px] font-medium text-muted-foreground">
          פעולה זו מתבצעת באופן אוטומטי לצורך הגדרת הסורקים
        </p>
      </div>
    </div>
  );
}
