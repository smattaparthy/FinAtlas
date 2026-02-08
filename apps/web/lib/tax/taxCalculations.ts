export interface TaxBracket {
  bracketStart: number;
  bracketEnd: number | null;
  rate: number;
}

export interface BracketDetail {
  range: string;
  rate: number;
  taxableInBracket: number;
  taxInBracket: number;
}

export interface TaxBreakdown {
  brackets: BracketDetail[];
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

export interface PayrollTax {
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
}

export function calculateBracketTax(
  taxableIncome: number,
  brackets: TaxBracket[]
): TaxBreakdown {
  if (taxableIncome <= 0) {
    return {
      brackets: [],
      totalTax: 0,
      effectiveRate: 0,
      marginalRate: 0,
    };
  }

  const sortedBrackets = [...brackets].sort(
    (a, b) => a.bracketStart - b.bracketStart
  );

  let remainingIncome = taxableIncome;
  let totalTax = 0;
  let marginalRate = 0;
  const bracketDetails: BracketDetail[] = [];

  for (const bracket of sortedBrackets) {
    if (remainingIncome <= 0) break;

    const bracketStart = bracket.bracketStart;
    const bracketEnd = bracket.bracketEnd ?? Infinity;
    const bracketWidth = bracketEnd - bracketStart;

    const incomeAtBracketStart = Math.max(0, taxableIncome - bracketStart);
    if (incomeAtBracketStart <= 0) continue;

    const taxableInBracket = Math.min(incomeAtBracketStart, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;

    totalTax += taxInBracket;
    marginalRate = bracket.rate;

    const rangeEnd =
      bracket.bracketEnd === null
        ? "+"
        : ` - $${bracket.bracketEnd.toLocaleString()}`;
    const range = `$${bracket.bracketStart.toLocaleString()}${rangeEnd}`;

    bracketDetails.push({
      range,
      rate: bracket.rate,
      taxableInBracket,
      taxInBracket,
    });

    remainingIncome -= taxableInBracket;
  }

  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;

  return {
    brackets: bracketDetails,
    totalTax,
    effectiveRate,
    marginalRate,
  };
}

export function calculatePayrollTax(grossIncome: number): PayrollTax {
  const SS_RATE = 0.062;
  const SS_WAGE_BASE = 168600;
  const MEDICARE_RATE = 0.0145;
  const ADDITIONAL_MEDICARE_RATE = 0.009;
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;

  const socialSecurity = Math.min(grossIncome, SS_WAGE_BASE) * SS_RATE;
  const medicare = grossIncome * MEDICARE_RATE;
  const additionalMedicare =
    grossIncome > ADDITIONAL_MEDICARE_THRESHOLD
      ? (grossIncome - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE
      : 0;

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  };
}

export function getStandardDeduction(filingStatus: string): number {
  switch (filingStatus) {
    case "SINGLE":
      return 14600;
    case "MFJ":
      return 29200;
    case "HOH":
      return 21900;
    default:
      return 14600;
  }
}

export function getDefaultFederalBrackets(): TaxBracket[] {
  return [
    { bracketStart: 0, bracketEnd: 11600, rate: 0.1 },
    { bracketStart: 11600, bracketEnd: 47150, rate: 0.12 },
    { bracketStart: 47150, bracketEnd: 100525, rate: 0.22 },
    { bracketStart: 100525, bracketEnd: 191950, rate: 0.24 },
    { bracketStart: 191950, bracketEnd: 243725, rate: 0.32 },
    { bracketStart: 243725, bracketEnd: 609350, rate: 0.35 },
    { bracketStart: 609350, bracketEnd: null, rate: 0.37 },
  ];
}
