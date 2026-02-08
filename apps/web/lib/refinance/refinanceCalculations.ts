/**
 * Pure client-side refinance comparison calculator.
 *
 * Compares current loan terms against proposed refinancing terms,
 * producing amortization schedules, monthly savings, break-even
 * analysis, and total cost comparisons.
 */

export interface CurrentLoanTerms {
  name: string;
  currentBalance: number;
  interestRate: number; // annual % (e.g. 6.5)
  monthlyPayment: number;
  remainingMonths: number;
}

export interface NewLoanTerms {
  interestRate: number; // annual % (e.g. 5.5)
  termMonths: number; // e.g. 360
  closingCosts: number; // dollars
  points: number; // percentage (e.g. 1.0 for 1 point)
}

export interface AmortizationPoint {
  month: number;
  date: string; // YYYY-MM
  balance: number;
}

export interface RefinanceResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  payoffMonths: number;
  schedule: AmortizationPoint[];
}

export interface RefinanceComparison {
  current: RefinanceResult;
  refinanced: RefinanceResult;
  monthlySavings: number;
  totalInterestSaved: number;
  totalCostDifference: number;
  breakEvenMonths: number; // Infinity if no savings
  closingCostTotal: number;
}

/**
 * Standard PMT formula.
 * Returns monthly payment for a fixed-rate loan.
 */
function calculatePMT(
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
 * Generate a month-by-month amortization schedule.
 * Stops when balance falls to <= 0.01 or maxMonths is reached.
 */
function generateSchedule(
  balance: number,
  annualRatePercent: number,
  monthlyPayment: number,
  maxMonths: number
): AmortizationPoint[] {
  const monthlyRate = annualRatePercent / 100 / 12;
  const now = new Date();
  const schedule: AmortizationPoint[] = [];
  let remaining = balance;

  // Record initial balance at month 0
  const startYear = now.getFullYear();
  const startMonth = now.getMonth(); // 0-indexed
  schedule.push({
    month: 0,
    date: `${startYear}-${String(startMonth + 1).padStart(2, "0")}`,
    balance: remaining,
  });

  for (let m = 1; m <= maxMonths; m++) {
    const interest = remaining * monthlyRate;
    const payment = Math.min(monthlyPayment, remaining + interest);
    const principalPaid = payment - interest;
    remaining = Math.max(0, remaining - principalPaid);

    const d = new Date(startYear, startMonth + m);
    schedule.push({
      month: m,
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      balance: remaining,
    });

    if (remaining <= 0.01) break;
  }

  return schedule;
}

/**
 * Build a RefinanceResult from a schedule.
 */
function buildResult(
  schedule: AmortizationPoint[],
  monthlyPayment: number,
  initialBalance: number
): RefinanceResult {
  const payoffMonths = schedule.length - 1; // exclude month-0 entry
  const totalCost = monthlyPayment * payoffMonths;
  const totalInterest = totalCost - initialBalance;

  return {
    monthlyPayment,
    totalInterest: Math.max(0, totalInterest),
    totalCost,
    payoffMonths,
    schedule,
  };
}

/**
 * Compare current loan terms against proposed refinancing terms.
 */
export function calculateRefinance(
  current: CurrentLoanTerms,
  newTerms: NewLoanTerms
): RefinanceComparison {
  const { currentBalance, interestRate, monthlyPayment, remainingMonths } =
    current;
  const {
    interestRate: newRate,
    termMonths: newTerm,
    closingCosts,
    points,
  } = newTerms;

  // Current loan schedule
  const currentSchedule = generateSchedule(
    currentBalance,
    interestRate,
    monthlyPayment,
    remainingMonths
  );
  const currentResult = buildResult(
    currentSchedule,
    monthlyPayment,
    currentBalance
  );

  // Refinanced loan
  const newPayment = calculatePMT(currentBalance, newRate, newTerm);
  const refinancedSchedule = generateSchedule(
    currentBalance,
    newRate,
    newPayment,
    newTerm
  );
  const refinancedResult = buildResult(
    refinancedSchedule,
    newPayment,
    currentBalance
  );

  // Closing cost total
  const closingCostTotal = closingCosts + (points / 100) * currentBalance;

  // Savings
  const monthlySavings = currentResult.monthlyPayment - refinancedResult.monthlyPayment;
  const totalInterestSaved = currentResult.totalInterest - refinancedResult.totalInterest;
  const totalCostDifference =
    currentResult.totalCost - (refinancedResult.totalCost + closingCostTotal);

  // Break-even: months until cumulative monthly savings exceed closing costs
  const breakEvenMonths =
    monthlySavings > 0
      ? Math.ceil(closingCostTotal / monthlySavings)
      : Infinity;

  return {
    current: currentResult,
    refinanced: refinancedResult,
    monthlySavings,
    totalInterestSaved,
    totalCostDifference,
    breakEvenMonths,
    closingCostTotal,
  };
}
