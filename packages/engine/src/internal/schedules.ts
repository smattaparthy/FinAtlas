/**
 * Frequency normalization and schedule generation utilities.
 */
import type { Frequency } from "../types";
import {
  parseISO,
  formatISO,
  addMonths,
  isBefore,
  isAfter,
  getMonthKey,
  startOfMonth,
} from "./dates";
import { round } from "./math";

/**
 * Number of occurrences per year for each frequency.
 */
const FREQUENCY_ANNUAL_MULTIPLIER: Record<Frequency, number> = {
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ANNUAL: 1,
  ONE_TIME: 0, // Special case
};

/**
 * Normalize an amount to monthly equivalent.
 *
 * @param amount - Amount in original frequency
 * @param frequency - Original frequency
 * @returns Monthly equivalent amount
 */
export function normalizeToMonthly(amount: number, frequency: Frequency): number {
  if (frequency === "ONE_TIME") {
    // One-time amounts are not normalized - they apply once
    return amount;
  }

  const annualMultiplier = FREQUENCY_ANNUAL_MULTIPLIER[frequency];
  const annualAmount = amount * annualMultiplier;
  const monthlyAmount = annualAmount / 12;

  return round(monthlyAmount, 2);
}

/**
 * Normalize an amount from monthly to target frequency.
 *
 * @param monthlyAmount - Amount per month
 * @param targetFrequency - Target frequency
 * @returns Amount in target frequency
 */
export function monthlyToFrequency(monthlyAmount: number, targetFrequency: Frequency): number {
  if (targetFrequency === "ONE_TIME") {
    return monthlyAmount;
  }

  const annualAmount = monthlyAmount * 12;
  const annualMultiplier = FREQUENCY_ANNUAL_MULTIPLIER[targetFrequency];
  const frequencyAmount = annualAmount / annualMultiplier;

  return round(frequencyAmount, 2);
}

/**
 * Generate a schedule of month keys when an event occurs.
 *
 * @param startDate - Start date in ISO format
 * @param endDate - Optional end date in ISO format
 * @param projectionEnd - End of projection period in ISO format
 * @param frequency - Frequency of the event
 * @returns Array of month keys (YYYY-MM) when the event occurs
 */
export function generateSchedule(
  startDate: string,
  endDate: string | undefined,
  projectionEnd: string,
  frequency: Frequency
): string[] {
  const schedule: string[] = [];
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : parseISO(projectionEnd);
  const projEnd = parseISO(projectionEnd);

  // Use the earlier of end date and projection end
  const effectiveEnd = isBefore(end, projEnd) ? end : projEnd;

  if (frequency === "ONE_TIME") {
    // One-time events only occur in their start month if within range
    if (!isAfter(start, effectiveEnd)) {
      schedule.push(getMonthKey(start));
    }
    return schedule;
  }

  // For recurring frequencies, generate monthly entries
  // (The actual amount normalization happens separately)
  let current = startOfMonth(start);

  while (!isAfter(current, effectiveEnd)) {
    schedule.push(getMonthKey(current));
    current = addMonths(current, 1);
  }

  return schedule;
}

/**
 * Check if a date falls within a schedule period.
 *
 * @param date - Date to check (ISO format)
 * @param startDate - Start of period (ISO format)
 * @param endDate - Optional end of period (ISO format)
 * @returns True if date is within the period
 */
export function isDateInPeriod(
  date: string,
  startDate: string,
  endDate?: string
): boolean {
  const d = parseISO(date);
  const start = parseISO(startDate);

  if (isBefore(d, startOfMonth(start))) {
    return false;
  }

  if (endDate) {
    const end = parseISO(endDate);
    if (isAfter(d, end)) {
      return false;
    }
  }

  return true;
}

/**
 * Get the month key for a date string.
 */
export function getMonthKeyFromDate(date: string): string {
  return getMonthKey(parseISO(date));
}

/**
 * Generate all month keys between two dates (inclusive).
 *
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @returns Array of month keys (YYYY-MM)
 */
export function generateMonthRange(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  let current = startOfMonth(parseISO(startDate));
  const end = startOfMonth(parseISO(endDate));

  while (!isAfter(current, end)) {
    months.push(getMonthKey(current));
    current = addMonths(current, 1);
  }

  return months;
}
