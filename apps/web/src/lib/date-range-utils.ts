import { format } from 'date-fns';

export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getCurrentRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfMonth = now.getDate();

  // If less than a week (7 days) has passed in the current month
  const usePreviousMonth = dayOfMonth <= 7;

  const startMonthOffset = usePreviousMonth ? -1 : 0;

  const currentStart = new Date(
    now.getFullYear(),
    now.getMonth() + startMonthOffset,
    1,
  );
  const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startDate: toDateInputValue(currentStart),
    endDate: toDateInputValue(currentEnd),
  };
}

export type ScraperDateLimit = {
  years?: number;
  months?: number;
  days?: number;
};

export const SCRAPER_MIN_LOOKBACKS: Record<string, ScraperDateLimit> = {
  hapoalim: { years: 1, days: 1 },
  isracard: { years: 1 },
  max: { years: 4 },
  cal: { years: 1, months: 6, days: 1 },
};

export function subtractUtcDate(date: Date, amount: ScraperDateLimit): Date {
  const year = date.getFullYear() - (amount.years ?? 0);
  const month = date.getMonth() - (amount.months ?? 0);
  const firstOfTargetMonth = new Date(year, month, 1);
  const lastDayOfTargetMonth = new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth() + 1,
    0,
  ).getDate();
  const targetDay = Math.min(date.getDate(), lastDayOfTargetMonth);
  const result = new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth(),
    targetDay,
  );
  result.setDate(result.getDate() + (amount.days ?? 0));
  return result;
}

export function getMinimumStartDateForBank(
  bankId: string,
  now = new Date(),
): string {
  const limit = SCRAPER_MIN_LOOKBACKS[String(bankId).toLowerCase()] ?? {
    years: 1,
  };
  return toDateInputValue(subtractUtcDate(now, limit));
}
