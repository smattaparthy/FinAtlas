export interface LifeInsuranceInput {
  annualIncome: number;
  yearsToReplace: number;
  outstandingDebts: number;
  educationPerChild: number;
  numberOfChildren: number;
  finalExpenses: number;
  existingCoverage: number;
  currentAge: number;
  retirementAge: number;
}

export interface LifeInsuranceResult {
  incomeReplacement: number;
  debtCoverage: number;
  educationFund: number;
  finalExpenses: number;
  totalRecommended: number;
  existingCoverage: number;
  coverageGap: number; // positive = gap, negative = over-insured
  suggestedTermYears: number;
  breakdown: Array<{ label: string; amount: number; color: string }>;
}

export interface DisabilityInsuranceInput {
  annualIncome: number;
  monthlyEssentialExpenses: number;
  employerCoveragePct: number;
  existingDisabilityCoverage: number;
}

export interface DisabilityInsuranceResult {
  grossMonthlyIncome: number;
  recommendedMonthlyBenefit: number; // 60-70% of income
  currentMonthlyBenefit: number;
  coverageGap: number;
  essentialMonthlyExpenses: number;
  coverageRatio: number; // percent of expenses covered
}

export function calculateLifeInsuranceNeed(
  params: LifeInsuranceInput
): LifeInsuranceResult {
  const incomeReplacement = params.annualIncome * params.yearsToReplace;
  const debtCoverage = params.outstandingDebts;
  const educationFund = params.educationPerChild * params.numberOfChildren;
  const finalExpenses = params.finalExpenses;

  const totalRecommended =
    incomeReplacement + debtCoverage + educationFund + finalExpenses;
  const coverageGap = totalRecommended - params.existingCoverage;

  const suggestedTermYears = Math.max(
    params.retirementAge - params.currentAge,
    20
  );

  const breakdown: Array<{ label: string; amount: number; color: string }> = [
    { label: "Income Replacement", amount: incomeReplacement, color: "#10b981" }, // emerald-500
    { label: "Debt Coverage", amount: debtCoverage, color: "#3b82f6" }, // blue-500
    { label: "Education Fund", amount: educationFund, color: "#f59e0b" }, // amber-500
    { label: "Final Expenses", amount: finalExpenses, color: "#71717a" }, // zinc-500
  ];

  return {
    incomeReplacement,
    debtCoverage,
    educationFund,
    finalExpenses,
    totalRecommended,
    existingCoverage: params.existingCoverage,
    coverageGap,
    suggestedTermYears,
    breakdown,
  };
}

export function calculateDisabilityInsuranceNeed(
  params: DisabilityInsuranceInput
): DisabilityInsuranceResult {
  const grossMonthlyIncome = params.annualIncome / 12;
  const recommendedMonthlyBenefit = grossMonthlyIncome * 0.65;
  const currentMonthlyBenefit =
    (grossMonthlyIncome * params.employerCoveragePct) / 100 +
    params.existingDisabilityCoverage;
  const coverageGap = recommendedMonthlyBenefit - currentMonthlyBenefit;
  const coverageRatio =
    params.monthlyEssentialExpenses > 0
      ? (currentMonthlyBenefit / params.monthlyEssentialExpenses) * 100
      : 0;

  return {
    grossMonthlyIncome,
    recommendedMonthlyBenefit,
    currentMonthlyBenefit,
    coverageGap,
    essentialMonthlyExpenses: params.monthlyEssentialExpenses,
    coverageRatio,
  };
}
