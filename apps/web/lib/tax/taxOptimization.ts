/**
 * Tax Optimization Analysis Library
 * Provides optimization strategies for Roth conversions, tax-loss harvesting,
 * capital gains planning, and multi-year tax projections.
 */

// ============== ROTH CONVERSION OPTIMIZER ==============

export interface RothConversionInput {
  traditionalIRABalance: number;
  currentAge: number;
  retirementAge: number;
  currentTaxBracket: number; // Current marginal rate
  expectedRetirementBracket: number; // Expected marginal rate in retirement
  yearsToConvert: number; // Spread conversion over N years
  annualConversionLimit?: number; // Optional max per year
}

export interface RothConversionResult {
  yearByYear: {
    year: number;
    conversionAmount: number;
    taxCost: number;
    traditionalBalance: number;
    rothBalance: number;
  }[];
  totalTaxPaid: number;
  taxSavedInRetirement: number;
  netBenefit: number; // Tax saved - tax paid
  breakEvenAge: number;
  recommendation: string;
}

export function analyzeRothConversion(
  input: RothConversionInput
): RothConversionResult {
  const {
    traditionalIRABalance,
    currentAge,
    retirementAge,
    currentTaxBracket,
    expectedRetirementBracket,
    yearsToConvert,
    annualConversionLimit,
  } = input;

  // Assume 7% annual growth
  const GROWTH_RATE = 0.07;

  const yearByYear: RothConversionResult["yearByYear"] = [];

  let traditionalBalance = traditionalIRABalance;
  let rothBalance = 0;
  let totalTaxPaid = 0;

  // Calculate optimal annual conversion amount
  const optimalConversion = traditionalIRABalance / yearsToConvert;
  const annualConversion = annualConversionLimit
    ? Math.min(optimalConversion, annualConversionLimit)
    : optimalConversion;

  // Simulate conversions year by year
  for (let i = 0; i < yearsToConvert; i++) {
    const year = currentAge + i;

    // Amount to convert this year
    const conversionAmount = Math.min(annualConversion, traditionalBalance);
    const taxCost = conversionAmount * currentTaxBracket;

    // Convert amount (pay tax and move to Roth)
    traditionalBalance -= conversionAmount;
    rothBalance += conversionAmount;

    totalTaxPaid += taxCost;

    // Both accounts grow
    traditionalBalance *= 1 + GROWTH_RATE;
    rothBalance *= 1 + GROWTH_RATE;

    yearByYear.push({
      year,
      conversionAmount,
      taxCost,
      traditionalBalance,
      rothBalance,
    });

    if (traditionalBalance < 1) {
      traditionalBalance = 0;
      break;
    }
  }

  // Continue growing balances until retirement if not done converting
  const finalConversionYear = currentAge + yearsToConvert - 1;
  if (finalConversionYear < retirementAge) {
    for (let year = finalConversionYear + 1; year <= retirementAge; year++) {
      traditionalBalance *= 1 + GROWTH_RATE;
      rothBalance *= 1 + GROWTH_RATE;

      yearByYear.push({
        year,
        conversionAmount: 0,
        taxCost: 0,
        traditionalBalance,
        rothBalance,
      });
    }
  }

  // Estimate tax savings in retirement
  // Assume 30 years of withdrawals, 4% annual withdrawal
  const RETIREMENT_YEARS = 30;
  const WITHDRAWAL_RATE = 0.04;

  // Tax saved by having Roth instead of Traditional
  const totalRetirementBalance = rothBalance + traditionalBalance;
  const annualWithdrawal = totalRetirementBalance * WITHDRAWAL_RATE;
  const taxSavedInRetirement =
    (rothBalance / totalRetirementBalance) *
    annualWithdrawal *
    expectedRetirementBracket *
    RETIREMENT_YEARS;

  const netBenefit = taxSavedInRetirement - totalTaxPaid;

  // Break-even age: when cumulative tax savings = conversion cost
  const annualSavings = (rothBalance * WITHDRAWAL_RATE) * expectedRetirementBracket;
  const yearsToBreakEven = annualSavings > 0 ? totalTaxPaid / annualSavings : 99;
  const breakEvenAge = Math.round(retirementAge + yearsToBreakEven);

  // Generate recommendation
  let recommendation: string;
  if (currentTaxBracket >= expectedRetirementBracket) {
    recommendation =
      "Not recommended: Current tax rate is equal to or higher than expected retirement rate. Keep Traditional IRA.";
  } else if (netBenefit > 0) {
    recommendation = `Recommended: Converting over ${yearsToConvert} years saves $${Math.round(netBenefit).toLocaleString()} in lifetime taxes. Break-even at age ${breakEvenAge}.`;
  } else {
    recommendation =
      "Not recommended: Conversion costs exceed retirement tax savings.";
  }

  return {
    yearByYear,
    totalTaxPaid,
    taxSavedInRetirement,
    netBenefit,
    breakEvenAge,
    recommendation,
  };
}

// ============== TAX-LOSS HARVESTING ==============

export interface TaxLossHarvestInput {
  holdings: {
    symbol: string;
    shares: number;
    costBasis: number;
    currentValue: number;
    holdingPeriod: "SHORT" | "LONG";
  }[];
  realizedGains: number; // Already realized gains this year
  taxBracket: number;
}

export interface TaxLossHarvestResult {
  harvestCandidates: {
    symbol: string;
    unrealizedLoss: number;
    taxSavings: number;
    holdingPeriod: "SHORT" | "LONG";
  }[];
  totalHarvestableLosses: number;
  estimatedTaxSavings: number;
  remainingCarryforward: number; // If losses exceed $3k deduction limit
  washSaleWarning: string;
}

export function analyzeTaxLossHarvesting(
  input: TaxLossHarvestInput
): TaxLossHarvestResult {
  const { holdings, realizedGains, taxBracket } = input;

  const ANNUAL_LOSS_DEDUCTION_LIMIT = 3000;

  // Find candidates with unrealized losses
  const harvestCandidates = holdings
    .map((holding) => {
      const unrealizedLoss = holding.costBasis - holding.currentValue;
      if (unrealizedLoss <= 0) return null; // Skip gains or break-even

      // Short-term losses offset short-term gains at ordinary rate
      // Long-term losses offset long-term gains at LTCG rate
      // Assume worst case: use ordinary rate for simplicity
      const taxSavings = unrealizedLoss * taxBracket;

      return {
        symbol: holding.symbol,
        unrealizedLoss,
        taxSavings,
        holdingPeriod: holding.holdingPeriod,
      };
    })
    .filter((candidate) => candidate !== null)
    .sort((a, b) => b!.taxSavings - a!.taxSavings) as TaxLossHarvestResult["harvestCandidates"];

  const totalHarvestableLosses = harvestCandidates.reduce(
    (sum, c) => sum + c.unrealizedLoss,
    0
  );

  // Calculate tax savings
  // First offset realized gains, then deduct up to $3k against ordinary income
  const lossesUsedForGains = Math.min(totalHarvestableLosses, realizedGains);
  const remainingLosses = totalHarvestableLosses - lossesUsedForGains;
  const lossesUsedForDeduction = Math.min(
    remainingLosses,
    ANNUAL_LOSS_DEDUCTION_LIMIT
  );
  const carryforward = Math.max(
    0,
    remainingLosses - ANNUAL_LOSS_DEDUCTION_LIMIT
  );

  const estimatedTaxSavings =
    (lossesUsedForGains + lossesUsedForDeduction) * taxBracket;

  const washSaleWarning =
    "Warning: Do not repurchase the same or substantially identical security within 30 days to avoid wash sale rules.";

  return {
    harvestCandidates,
    totalHarvestableLosses,
    estimatedTaxSavings,
    remainingCarryforward: carryforward,
    washSaleWarning,
  };
}

// ============== CAPITAL GAINS PLANNING ==============

export interface CapitalGainsInput {
  shortTermGains: number;
  longTermGains: number;
  ordinaryIncome: number;
  filingStatus: "SINGLE" | "MFJ" | "HOH";
  stateRate: number;
}

export interface CapitalGainsResult {
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;
  niitApplies: boolean; // Net Investment Income Tax (3.8%)
  niitAmount: number;
  strategies: string[];
}

export function analyzeCapitalGains(
  input: CapitalGainsInput
): CapitalGainsResult {
  const {
    shortTermGains,
    longTermGains,
    ordinaryIncome,
    filingStatus,
    stateRate,
  } = input;

  // LTCG Brackets (2024)
  const LTCG_BRACKETS: Record<
    string,
    { zeroPercent: number; fifteenPercent: number }
  > = {
    SINGLE: { zeroPercent: 47025, fifteenPercent: 518900 },
    MFJ: { zeroPercent: 94050, fifteenPercent: 583750 },
    HOH: { zeroPercent: 63000, fifteenPercent: 551350 },
  };

  const NIIT_THRESHOLD: Record<string, number> = {
    SINGLE: 200000,
    MFJ: 250000,
    HOH: 200000,
  };

  const brackets = LTCG_BRACKETS[filingStatus];
  const niitThreshold = NIIT_THRESHOLD[filingStatus];

  // Short-term gains taxed at ordinary rates (assume 24% marginal for simplicity)
  const shortTermTax = shortTermGains * 0.24;

  // Long-term gains: apply 0%, 15%, 20% brackets
  let longTermTax = 0;
  const totalIncome = ordinaryIncome + longTermGains;

  if (totalIncome <= brackets.zeroPercent) {
    // All LTCG at 0%
    longTermTax = 0;
  } else if (totalIncome <= brackets.fifteenPercent) {
    // LTCG at 15%
    const gainsAboveZero = Math.max(
      0,
      totalIncome - Math.max(ordinaryIncome, brackets.zeroPercent)
    );
    longTermTax = gainsAboveZero * 0.15;
  } else {
    // LTCG at 20% (simplified - really a mix)
    longTermTax = longTermGains * 0.2;
  }

  const federalTax = shortTermTax + longTermTax;

  // State tax on all gains
  const stateTax = (shortTermGains + longTermGains) * stateRate;

  // NIIT: 3.8% on investment income if MAGI exceeds threshold
  const niitApplies = totalIncome > niitThreshold;
  const niitAmount = niitApplies
    ? (shortTermGains + longTermGains) * 0.038
    : 0;

  const totalTax = federalTax + stateTax + niitAmount;
  const effectiveRate =
    shortTermGains + longTermGains > 0
      ? totalTax / (shortTermGains + longTermGains)
      : 0;

  // Strategies
  const strategies: string[] = [];
  if (longTermGains > 0) {
    strategies.push(
      "Hold investments >1 year to qualify for lower long-term capital gains rates."
    );
  }
  if (niitApplies) {
    strategies.push(
      "Consider deferring gains or accelerating deductions to reduce MAGI below NIIT threshold."
    );
  }
  if (shortTermGains > 0) {
    strategies.push(
      "Offset short-term gains with harvested losses to reduce ordinary income tax."
    );
  }
  if (totalIncome < brackets.zeroPercent) {
    strategies.push(
      `Your income is below the 0% LTCG threshold ($${brackets.zeroPercent.toLocaleString()}). Consider realizing more gains tax-free.`
    );
  }

  return {
    federalTax,
    stateTax,
    totalTax,
    effectiveRate,
    niitApplies,
    niitAmount,
    strategies,
  };
}

// ============== MULTI-YEAR TAX PROJECTION ==============

export interface MultiYearTaxInput {
  currentIncome: number;
  incomeGrowthRate: number;
  filingStatus: "SINGLE" | "MFJ" | "HOH";
  state: string;
  stateRate: number;
  retirementAge: number;
  currentAge: number;
  projectionYears: number;
  rothConversions?: { year: number; amount: number }[];
  expectedRetirementIncome: number;
}

export interface MultiYearTaxResult {
  yearByYear: {
    year: number;
    age: number;
    grossIncome: number;
    federalTax: number;
    stateTax: number;
    ficaTax: number;
    totalTax: number;
    effectiveRate: number;
    marginalRate: number;
  }[];
  totalLifetimeTax: number;
  averageEffectiveRate: number;
}

export function projectMultiYearTax(
  input: MultiYearTaxInput
): MultiYearTaxResult {
  const {
    currentIncome,
    incomeGrowthRate,
    filingStatus,
    stateRate,
    retirementAge,
    currentAge,
    projectionYears,
    rothConversions = [],
    expectedRetirementIncome,
  } = input;

  // 2024 Federal brackets (single)
  const FEDERAL_BRACKETS_SINGLE = [
    { start: 0, end: 11600, rate: 0.1 },
    { start: 11600, end: 47150, rate: 0.12 },
    { start: 47150, end: 100525, rate: 0.22 },
    { start: 100525, end: 191950, rate: 0.24 },
    { start: 191950, end: 243725, rate: 0.32 },
    { start: 243725, end: 609350, rate: 0.35 },
    { start: 609350, end: Infinity, rate: 0.37 },
  ];

  const FEDERAL_BRACKETS_MFJ = [
    { start: 0, end: 23200, rate: 0.1 },
    { start: 23200, end: 94300, rate: 0.12 },
    { start: 94300, end: 201050, rate: 0.22 },
    { start: 201050, end: 383900, rate: 0.24 },
    { start: 383900, end: 487450, rate: 0.32 },
    { start: 487450, end: 731200, rate: 0.35 },
    { start: 731200, end: Infinity, rate: 0.37 },
  ];

  const FEDERAL_BRACKETS_HOH = [
    { start: 0, end: 16550, rate: 0.1 },
    { start: 16550, end: 63100, rate: 0.12 },
    { start: 63100, end: 100500, rate: 0.22 },
    { start: 100500, end: 191950, rate: 0.24 },
    { start: 191950, end: 243700, rate: 0.32 },
    { start: 243700, end: 609350, rate: 0.35 },
    { start: 609350, end: Infinity, rate: 0.37 },
  ];

  const STANDARD_DEDUCTION: Record<string, number> = {
    SINGLE: 14600,
    MFJ: 29200,
    HOH: 21900,
  };

  const federalBrackets =
    filingStatus === "MFJ"
      ? FEDERAL_BRACKETS_MFJ
      : filingStatus === "HOH"
        ? FEDERAL_BRACKETS_HOH
        : FEDERAL_BRACKETS_SINGLE;

  const standardDeduction = STANDARD_DEDUCTION[filingStatus];

  const yearByYear: MultiYearTaxResult["yearByYear"] = [];
  let totalLifetimeTax = 0;

  for (let i = 0; i < projectionYears; i++) {
    const year = currentAge + i;
    const isRetired = year >= retirementAge;

    // Calculate gross income
    let grossIncome = isRetired
      ? expectedRetirementIncome
      : currentIncome * Math.pow(1 + incomeGrowthRate, i);

    // Add Roth conversion if applicable
    const conversion = rothConversions.find((c) => c.year === year);
    if (conversion) {
      grossIncome += conversion.amount;
    }

    // Federal tax
    const taxableIncome = Math.max(0, grossIncome - standardDeduction);
    let federalTax = 0;
    let marginalRate = 0;

    for (const bracket of federalBrackets) {
      if (taxableIncome > bracket.start) {
        const taxableInBracket = Math.min(
          taxableIncome - bracket.start,
          bracket.end - bracket.start
        );
        federalTax += taxableInBracket * bracket.rate;
        marginalRate = bracket.rate;
      }
    }

    // State tax
    const stateTax = grossIncome * stateRate;

    // FICA (only if not retired)
    let ficaTax = 0;
    if (!isRetired) {
      const SS_RATE = 0.062;
      const SS_WAGE_BASE = 168600;
      const MEDICARE_RATE = 0.0145;
      const ADDITIONAL_MEDICARE_RATE = 0.009;
      const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

      const socialSecurity = Math.min(grossIncome, SS_WAGE_BASE) * SS_RATE;
      const medicare = grossIncome * MEDICARE_RATE;
      const additionalMedicare =
        grossIncome > ADDITIONAL_MEDICARE_THRESHOLD
          ? (grossIncome - ADDITIONAL_MEDICARE_THRESHOLD) *
            ADDITIONAL_MEDICARE_RATE
          : 0;

      ficaTax = socialSecurity + medicare + additionalMedicare;
    }

    const totalTax = federalTax + stateTax + ficaTax;
    const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

    totalLifetimeTax += totalTax;

    yearByYear.push({
      year,
      age: year,
      grossIncome,
      federalTax,
      stateTax,
      ficaTax,
      totalTax,
      effectiveRate,
      marginalRate,
    });
  }

  const averageEffectiveRate =
    yearByYear.reduce((sum, y) => sum + y.grossIncome, 0) > 0
      ? totalLifetimeTax /
        yearByYear.reduce((sum, y) => sum + y.grossIncome, 0)
      : 0;

  return {
    yearByYear,
    totalLifetimeTax,
    averageEffectiveRate,
  };
}
