import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  onDateChange: (date?: Date) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'בחר תאריך',
  minDate,
  maxDate,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedDate?: Date) => {
    if (disabled) return;
    setOpen(false);
    onDateChange(selectedDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          disabled={disabled}
          className={cn(
            'h-9 w-28 justify-start text-right px-2 font-bold text-xs border-border bg-transparent hover:bg-muted/50 rounded-none transition-colors',
            !date && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            weight="bold"
          />
          {date ? (
            format(date, 'dd/MM/yyyy', { locale: he })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-border shadow-2xl rounded-none overflow-hidden"
        align="center"
        dir="rtl"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          defaultMonth={date}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          locale={he}
          className="bg-card text-foreground font-sans"
        />
      </PopoverContent>
    </Popover>
  );
}

