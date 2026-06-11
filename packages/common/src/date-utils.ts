export type ScraperDateLimit = {
  years?: number;
  months?: number;
  days?: number;
};

export const SCRAPER_MIN_LOOKBACKS: Record<string, ScraperDateLimit> = {
  hapoalim: { years: 1, days: 1 },
  leumi: { years: 1 },
  yahav: { years: 1 },
  isracard: { years: 1 },
  max: { years: 4 },
  cal: { years: 1, months: 6, days: 1 },
};

export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getOneMonthAgoUtc(): Date {
  const now = new Date();
  const targetMonth = now.getUTCMonth() - 1;
  const firstOfTargetMonth = new Date(
    Date.UTC(now.getUTCFullYear(), targetMonth, 1)
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();
  const targetDay = Math.min(now.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      targetDay
    )
  );
}

export function getOneMonthAgoUtcDateString(): string {
  return getOneMonthAgoUtc().toISOString().slice(0, 10);
}

export function subtractUtcDate(date: Date, amount: ScraperDateLimit): Date {
  const year = date.getUTCFullYear() - (amount.years ?? 0);
  const month = date.getUTCMonth() - (amount.months ?? 0);
  const firstOfTargetMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);
  const result = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      targetDay
    )
  );
  result.setUTCDate(result.getUTCDate() + (amount.days ?? 0));
  return result;
}

export function toUtcDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  return date >= start && date < end;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + "-" + month + "-" + day;
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
    1
  );
  const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startDate: toDateInputValue(currentStart),
    endDate: toDateInputValue(currentEnd),
  };
}

export function getMinimumStartDateForBank(
  bankId: string,
  now = new Date()
): string {
  const limit = SCRAPER_MIN_LOOKBACKS[String(bankId).toLowerCase()] ?? {
    years: 1,
  };
  return subtractUtcDate(now, limit).toISOString().slice(0, 10);
}
