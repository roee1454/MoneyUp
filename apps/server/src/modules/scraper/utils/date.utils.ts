import { ScraperDateLimit } from '../types/scraper.types';

export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getOneMonthAgoUtc(): Date {
  const now = new Date();
  const targetMonth = now.getUTCMonth() - 1;
  const firstOfTargetMonth = new Date(
    Date.UTC(now.getUTCFullYear(), targetMonth, 1),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const targetDay = Math.min(now.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      targetDay,
    ),
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
      0,
    ),
  ).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);
  const result = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
      targetDay,
    ),
  );
  result.setUTCDate(result.getUTCDate() + (amount.days ?? 0));
  return result;
}

export function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  return date >= start && date < end;
}
