import * as React from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      dir="rtl"
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-2 relative items-center h-9',
        caption_label: 'text-sm font-black uppercase tracking-tight',
        nav: 'flex items-center justify-between absolute inset-x-0 z-20 h-9',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 mr-4 opacity-50 hover:opacity-100 border-border rounded-none',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-border rounded-none',
        ),
        month_grid: 'w-full border-collapse space-y-1 mt-4',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-bold text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-black aria-selected:opacity-100 rounded-none hover:bg-primary hover:text-primary-foreground transition-all',
        ),
        day_button: 'h-full w-full',
        range_end: 'day-range-end',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today:
          'bg-accent text-accent-foreground font-black underline underline-offset-4',
        outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return <CaretRight className="h-4 w-4" weight="bold" />;
          }
          return <CaretLeft className="h-4 w-4" weight="bold" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
