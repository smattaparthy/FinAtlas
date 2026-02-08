/**
 * Amortization calculation utilities
 */

export interface AmortizationRow {
  month: number;
  date: string; // YYYY-MM
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationResult {
  schedule: AmortizationRow[];
  totalPayments: number;
  totalInterest: number;
  totalPrincipal: number;
  payoffDate: string;
  monthlyPayment: number;
}

/**
 * Calculate monthly payment using standard mortgage formula
 * @param principal - Loan principal amount
 * @param annualRatePercent - Annual interest rate as percentage (e.g., 6.5 for 6.5%)
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount
 */
export function calculatePMT(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  if (termMonths <= 0) return principal;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return principal * ((monthlyRate * factor) / (factor - 1));
}

/**
 * Generate complete amortization schedule
 * @param principal - Original loan amount
 * @param annualRatePercent - Annual interest rate as percentage (e.g., 6.5 for 6.5%)
 * @param termMonths - Original loan term in months
 * @param monthlyPayment - Actual monthly payment amount
 * @param startDate - Loan start date (YYYY-MM-DD format)
 * @returns Complete amortization schedule with totals
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  monthlyPayment: number,
  startDate: string
): AmortizationResult {
  const schedule: AmortizationRow[] = [];
  const monthlyRate = annualRatePercent / 100 / 12;

  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  const start = new Date(startDate);

  for (let month = 1; month <= termMonths && balance > 0.01; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
    const totalPayment = principalPayment + interestPayment;

    balance -= principalPayment;
    cumulativeInterest += interestPayment;
    cumulativePrincipal += principalPayment;

    const currentDate = new Date(start);
    currentDate.setMonth(start.getMonth() + month - 1);
    const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    schedule.push({
      month,
      date: dateString,
      payment: totalPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
      cumulativeInterest,
      cumulativePrincipal,
    });

    if (balance <= 0.01) break;
  }

  const lastRow = schedule[schedule.length - 1];
  const payoffDate = lastRow ? lastRow.date : startDate;

  return {
    schedule,
    totalPayments: cumulativeInterest + cumulativePrincipal,
    totalInterest: cumulativeInterest,
    totalPrincipal: cumulativePrincipal,
    payoffDate,
    monthlyPayment,
  };
}
