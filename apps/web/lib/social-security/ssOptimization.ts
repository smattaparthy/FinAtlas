/**
 * Social Security claiming strategy optimization calculations
 * Based on SSA reduction/delay credit rules and NPV analysis
 */

export interface SSClaimingScenario {
  claimAge: number;
  monthlyBenefit: number;
  lifetimeTotal: number;
  breakEvenVsAge67: number;
  npv: number;
}

export interface SSOptimizationInput {
  birthYear: number;
  fullRetirementAge: number;
  primaryInsuranceAmount: number;
  currentAge: number;
  lifeExpectancy: number;
  discountRate: number;
  spouseInfo?: {
    birthYear: number;
    pia: number;
    currentAge: number;
  };
}

export interface SpousalSSResult {
  optimalHigherEarnerAge: number;
  optimalLowerEarnerAge: number;
  totalLifetimeBenefit: number;
  strategy: string;
}

export interface SSOptimizationResult {
  scenarios: SSClaimingScenario[];
  optimalClaimAge: number;
  maxLifetimeBenefit: number;
  spousalAnalysis?: SpousalSSResult;
}

/**
 * Calculate monthly benefit at a given claiming age
 * Rules:
 * - Early reduction: 6.67%/year for first 3 years before FRA, 5%/year beyond
 * - Delayed credits: 8%/year for each year after FRA up to age 70
 */
function calculateMonthlyBenefit(
  pia: number,
  claimAge: number,
  fullRetirementAge: number
): number {
  if (claimAge === fullRetirementAge) {
    return pia;
  }

  if (claimAge < fullRetirementAge) {
    // Early claiming - benefit is reduced
    const yearsDiff = fullRetirementAge - claimAge;
    let reduction = 0;

    if (yearsDiff <= 3) {
      // First 3 years: 6.67% per year (5/9 of 1% per month)
      reduction = yearsDiff * 0.0667;
    } else {
      // First 3 years: 6.67% * 3 = 20%
      // Remaining years: 5% per year (5/12 of 1% per month)
      reduction = 0.2 + (yearsDiff - 3) * 0.05;
    }

    return pia * (1 - reduction);
  }

  // Delayed claiming - benefit increases
  const yearsDiff = Math.min(claimAge - fullRetirementAge, 70 - fullRetirementAge);
  const increase = yearsDiff * 0.08;
  return pia * (1 + increase);
}

/**
 * Calculate cumulative lifetime benefits from claim age to life expectancy
 */
function calculateLifetimeBenefit(
  monthlyBenefit: number,
  claimAge: number,
  lifeExpectancy: number
): number {
  const yearsReceiving = Math.max(0, lifeExpectancy - claimAge);
  return monthlyBenefit * 12 * yearsReceiving;
}

/**
 * Calculate Net Present Value of benefits stream
 */
function calculateNPV(
  monthlyBenefit: number,
  claimAge: number,
  lifeExpectancy: number,
  discountRate: number
): number {
  let npv = 0;
  const yearsReceiving = Math.max(0, lifeExpectancy - claimAge);

  for (let year = 0; year < yearsReceiving; year++) {
    const annualBenefit = monthlyBenefit * 12;
    const discountedValue = annualBenefit / Math.pow(1 + discountRate, year);
    npv += discountedValue;
  }

  return npv;
}

/**
 * Calculate breakeven age vs claiming at 67
 */
function calculateBreakEven(
  monthlyAtClaimAge: number,
  claimAge: number,
  monthlyAt67: number
): number {
  if (claimAge === 67) return 67;

  if (claimAge < 67) {
    // Early claiming: find when delayed claiming catches up
    const monthsEarly = (67 - claimAge) * 12;
    const cumulativeEarly = monthlyAtClaimAge * monthsEarly;
    const monthlyDiff = monthlyAt67 - monthlyAtClaimAge;

    if (monthlyDiff <= 0) return Infinity;

    const monthsToBreakEven = cumulativeEarly / monthlyDiff;
    return 67 + monthsToBreakEven / 12;
  }

  // Delayed claiming: find when it catches up
  const monthsDelayed = (claimAge - 67) * 12;
  const cumulativeMissed = monthlyAt67 * monthsDelayed;
  const monthlyDiff = monthlyAtClaimAge - monthlyAt67;

  if (monthlyDiff <= 0) return Infinity;

  const monthsToBreakEven = cumulativeMissed / monthlyDiff;
  return claimAge + monthsToBreakEven / 12;
}

/**
 * Main optimization function
 */
export function optimizeSSClaiming(
  input: SSOptimizationInput
): SSOptimizationResult {
  const scenarios: SSClaimingScenario[] = [];
  const monthlyAt67 = calculateMonthlyBenefit(
    input.primaryInsuranceAmount,
    67,
    input.fullRetirementAge
  );

  // Calculate scenarios for each claiming age from 62 to 70
  for (let age = 62; age <= 70; age++) {
    const monthlyBenefit = calculateMonthlyBenefit(
      input.primaryInsuranceAmount,
      age,
      input.fullRetirementAge
    );

    const lifetimeTotal = calculateLifetimeBenefit(
      monthlyBenefit,
      age,
      input.lifeExpectancy
    );

    const npv = calculateNPV(
      monthlyBenefit,
      age,
      input.lifeExpectancy,
      input.discountRate
    );

    const breakEvenVsAge67 = calculateBreakEven(monthlyBenefit, age, monthlyAt67);

    scenarios.push({
      claimAge: age,
      monthlyBenefit,
      lifetimeTotal,
      breakEvenVsAge67,
      npv,
    });
  }

  // Find optimal claim age (maximize lifetime benefit)
  const optimalScenario = scenarios.reduce((max, scenario) =>
    scenario.lifetimeTotal > max.lifetimeTotal ? scenario : max
  );

  const result: SSOptimizationResult = {
    scenarios,
    optimalClaimAge: optimalScenario.claimAge,
    maxLifetimeBenefit: optimalScenario.lifetimeTotal,
  };

  // Add spousal analysis if spouse info provided
  if (input.spouseInfo) {
    result.spousalAnalysis = analyzeSpousalStrategy(input);
  }

  return result;
}

/**
 * Analyze optimal claiming strategy for married couples
 * Simplified heuristic:
 * - Higher earner should delay to maximize survivor benefit
 * - Lower earner can claim early to maximize household lifetime benefits
 */
function analyzeSpousalStrategy(input: SSOptimizationInput): SpousalSSResult {
  if (!input.spouseInfo) {
    throw new Error("Spouse info required for spousal analysis");
  }

  const higherPIA =
    input.primaryInsuranceAmount > input.spouseInfo.pia
      ? input.primaryInsuranceAmount
      : input.spouseInfo.pia;

  const lowerPIA =
    input.primaryInsuranceAmount > input.spouseInfo.pia
      ? input.spouseInfo.pia
      : input.primaryInsuranceAmount;

  // Basic heuristic: higher earner delays to 70, lower earner claims at 62 or 67
  const optimalHigherEarnerAge = 70;
  const optimalLowerEarnerAge = lowerPIA < higherPIA * 0.5 ? 62 : 67;

  // Calculate total lifetime benefit (simplified)
  const higherMonthly = calculateMonthlyBenefit(
    higherPIA,
    optimalHigherEarnerAge,
    input.fullRetirementAge
  );

  const lowerMonthly = calculateMonthlyBenefit(
    lowerPIA,
    optimalLowerEarnerAge,
    input.fullRetirementAge
  );

  // Assume both live to life expectancy for simplification
  const higherLifetime = calculateLifetimeBenefit(
    higherMonthly,
    optimalHigherEarnerAge,
    input.lifeExpectancy
  );

  const lowerLifetime = calculateLifetimeBenefit(
    lowerMonthly,
    optimalLowerEarnerAge,
    input.lifeExpectancy
  );

  const totalLifetimeBenefit = higherLifetime + lowerLifetime;

  return {
    optimalHigherEarnerAge,
    optimalLowerEarnerAge,
    totalLifetimeBenefit,
    strategy:
      "Higher earner delays to maximize survivor benefit, lower earner claims earlier to maximize household income.",
  };
}
