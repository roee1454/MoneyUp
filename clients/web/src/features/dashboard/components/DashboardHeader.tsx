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
    <div className="flex flex-col gap-4 border border-border bg-card/30 p-6 md:flex-row md:items-center md:justify-between rounded-none text-right" dir="rtl">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {greeting}, <span className="text-muted-foreground">{username}</span> ✌️
        </h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
          מבט פיננסי מהיר על החשבונות וההוצאות שלך
        </p>
      </div>

      <div className="flex items-center gap-3">
        {controls}
      </div>
    </div>
  );
}
