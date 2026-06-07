import { Calendar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';
import { parseISO } from 'date-fns';
import { toDateInputValue } from '@/lib/date-range-utils';

interface DashboardRangePickerProps {
  startDate: string;
  endDate: string;
  minStartDate?: string;
  maxEndDate?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  isBusy?: boolean;
  isLocked?: boolean;
}

export function DashboardRangePicker({
  startDate,
  endDate,
  minStartDate,
  maxEndDate,
  onStartDateChange,
  onEndDateChange,
  isBusy = false,
  isLocked = false,
}: DashboardRangePickerProps) {
  const start = startDate ? parseISO(startDate) : undefined;
  const end = endDate ? parseISO(endDate) : undefined;
  const min = minStartDate ? parseISO(minStartDate) : undefined;
  const max = maxEndDate ? parseISO(maxEndDate) : undefined;

  const handleStartChange = (date?: Date) => {
    if (date) {
      onStartDateChange(toDateInputValue(date));
    }
  };

  const handleEndChange = (date?: Date) => {
    if (date) {
      onEndDateChange(toDateInputValue(date));
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        isLocked && 'opacity-50 grayscale pointer-events-none',
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground ml-2">
        <Calendar className="h-4.5 w-4.5 text-foreground/75" weight="bold" />
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
          טווח:
        </span>
      </div>

      <div className="flex items-center gap-1">
        <DatePicker
          date={start}
          onDateChange={handleStartChange}
          minDate={min}
          maxDate={end || max}
          disabled={isBusy || isLocked}
        />
        <span className="text-muted-foreground text-xs font-black px-1 opacity-40">
          ←
        </span>
        <DatePicker
          date={end}
          onDateChange={handleEndChange}
          minDate={start || min}
          maxDate={max}
          disabled={isBusy || isLocked}
        />
      </div>
    </div>
  );
}
