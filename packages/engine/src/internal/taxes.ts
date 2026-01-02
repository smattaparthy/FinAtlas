/**
 * Tax Engine - Federal and state tax calculations.
 * Implements 2024 federal tax brackets with FICA and state taxes.
 */
import type { TaxProfileDTO, FilingStatus } from "../types";
import { round } from "./math";

/**
 * Tax bracket definition.
 */
interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

/**
 * 2024 Federal tax brackets by filing status.
 */
const FEDERAL_BRACKETS_2024: Record<FilingStatus, TaxBracket[]> = {
  SINGLE: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  MFJ: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  HOH: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

/**
 * 2024 Standard deductions by filing status.
 */
const STANDARD_DEDUCTIONS_2024: Record<FilingStatus, number> = {
  SINGLE: 14600,
  MFJ: 29200,
  HOH: 21900,
};

/**
 * FICA rates (Social Security + Medicare).
 */
const FICA = {
  socialSecurityRate: 0.062,
  socialSecurityWageCap2024: 168600,
  medicareRate: 0.0145,
  medicareAdditionalRate: 0.009,
  medicareAdditionalThreshold: {
    SINGLE: 200000,
    MFJ: 250000,
    HOH: 200000,
  } as Record<FilingStatus, number>,
};

/**
 * State income tax rates (simplified flat or effective rates).
 * For states with progressive taxes, this is an approximation.
 */
const STATE_TAX_RATES: Record<string, number> = {
  // No income tax states
  AK: 0,
  FL: 0,
  NV: 0,
  SD: 0,
  TN: 0, // No wage income tax
  TX: 0,
  WA: 0,
  WY: 0,
  NH: 0, // No wage income tax

  // Flat tax states
  AZ: 0.025,
  CO: 0.044,
  ID: 0.058,
  IL: 0.0495,
  IN: 0.0305,
  KY: 0.04,
  MA: 0.05,
  MI: 0.0405,
  NC: 0.0525,
  ND: 0.0195,
  PA: 0.0307,
  UT: 0.0465,

  // Progressive tax states (effective rate approximation)
  AL: 0.05,
  AR: 0.047,
  CA: 0.093, // Top bracket, adjust based on income
  CT: 0.0699,
  DE: 0.066,
  GA: 0.055,
  HI: 0.0825,
  IA: 0.06,
  KS: 0.057,
  LA: 0.0425,
  ME: 0.0715,
  MD: 0.0575,
  MN: 0.0985,
  MO: 0.048,
  MS: 0.05,
  MT: 0.059,
  NE: 0.0664,
  NJ: 0.0637,
  NM: 0.059,
  NY: 0.0685,
  OH: 0.0399,
  OK: 0.0475,
  OR: 0.099,
  RI: 0.0599,
  SC: 0.064,
  VT: 0.0875,
  VA: 0.0575,
  WV: 0.055,
  WI: 0.0765,
  DC: 0.105,
};

/**
 * Calculate federal income tax using progressive brackets.
 */
export function calculateFederalIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus
): number {
  if (taxableIncome <= 0) return 0;

  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;

    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    tax += taxableInBracket * bracket.rate;
  }

  return round(tax, 2);
}

/**
 * Calculate FICA taxes (Social Security + Medicare).
 */
export function calculateFICA(
  wages: number,
  filingStatus: FilingStatus
): { socialSecurity: number; medicare: number; total: number } {
  // Social Security (capped)
  const socialSecurityWages = Math.min(wages, FICA.socialSecurityWageCap2024);
  const socialSecurity = round(socialSecurityWages * FICA.socialSecurityRate, 2);

  // Medicare (no cap, but additional tax above threshold)
  let medicare = wages * FICA.medicareRate;
  const additionalThreshold = FICA.medicareAdditionalThreshold[filingStatus];
  if (wages > additionalThreshold) {
    medicare += (wages - additionalThreshold) * FICA.medicareAdditionalRate;
  }
  medicare = round(medicare, 2);

  return {
    socialSecurity,
    medicare,
    total: round(socialSecurity + medicare, 2),
  };
}

/**
 * Calculate state income tax.
 */
export function calculateStateTax(
  taxableIncome: number,
  stateCode: string
): number {
  const rate = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05;
  return round(taxableIncome * rate, 2);
}

/**
 * Get standard deduction for filing status.
 */
export function getStandardDeduction(filingStatus: FilingStatus): number {
  return STANDARD_DEDUCTIONS_2024[filingStatus];
}

/**
 * Calculate total annual taxes for a given gross income.
 */
export function calculateAnnualTaxes(
  grossIncome: number,
  profile: TaxProfileDTO
): {
  federal: number;
  state: number;
  fica: number;
  total: number;
  effectiveRate: number;
} {
  // Calculate taxable income (gross - standard deduction)
  const standardDeduction = getStandardDeduction(profile.filingStatus);
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);

  // Federal income tax
  const federal = calculateFederalIncomeTax(taxableIncome, profile.filingStatus);

  // State income tax
  const state = calculateStateTax(taxableIncome, profile.stateCode);

  // FICA (on gross wages, not reduced by deductions)
  const ficaResult = profile.includePayrollTaxes
    ? calculateFICA(grossIncome, profile.filingStatus)
    : { total: 0 };

  const total = round(federal + state + ficaResult.total, 2);
  const effectiveRate = grossIncome > 0 ? round(total / grossIncome, 4) : 0;

  return {
    federal,
    state,
    fica: ficaResult.total,
    total,
    effectiveRate,
  };
}

/**
 * Calculate monthly tax withholding (estimated).
 * Assumes even distribution across the year.
 */
export function calculateMonthlyTaxes(
  monthlyGrossIncome: number,
  profile: TaxProfileDTO
): number {
  // Annualize the income for bracket calculation
  const annualizedIncome = monthlyGrossIncome * 12;

  // Calculate annual taxes
  const annual = calculateAnnualTaxes(annualizedIncome, profile);

  // Return monthly portion
  return round(annual.total / 12, 2);
}

/**
 * Calculate marginal tax rate at a given income level.
 * Useful for optimizing contributions and deductions.
 */
export function getMarginalRate(
  taxableIncome: number,
  filingStatus: FilingStatus,
  stateCode: string
): number {
  const brackets = FEDERAL_BRACKETS_2024[filingStatus];
  let federalMarginal = 0;

  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      federalMarginal = bracket.rate;
    }
  }

  const stateMarginal = STATE_TAX_RATES[stateCode.toUpperCase()] ?? 0.05;

  return round(federalMarginal + stateMarginal, 4);
}

/**
 * Calculate tax-advantaged account contribution limits (2024).
 */
export const CONTRIBUTION_LIMITS_2024 = {
  traditional401k: 23000,
  traditional401kCatchUp: 7500, // Age 50+
  traditionalIRA: 7000,
  traditionalIRACatchUp: 1000, // Age 50+
  rothIRA: 7000,
  rothIRACatchUp: 1000, // Age 50+
  hsa: {
    individual: 4150,
    family: 8300,
    catchUp: 1000, // Age 55+
  },
  _529: Infinity, // State-dependent, no federal limit
};

/**
 * Estimate tax savings from pre-tax contribution.
 */
export function estimateTaxSavings(
  contributionAmount: number,
  currentIncome: number,
  profile: TaxProfileDTO
): number {
  // Calculate taxes with and without the contribution
  const taxesWithout = calculateAnnualTaxes(currentIncome, profile);
  const taxesWith = calculateAnnualTaxes(
    currentIncome - contributionAmount,
    profile
  );

  return round(taxesWithout.total - taxesWith.total, 2);
}
