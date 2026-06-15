import type { ReactNode } from 'react';

interface DashboardHeaderProps {
  greeting: string;
  username?: string;
  controls?: ReactNode;
}

export function DashboardHeader({
  greeting,
  username,
  controls,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-right py-2" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
          {greeting}, <span className="text-primary">{username}</span> ✌️
        </h1>
        <p className="text-xs sm:text-sm font-bold text-muted-foreground/80 uppercase tracking-wide leading-relaxed">
          מבט פיננסי מהיר על החשבונות וההוצאות שלך
        </p>
      </div>

      <div className="flex items-center gap-3">
        {controls}
      </div>
    </div>
  );
}
