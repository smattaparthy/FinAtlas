export interface CollegeProjectionPoint {
  year: number;
  age: number;
  savings: number;
  costTarget: number;
}

export interface CollegeSavingsResult {
  projectionPoints: CollegeProjectionPoint[];
  totalCostAt4Years: number;
  projectedSavingsAtEnrollment: number;
  shortfall: number; // positive = shortfall, negative = surplus
  requiredMonthlyContribution: number;
  tax529Benefit: number;
}

export interface SensitivityRow {
  returnRate: number;
  projectedSavings: number;
  shortfall: number;
}

/**
 * Project college savings growth and compare against inflated 4-year cost.
 *
 * 1. Simulate monthly: savings = savings * (1 + monthlyRate) + monthlyContrib
 * 2. Compute total 4-year cost = sum of annualCost * (1 + costInflation)^(yearsToEnroll + i) for i 0..3
 * 3. Generate yearly projection points with savings and cumulative cost target lines
 */
export function projectCollegeSavings(
  currentAge: number,
  enrollmentAge: number,
  currentSavings: number,
  monthlyContrib: number,
  returnRate: number, // decimal, e.g. 0.06
  annualCost: number,
  costInflation: number // decimal, e.g. 0.05
): CollegeSavingsResult {
  const yearsToEnroll = Math.max(enrollmentAge - currentAge, 0);
  const monthlyRate = returnRate / 12;
  const totalMonths = yearsToEnroll * 12;

  // --- Project savings month-by-month ---
  let savings = currentSavings;
  for (let m = 1; m <= totalMonths; m++) {
    savings = savings * (1 + monthlyRate) + monthlyContrib;
  }
  const projectedSavingsAtEnrollment = savings;

  // --- Total 4-year cost (inflated to each college year) ---
  let totalCostAt4Years = 0;
  for (let i = 0; i < 4; i++) {
    totalCostAt4Years += annualCost * Math.pow(1 + costInflation, yearsToEnroll + i);
  }

  const shortfall = totalCostAt4Years - projectedSavingsAtEnrollment;

  // --- Required monthly contribution to fully fund ---
  const requiredMonthlyContribution = calculateRequiredMonthly(
    currentSavings,
    yearsToEnroll,
    totalCostAt4Years,
    returnRate
  );

  // --- Tax benefit (default 5% state deduction rate placeholder) ---
  const tax529Benefit = estimate529TaxBenefit(monthlyContrib * 12, 0.05);

  // --- Build yearly projection points ---
  const projectionPoints: CollegeProjectionPoint[] = [];

  // Savings line: yearly snapshots
  for (let y = 0; y <= yearsToEnroll + 4; y++) {
    const months = Math.min(y, yearsToEnroll) * 12;
    let savingsAtYear = currentSavings;
    for (let m = 1; m <= months; m++) {
      savingsAtYear = savingsAtYear * (1 + monthlyRate) + monthlyContrib;
    }
    // After enrollment, savings stay flat (no new contributions, simplified)
    if (y > yearsToEnroll) {
      savingsAtYear = projectedSavingsAtEnrollment;
    }

    // Cost target line: cumulative costs incurred from enrollment onward
    let costTarget = 0;
    if (y >= yearsToEnroll) {
      const collegeYearsElapsed = Math.min(y - yearsToEnroll, 4);
      for (let i = 0; i < collegeYearsElapsed; i++) {
        costTarget += annualCost * Math.pow(1 + costInflation, yearsToEnroll + i);
      }
    }

    projectionPoints.push({
      year: y,
      age: currentAge + y,
      savings: savingsAtYear,
      costTarget,
    });
  }

  return {
    projectionPoints,
    totalCostAt4Years,
    projectedSavingsAtEnrollment,
    shortfall,
    requiredMonthlyContribution,
    tax529Benefit,
  };
}

/**
 * Calculate the monthly contribution required to reach a target amount.
 *
 * Uses future value of annuity formula:
 *   FV_current = currentSavings * (1 + r)^n
 *   remaining  = targetAmount - FV_current
 *   PMT        = remaining * r / ((1 + r)^n - 1)
 *
 * where r = monthly rate, n = total months
 */
export function calculateRequiredMonthly(
  currentSavings: number,
  years: number,
  targetAmount: number,
  annualReturnRate: number
): number {
  if (years <= 0) return Math.max(targetAmount - currentSavings, 0);

  const r = annualReturnRate / 12;
  const n = years * 12;

  const fvCurrent = currentSavings * Math.pow(1 + r, n);
  const remaining = targetAmount - fvCurrent;

  if (remaining <= 0) return 0;

  // Edge case: zero return rate
  if (r === 0) return remaining / n;

  const pmt = (remaining * r) / (Math.pow(1 + r, n) - 1);
  return Math.max(pmt, 0);
}

/**
 * Estimate annual state tax benefit from 529 contributions.
 * Simplified: annualContribution * stateDeductionRate
 */
export function estimate529TaxBenefit(
  annualContribution: number,
  stateDeductionRate: number
): number {
  return annualContribution * stateDeductionRate;
}

/**
 * Generate sensitivity analysis rows at return rates from baseRate-2% to baseRate+2%.
 */
export function calculateSensitivity(
  currentAge: number,
  enrollmentAge: number,
  currentSavings: number,
  monthlyContrib: number,
  baseReturnRate: number, // decimal
  annualCost: number,
  costInflation: number // decimal
): SensitivityRow[] {
  const offsets = [-0.02, -0.01, 0, 0.01, 0.02];

  return offsets.map((offset) => {
    const rate = Math.max(baseReturnRate + offset, 0);
    const result = projectCollegeSavings(
      currentAge,
      enrollmentAge,
      currentSavings,
      monthlyContrib,
      rate,
      annualCost,
      costInflation
    );
    return {
      returnRate: rate,
      projectedSavings: result.projectedSavingsAtEnrollment,
      shortfall: result.shortfall,
    };
  });
}
