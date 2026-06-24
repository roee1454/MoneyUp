import { Calendar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';
import { parseISO, addYears, subYears } from 'date-fns';
import { toDateInputValue } from '@money-up/common';

interface DashboardRangePickerProps {
  startDate: string;
  endDate: string;
  minStartDate?: string;
  maxEndDate?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  isBusy?: boolean;
  isLocked?: boolean;
  className?: string;
  pickerClassName?: string;
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
  className,
  pickerClassName,
}: DashboardRangePickerProps) {
  const start = startDate ? parseISO(startDate) : undefined;
  const end = endDate ? parseISO(endDate) : undefined;
  const min = minStartDate ? parseISO(minStartDate) : undefined;
  const max = maxEndDate ? parseISO(maxEndDate) : new Date();

  const startMinDate = end
    ? min && min.getTime() > subYears(end, 1).getTime()
      ? min
      : subYears(end, 1)
    : min;

  const endMaxDate = start
    ? max && max.getTime() < addYears(start, 1).getTime()
      ? max
      : addYears(start, 1)
    : max;

  const handleStartChange = (date?: Date) => {
    if (date) {
      onStartDateChange(toDateInputValue(date));
      if (end && end.getTime() > addYears(date, 1).getTime()) {
        onEndDateChange(toDateInputValue(addYears(date, 1)));
      }
    }
  };

  const handleEndChange = (date?: Date) => {
    if (date) {
      onEndDateChange(toDateInputValue(date));
      if (start && start.getTime() < subYears(date, 1).getTime()) {
        onStartDateChange(toDateInputValue(subYears(date, 1)));
      }
    }
  };

  const hasWidth = className && /\bw-/.test(className);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-2',
        !hasWidth && 'w-full sm:w-auto',
        isLocked && 'opacity-50 grayscale pointer-events-none',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground ml-2 sm:ml-0 lg:ml-2">
        <Calendar className="h-4.5 w-4.5 text-foreground/75" weight="bold" />
        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
          טווח:
        </span>
      </div>

      <div className={cn(
        'flex items-center gap-1 w-full justify-between',
        !hasWidth && 'sm:w-auto'
      )}>
        <DatePicker
          date={start}
          onDateChange={handleStartChange}
          minDate={startMinDate}
          maxDate={end || max}
          disabled={isBusy || isLocked}
          className={pickerClassName}
        />
        <span className="text-muted-foreground text-xs font-black px-1 opacity-40">
          ←
        </span>
        <DatePicker
          date={end}
          onDateChange={handleEndChange}
          minDate={start || min}
          maxDate={endMaxDate}
          disabled={isBusy || isLocked}
          className={pickerClassName}
        />
      </div>
    </div>
  );
}

