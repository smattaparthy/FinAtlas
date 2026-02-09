/**
 * IRMAA (Income-Related Monthly Adjustment Amount) Calculator
 *
 * Medicare beneficiaries with higher incomes pay additional surcharges for Part B and Part D.
 * Brackets are based on Modified Adjusted Gross Income (MAGI) from 2 years prior.
 */

export type FilingStatus = 'SINGLE' | 'MFJ';

export interface IRMAABracket {
  incomeMin: number;
  incomeMax: number | null;
  partBSurcharge: number;
  partDSurcharge: number;
}

// 2024 IRMAA brackets for single filers
export const IRMAA_BRACKETS_SINGLE: IRMAABracket[] = [
  { incomeMin: 0, incomeMax: 103000, partBSurcharge: 0, partDSurcharge: 0 },
  { incomeMin: 103000, incomeMax: 129000, partBSurcharge: 69.90, partDSurcharge: 12.90 },
  { incomeMin: 129000, incomeMax: 161000, partBSurcharge: 174.70, partDSurcharge: 33.30 },
  { incomeMin: 161000, incomeMax: 193000, partBSurcharge: 279.50, partDSurcharge: 53.80 },
  { incomeMin: 193000, incomeMax: 500000, partBSurcharge: 384.30, partDSurcharge: 74.20 },
  { incomeMin: 500000, incomeMax: null, partBSurcharge: 419.30, partDSurcharge: 81.00 },
];

// 2024 IRMAA brackets for married filing jointly
export const IRMAA_BRACKETS_MFJ: IRMAABracket[] = [
  { incomeMin: 0, incomeMax: 206000, partBSurcharge: 0, partDSurcharge: 0 },
  { incomeMin: 206000, incomeMax: 258000, partBSurcharge: 69.90, partDSurcharge: 12.90 },
  { incomeMin: 258000, incomeMax: 322000, partBSurcharge: 174.70, partDSurcharge: 33.30 },
  { incomeMin: 322000, incomeMax: 386000, partBSurcharge: 279.50, partDSurcharge: 53.80 },
  { incomeMin: 386000, incomeMax: 750000, partBSurcharge: 384.30, partDSurcharge: 74.20 },
  { incomeMin: 750000, incomeMax: null, partBSurcharge: 419.30, partDSurcharge: 81.00 },
];

const PART_B_BASE_PREMIUM = 174.70; // 2024 base monthly premium

export interface IRMAAResult {
  partBSurcharge: number;
  partDSurcharge: number;
  totalMonthlySurcharge: number;
  totalAnnualSurcharge: number;
  totalPartBMonthly: number;
  bracketDescription: string;
}

/**
 * Calculate IRMAA surcharges based on income and filing status
 */
export function calculateIRMAA(income: number, filingStatus: FilingStatus): IRMAAResult {
  const brackets = filingStatus === 'SINGLE' ? IRMAA_BRACKETS_SINGLE : IRMAA_BRACKETS_MFJ;

  // Find the appropriate bracket
  const bracket = brackets.find(b => {
    return income >= b.incomeMin && (b.incomeMax === null || income < b.incomeMax);
  });

  if (!bracket) {
    // Shouldn't happen, but default to base
    return {
      partBSurcharge: 0,
      partDSurcharge: 0,
      totalMonthlySurcharge: 0,
      totalAnnualSurcharge: 0,
      totalPartBMonthly: PART_B_BASE_PREMIUM,
      bracketDescription: 'Standard premium',
    };
  }

  const totalMonthlySurcharge = bracket.partBSurcharge + bracket.partDSurcharge;
  const totalAnnualSurcharge = totalMonthlySurcharge * 12;
  const totalPartBMonthly = PART_B_BASE_PREMIUM + bracket.partBSurcharge;

  // Create bracket description
  let bracketDescription = 'Standard premium';
  if (bracket.incomeMax === null) {
    bracketDescription = `Income over ${formatIncome(bracket.incomeMin)}`;
  } else if (bracket.incomeMin > 0) {
    bracketDescription = `Income ${formatIncome(bracket.incomeMin)} - ${formatIncome(bracket.incomeMax)}`;
  }

  return {
    partBSurcharge: bracket.partBSurcharge,
    partDSurcharge: bracket.partDSurcharge,
    totalMonthlySurcharge,
    totalAnnualSurcharge,
    totalPartBMonthly,
    bracketDescription,
  };
}

function formatIncome(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}
