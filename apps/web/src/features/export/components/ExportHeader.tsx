import { DashboardRangePicker } from '@/features/dashboard/components/DashboardRangePicker';

interface ExportHeaderProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isBusy: boolean;
}

export function ExportHeader({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isBusy,
}: ExportHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-right pb-4 border-b border-border/40">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground flex items-center gap-3">
          <span>ייצוא נתונים</span>
        </h1>
        <p className="text-xs sm:text-sm font-bold text-muted-foreground/80 uppercase tracking-wide leading-relaxed">
          ייצוא של היתרות והתנועות מהחשבונות וכרטיסי האשראי המחוברים לפורמטים שונים.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
        <DashboardRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          isBusy={isBusy}
          pickerClassName="h-11"
        />
      </div>
    </div>
  );
}
