/**
 * Loan amortization calculations.
 */
import type { LoanDTO } from "../types";
import { parseISO, addMonths, formatISO, isBefore, isAfter, getMonthKey, startOfMonth } from "./dates";
import { round, calculatePMT, annualToMonthlyRate } from "./math";

/**
 * Represents a single row in an amortization schedule.
 */
export interface AmortizationRow {
  month: string; // YYYY-MM format
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Calculate the standard monthly payment for a loan.
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate as decimal (e.g., 0.05 for 5%)
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  return calculatePMT(principal, annualRate, termMonths);
}

/**
 * Generate a full amortization schedule for a loan.
 *
 * @param loan - Loan definition
 * @param startDate - Projection start date (may be after loan start)
 * @param endDate - Projection end date
 * @returns Array of amortization rows
 */
export function generateAmortizationSchedule(
  loan: LoanDTO,
  startDate: string,
  endDate: string
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];

  const loanStart = parseISO(loan.startDate);
  const projStart = parseISO(startDate);
  const projEnd = parseISO(endDate);

  const annualRate = loan.aprPct / 100;
  const monthlyRate = annualToMonthlyRate(annualRate);

  // Calculate standard monthly payment
  const standardPayment = loan.paymentOverrideMonthly
    ? loan.paymentOverrideMonthly
    : calculateMonthlyPayment(loan.principal, annualRate, loan.termMonths);

  const extraPayment = loan.extraPaymentMonthly ?? 0;
  const totalPayment = standardPayment + extraPayment;

  // Track balance - start with principal
  let balance = loan.principal;
  let currentDate = startOfMonth(loanStart);

  // Fast-forward to projection start, calculating balance along the way
  while (isBefore(currentDate, projStart) && balance > 0) {
    const interestCharge = round(balance * monthlyRate, 2);
    const principalPayment = round(Math.min(totalPayment - interestCharge, balance), 2);
    balance = round(Math.max(0, balance - principalPayment), 2);
    currentDate = addMonths(currentDate, 1);
  }

  // Generate schedule for projection period
  while (!isAfter(currentDate, projEnd) && balance > 0) {
    const interestCharge = round(balance * monthlyRate, 2);

    // Calculate principal portion
    let principalPayment: number;
    let actualPayment: number;

    if (balance + interestCharge <= totalPayment) {
      // Final payment - pay off remaining balance
      principalPayment = balance;
      actualPayment = round(balance + interestCharge, 2);
    } else {
      principalPayment = round(totalPayment - interestCharge, 2);
      actualPayment = totalPayment;
    }

    // Ensure principal payment doesn't go negative
    principalPayment = Math.max(0, principalPayment);

    // Update balance
    balance = round(Math.max(0, balance - principalPayment), 2);

    schedule.push({
      month: getMonthKey(currentDate),
      payment: actualPayment,
      principal: principalPayment,
      interest: interestCharge,
      balance: balance,
    });

    currentDate = addMonths(currentDate, 1);
  }

  return schedule;
}

/**
 * Get the loan balance at a specific date from an amortization schedule.
 *
 * @param schedule - Pre-computed amortization schedule
 * @param date - Date to get balance for (ISO format)
 * @returns Loan balance at that date
 */
export function getLoanBalanceAtDate(schedule: AmortizationRow[], date: string): number {
  if (schedule.length === 0) {
    return 0;
  }

  const monthKey = getMonthKey(parseISO(date));

  // Find the row for this month
  const row = schedule.find((r) => r.month === monthKey);

  if (row) {
    return row.balance;
  }

  // If date is before first row, need to calculate from loan start
  // If date is after last row, balance is 0 (paid off)
  const firstMonth = schedule[0].month;
  const lastMonth = schedule[schedule.length - 1].month;

  if (monthKey < firstMonth) {
    // Before schedule - would need original loan info to calculate
    // Return balance after first payment as approximation
    return schedule[0].balance;
  }

  if (monthKey > lastMonth) {
    // After schedule - loan is paid off
    return 0;
  }

  // Between rows (shouldn't happen with monthly schedule)
  // Find the closest earlier row
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].month <= monthKey) {
      return schedule[i].balance;
    }
  }

  return 0;
}

/**
 * Calculate total interest paid over the life of a loan.
 *
 * @param schedule - Amortization schedule
 * @returns Total interest paid
 */
export function getTotalInterestPaid(schedule: AmortizationRow[]): number {
  return round(
    schedule.reduce((sum, row) => sum + row.interest, 0),
    2
  );
}

/**
 * Calculate total payments made over the life of a loan.
 *
 * @param schedule - Amortization schedule
 * @returns Total payments made
 */
export function getTotalPaymentsMade(schedule: AmortizationRow[]): number {
  return round(
    schedule.reduce((sum, row) => sum + row.payment, 0),
    2
  );
}

/**
 * Get the payment amount for a specific month.
 *
 * @param schedule - Amortization schedule
 * @param date - Date to get payment for
 * @returns Payment amount for that month, or 0 if not in schedule
 */
export function getMonthlyPaymentAtDate(schedule: AmortizationRow[], date: string): number {
  const monthKey = getMonthKey(parseISO(date));
  const row = schedule.find((r) => r.month === monthKey);
  return row ? row.payment : 0;
}
