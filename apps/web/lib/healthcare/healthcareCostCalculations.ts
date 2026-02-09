/**
 * Healthcare Cost Modeling Calculations
 *
 * Models lifetime healthcare costs across three phases:
 * 1. Pre-retirement (working, employer-subsidized)
 * 2. Early retirement (retirement to Medicare eligibility)
 * 3. Medicare (65+)
 */

export interface HealthcareInput {
  currentAge: number;
  retirementAge: number;
  medicareAge: number;
  lifeExpectancy: number;
  currentAnnualPremium: number;
  annualDeductible: number;
  annualOutOfPocket: number;
  hsaBalance: number;
  hsaAnnualContribution: number;
  healthcareInflation: number;
  generalInflation: number;
  investmentReturn: number;
}

export type HealthcarePhase = 'PRE_RETIREMENT' | 'EARLY_RETIREMENT' | 'MEDICARE';

export interface HealthcareProjection {
  year: number;
  age: number;
  phase: HealthcarePhase;
  premium: number;
  outOfPocket: number;
  totalCost: number;
  hsaBalance: number;
  hsaContribution: number;
  netCostAfterHSA: number;
  cumulativeCost: number;
}

export interface HealthcareResult {
  projections: HealthcareProjection[];
  totalLifetimeCost: number;
  preRetirementCost: number;
  earlyRetirementCost: number;
  medicareCost: number;
  hsaProjectedBalance: number;
  hsaCoverageYears: number;
  monthlyBudgetNeeded: number;
}

// Medicare Part B base premium (2024)
const MEDICARE_PART_B_BASE = 174.70;
// Medicare Part D average premium
const MEDICARE_PART_D_AVG = 55;
// Medigap/supplement average premium
const MEDIGAP_AVG = 200;

/**
 * Calculate healthcare costs across all life phases
 */
export function calculateHealthcareCosts(input: HealthcareInput): HealthcareResult {
  const projections: HealthcareProjection[] = [];
  let hsaBalance = input.hsaBalance;
  let cumulativeCost = 0;
  let hsaCoverageYears = 0;

  const totalYears = input.lifeExpectancy - input.currentAge;

  for (let i = 0; i <= totalYears; i++) {
    const age = input.currentAge + i;
    const year = i;

    // Determine phase
    let phase: HealthcarePhase;
    if (age < input.retirementAge) {
      phase = 'PRE_RETIREMENT';
    } else if (age < input.medicareAge) {
      phase = 'EARLY_RETIREMENT';
    } else {
      phase = 'MEDICARE';
    }

    // Calculate costs based on phase
    let premium = 0;
    let outOfPocket = 0;

    if (phase === 'PRE_RETIREMENT') {
      // Employer-subsidized premiums
      premium = input.currentAnnualPremium * Math.pow(1 + input.healthcareInflation, year);
      outOfPocket = input.annualOutOfPocket * Math.pow(1 + input.healthcareInflation, year);
    } else if (phase === 'EARLY_RETIREMENT') {
      // ACA marketplace - significantly higher costs
      // Average for 60-64 age bracket is ~$600/month
      const baseMonthlyPremium = 600 * (1 + (age - input.retirementAge) * 0.05); // 5% increase per year
      premium = baseMonthlyPremium * 12 * Math.pow(1 + input.healthcareInflation, year);
      // Higher out-of-pocket due to higher deductibles
      outOfPocket = input.annualOutOfPocket * 1.5 * Math.pow(1 + input.healthcareInflation, year);
    } else {
      // Medicare
      // Part B + Part D + Medigap
      const medicareBaseCost = (MEDICARE_PART_B_BASE + MEDICARE_PART_D_AVG + MEDIGAP_AVG) * 12;
      premium = medicareBaseCost * Math.pow(1 + input.generalInflation, year);
      // Lower out-of-pocket with Medicare
      outOfPocket = input.annualOutOfPocket * 0.7 * Math.pow(1 + input.healthcareInflation, year);
    }

    const totalCost = premium + outOfPocket;

    // HSA contributions (only if under 65 and working/early retirement)
    let hsaContribution = 0;
    if (age < input.medicareAge && age < input.retirementAge) {
      hsaContribution = input.hsaAnnualContribution * Math.pow(1 + input.generalInflation, year);
      hsaBalance += hsaContribution;
    }

    // HSA investment growth
    hsaBalance *= (1 + input.investmentReturn);

    // Calculate net cost after HSA
    let netCostAfterHSA = totalCost;
    if (hsaBalance >= totalCost) {
      hsaBalance -= totalCost;
      netCostAfterHSA = 0;
      hsaCoverageYears++;
    } else if (hsaBalance > 0) {
      netCostAfterHSA = totalCost - hsaBalance;
      hsaBalance = 0;
    }

    cumulativeCost += netCostAfterHSA;

    projections.push({
      year,
      age,
      phase,
      premium,
      outOfPocket,
      totalCost,
      hsaBalance,
      hsaContribution,
      netCostAfterHSA,
      cumulativeCost,
    });
  }

  // Calculate phase costs
  const preRetirementCost = projections
    .filter(p => p.phase === 'PRE_RETIREMENT')
    .reduce((sum, p) => sum + p.netCostAfterHSA, 0);

  const earlyRetirementCost = projections
    .filter(p => p.phase === 'EARLY_RETIREMENT')
    .reduce((sum, p) => sum + p.netCostAfterHSA, 0);

  const medicareCost = projections
    .filter(p => p.phase === 'MEDICARE')
    .reduce((sum, p) => sum + p.netCostAfterHSA, 0);

  const totalLifetimeCost = cumulativeCost;

  // Average monthly budget needed in retirement (early retirement + medicare)
  const retirementYears = input.lifeExpectancy - input.retirementAge;
  const retirementTotalCost = earlyRetirementCost + medicareCost;
  const monthlyBudgetNeeded = retirementYears > 0 ? retirementTotalCost / retirementYears / 12 : 0;

  return {
    projections,
    totalLifetimeCost,
    preRetirementCost,
    earlyRetirementCost,
    medicareCost,
    hsaProjectedBalance: hsaBalance,
    hsaCoverageYears,
    monthlyBudgetNeeded,
  };
}

/**
 * Calculate sensitivity analysis for healthcare costs
 */
export function calculateSensitivity(
  input: HealthcareInput,
  variableKey: 'healthcareInflation' | 'investmentReturn',
  values: number[]
): Array<{ value: number; totalCost: number; hsaCoverageYears: number }> {
  return values.map(value => {
    const modifiedInput = { ...input, [variableKey]: value };
    const result = calculateHealthcareCosts(modifiedInput);
    return {
      value,
      totalCost: result.totalLifetimeCost,
      hsaCoverageYears: result.hsaCoverageYears,
    };
  });
}
