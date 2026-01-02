/**
 * Growth and inflation calculation utilities.
 */
import type { GrowthRule } from "../types";
import { parseISO, diffMonths, getMonthKey } from "./dates";
import { round, compoundGrowth } from "./math";

/**
 * Build an inflation index map from start to end date.
 * The index starts at 1.0 and compounds monthly based on the annual rate.
 * Key is YYYY-MM format for fast lookup.
 *
 * @param startDate - Start date in ISO format
 * @param endDate - End date in ISO format
 * @param annualRate - Annual inflation rate as decimal (e.g., 0.03 for 3%)
 * @returns Map of month keys to inflation multipliers
 */
export function buildInflationIndex(
  startDate: string,
  endDate: string,
  annualRate: number
): Map<string, number> {
  const index = new Map<string, number>();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const months = diffMonths(start, end);

  // Monthly inflation rate
  const monthlyRate = annualRate / 12;

  // Build index for each month
  for (let i = 0; i <= months; i++) {
    const date = new Date(start);
    date.setUTCMonth(date.getUTCMonth() + i);
    const key = getMonthKey(date);

    // Compound growth from start
    const multiplier = compoundGrowth(1, monthlyRate, i);
    index.set(key, round(multiplier, 6));
  }

  return index;
}

/**
 * Apply growth to an amount based on the growth rule.
 *
 * @param amount - Base amount
 * @param growthRule - How to apply growth (NONE, TRACK_INFLATION, CUSTOM_PERCENT)
 * @param growthRate - Custom growth rate if applicable (annual rate as decimal)
 * @param inflationIndex - Pre-computed inflation index
 * @param date - Current date to look up inflation index
 * @returns Adjusted amount
 */
export function applyGrowth(
  amount: number,
  growthRule: GrowthRule,
  growthRate: number | undefined,
  inflationIndex: Map<string, number>,
  date: string
): number {
  if (growthRule === "NONE") {
    return amount;
  }

  // Get month key for lookup
  const parsed = parseISO(date);
  const key = getMonthKey(parsed);

  if (growthRule === "TRACK_INFLATION") {
    const multiplier = inflationIndex.get(key);
    if (multiplier === undefined) {
      // Date outside index range - return base amount
      return amount;
    }
    return round(amount * multiplier, 2);
  }

  if (growthRule === "CUSTOM_PERCENT") {
    if (growthRate === undefined || growthRate === 0) {
      return amount;
    }

    // Calculate months from first month in index
    const firstKey = Array.from(inflationIndex.keys())[0];
    if (!firstKey) {
      return amount;
    }

    const firstDate = parseISO(firstKey + "-01");
    const monthsElapsed = diffMonths(firstDate, parsed);

    if (monthsElapsed <= 0) {
      return amount;
    }

    // Apply custom growth rate (annual rate converted to monthly)
    const monthlyRate = growthRate / 12;
    const multiplier = compoundGrowth(1, monthlyRate, monthsElapsed);
    return round(amount * multiplier, 2);
  }

  return amount;
}

/**
 * Get the inflation adjustment factor for a specific date.
 *
 * @param inflationIndex - Pre-computed inflation index
 * @param date - Date to get factor for
 * @returns Inflation multiplier (1.0 = no inflation from start)
 */
export function getInflationFactor(
  inflationIndex: Map<string, number>,
  date: string
): number {
  const parsed = parseISO(date);
  const key = getMonthKey(parsed);
  return inflationIndex.get(key) ?? 1;
}

/**
 * Convert a nominal (inflated) amount to real (base-year) dollars.
 *
 * @param nominalAmount - Amount in future dollars
 * @param inflationIndex - Pre-computed inflation index
 * @param date - Date of the nominal amount
 * @returns Amount in base-year dollars
 */
export function nominalToReal(
  nominalAmount: number,
  inflationIndex: Map<string, number>,
  date: string
): number {
  const factor = getInflationFactor(inflationIndex, date);
  return round(nominalAmount / factor, 2);
}

/**
 * Convert a real (base-year) amount to nominal (inflated) dollars.
 *
 * @param realAmount - Amount in base-year dollars
 * @param inflationIndex - Pre-computed inflation index
 * @param date - Date to convert to
 * @returns Amount in future dollars
 */
export function realToNominal(
  realAmount: number,
  inflationIndex: Map<string, number>,
  date: string
): number {
  const factor = getInflationFactor(inflationIndex, date);
  return round(realAmount * factor, 2);
}
