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
          <h2 className="text-base font-black text-zinc-950 dark:text-white">
            טווח נתונים לכל הדשבורד
          </h2>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            הטווח משפיע על הוצאות אשראי והכנסות בנק. יתרה מציגה את הערך העדכני האחרון.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <span className="block">מתאריך</span>
            <input
              type="date"
              value={startDate}
              min={minStartDate}
              max={endDate || maxEndDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              disabled={isBusy || isLocked}
              className="h-10 w-full border border-zinc-200 bg-white px-3 text-zinc-800 outline-none transition-colors focus:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-zinc-100"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <span className="block">עד תאריך</span>
            <input
              type="date"
              value={endDate}
              min={startDate || minStartDate}
              max={maxEndDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              disabled={isBusy || isLocked}
              className="h-10 w-full border border-zinc-200 bg-white px-3 text-zinc-800 outline-none transition-colors focus:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-zinc-100"
            />
          </label>
        </div>
      </div>

      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px] dark:bg-zinc-950/80">
          <LockKey className="h-5 w-5 text-zinc-400" weight="duotone" />
          <p className="text-xs font-black text-zinc-500 dark:text-zinc-400">נדרש חיבור מקור נתונים</p>
          <Link
            to="/settings"
            className="mt-1 border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-black text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
          >
            עבור להגדרות ←
          </Link>
        </div>
      )}
    </PremiumCard>
  );
}
