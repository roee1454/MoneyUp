import { LockKey } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { PremiumCard } from '@/components/ui/premium-card';

interface DashboardRangeCardProps {
  startDate: string;
  endDate: string;
  minStartDate?: string;
  maxEndDate?: string;
  isBusy?: boolean;
  isLocked?: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function DashboardRangeCard({
  startDate,
  endDate,
  minStartDate,
  maxEndDate,
  isBusy = false,
  isLocked = false,
  onStartDateChange,
  onEndDateChange,
}: DashboardRangeCardProps) {
  return (
    <PremiumCard className="relative grid gap-4 overflow-hidden">
      <div className="space-y-3">
        <div className="space-y-1 text-right">
          <h2 className="text-base font-black text-foreground">
            טווח נתונים לכל הדשבורד
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            הטווח משפיע על הוצאות אשראי והכנסות בנק. יתרה מציגה את הערך העדכני
            האחרון.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-foreground/70">
            <span className="block">מתאריך</span>
            <input
              type="date"
              value={startDate}
              min={minStartDate}
              max={endDate || maxEndDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              disabled={isBusy || isLocked}
              className="h-10 w-full border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-foreground/70">
            <span className="block">עד תאריך</span>
            <input
              type="date"
              value={endDate}
              min={startDate || minStartDate}
              max={maxEndDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              disabled={isBusy || isLocked}
              className="h-10 w-full border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-[2px]">
          <LockKey className="h-5 w-5 text-muted-foreground" weight="duotone" />
          <p className="text-xs font-black text-muted-foreground">
            נדרש חיבור מקור נתונים
          </p>
          <Link
            to="/settings"
            className="mt-1 border border-border bg-background px-3 py-1.5 text-[11px] font-black text-foreground/70 transition-colors hover:border-primary/50 hover:text-primary"
          >
            עבור להגדרות ←
          </Link>
        </div>
      )}
    </PremiumCard>
  );
}
