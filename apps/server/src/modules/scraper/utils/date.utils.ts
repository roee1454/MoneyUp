import { ScraperDateLimit } from '../types/scraper.types';

/**
 * Gets the current date in UTC format as a string (YYYY-MM-DD).
 *
 * @returns Date string in YYYY-MM-DD format.
 */
export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calculates a Date object representing exactly one month ago in UTC.
 * Matches the current day of the month or clamps to the last day of the target month.
 *
 * @returns Date object one month ago in UTC.
 */
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

/**
 * Gets the UTC date string representing exactly one month ago (YYYY-MM-DD).
 *
 * @returns Date string in YYYY-MM-DD format.
 */
export function getOneMonthAgoUtcDateString(): string {
  return getOneMonthAgoUtc().toISOString().slice(0, 10);
}

/**
 * Subtracts a specified amount of time (years, months, days) from a UTC Date.
 *
 * @param date The baseline UTC Date object.
 * @param amount ScraperDateLimit configuration for how much time to subtract.
 * @returns A new UTC Date object.
 */
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

/**
 * Converts a YYYY-MM-DD date string to a UTC Date object set at midnight.
 *
 * @param dateStr Date string in YYYY-MM-DD format.
 * @returns Date object.
 */
export function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Adds or subtracts days to/from a YYYY-MM-DD date string, returning a new YYYY-MM-DD string.
 *
 * @param dateStr Base date string in YYYY-MM-DD format.
 * @param days The number of days to add (negative to subtract).
 * @returns The resulting date string in YYYY-MM-DD format.
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Checks if a date falls within a half-open UTC date range [start, end).
 *
 * @param date The date to test.
 * @param start Range start date (inclusive).
 * @param end Range end date (exclusive).
 * @returns True if date is within the range, false otherwise.
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  return date >= start && date < end;
}
