/**
 * Date utilities for the financial projection engine.
 * All dates use ISO 8601 format (YYYY-MM-DD) for consistency and determinism.
 */

/**
 * Parse an ISO date string into a Date object.
 * Sets time to noon UTC to avoid timezone issues.
 */
export function parseISO(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * Format a Date object into an ISO date string (YYYY-MM-DD).
 */
export function formatISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a date, handling month-end edge cases.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getUTCMonth() + months;
  result.setUTCMonth(targetMonth);

  // Handle month overflow (e.g., Jan 31 + 1 month should be Feb 28/29)
  // If the day changed, we overflowed - go back to last day of target month
  if (result.getUTCDate() !== date.getUTCDate()) {
    result.setUTCDate(0); // Sets to last day of previous month
  }

  return result;
}

/**
 * Calculate the difference in months between two dates.
 * Returns a positive number if end is after start.
 */
export function diffMonths(start: Date, end: Date): number {
  const yearDiff = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = end.getUTCMonth() - start.getUTCMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Get the first day of the month for a given date.
 */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0, 0));
}

/**
 * Check if date a is before date b.
 */
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/**
 * Check if date a is after date b.
 */
export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

/**
 * Check if two dates are in the same month and year.
 */
export function isSameMonth(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

/**
 * Get the month key (YYYY-MM) for indexing purposes.
 */
export function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Parse a month key (YYYY-MM) into a Date at the first of that month.
 */
export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0));
}
