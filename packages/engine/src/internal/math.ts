/**
 * Mathematical utilities for financial calculations.
 * All functions are deterministic with no randomness.
 */

/**
 * Round a number to a specified number of decimal places.
 * Defaults to 2 decimal places (cents for USD).
 */
export function round(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Sum an array of numbers.
 * Returns 0 for empty arrays.
 */
export function sum(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate compound growth.
 * Formula: principal * (1 + rate)^periods
 *
 * @param principal - Starting amount
 * @param rate - Growth rate per period (e.g., 0.05 for 5%)
 * @param periods - Number of periods
 */
export function compoundGrowth(principal: number, rate: number, periods: number): number {
  if (periods === 0 || rate === 0) {
    return principal;
  }
  return principal * Math.pow(1 + rate, periods);
}

/**
 * Calculate the present value of a future amount.
 * Formula: futureValue / (1 + rate)^periods
 *
 * @param futureValue - Amount to receive in the future
 * @param rate - Discount rate per period (e.g., 0.05 for 5%)
 * @param periods - Number of periods
 */
export function presentValue(futureValue: number, rate: number, periods: number): number {
  if (periods === 0 || rate === 0) {
    return futureValue;
  }
  return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculate the future value of a present amount.
 * Alias for compoundGrowth with clearer naming for financial context.
 * Formula: presentValue * (1 + rate)^periods
 *
 * @param pv - Present value (starting amount)
 * @param rate - Growth rate per period (e.g., 0.05 for 5%)
 * @param periods - Number of periods
 */
export function futureValue(pv: number, rate: number, periods: number): number {
  return compoundGrowth(pv, rate, periods);
}

/**
 * Calculate monthly payment for a loan using the standard amortization formula.
 * Formula: P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate as decimal (e.g., 0.05 for 5%)
 * @param termMonths - Loan term in months
 */
export function calculatePMT(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0) {
    return 0;
  }

  if (annualRate === 0) {
    // No interest - simple division
    return principal / termMonths;
  }

  const monthlyRate = annualRate / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const payment = principal * (monthlyRate * factor) / (factor - 1);

  return round(payment, 2);
}

/**
 * Convert annual rate to monthly rate.
 */
export function annualToMonthlyRate(annualRate: number): number {
  return annualRate / 12;
}

/**
 * Convert monthly rate to annual rate.
 */
export function monthlyToAnnualRate(monthlyRate: number): number {
  return monthlyRate * 12;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage change between two values.
 * Returns 0 if original is 0 to avoid division by zero.
 */
export function percentChange(original: number, current: number): number {
  if (original === 0) {
    return 0;
  }
  return ((current - original) / original) * 100;
}
