export interface RatioInput {
  monthlyGrossIncome: number;
  monthlyExpenses: number;
  totalMonthlyDebt: number;
  housingExpenses: number;
  liquidAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  annualIncome: number;
  netWorth: number;
}

interface RatioDetail {
  value: number;
  rating: "good" | "fair" | "poor";
  benchmark: string;
  description: string;
}

export interface RatioResult {
  debtToIncome: RatioDetail;
  savingsRate: RatioDetail;
  liquidityRatio: RatioDetail;
  housingRatio: RatioDetail;
  netWorthToIncome: RatioDetail;
  overallScore: number;
  overallRating: "good" | "fair" | "poor";
}

function getRating(
  value: number,
  goodThreshold: number,
  fairThreshold: number,
  isHigherBetter: boolean
): "good" | "fair" | "poor" {
  if (isHigherBetter) {
    if (value >= goodThreshold) return "good";
    if (value >= fairThreshold) return "fair";
    return "poor";
  } else {
    if (value <= goodThreshold) return "good";
    if (value <= fairThreshold) return "fair";
    return "poor";
  }
}

export function calculateRatios(input: RatioInput): RatioResult {
  const {
    monthlyGrossIncome,
    monthlyExpenses,
    totalMonthlyDebt,
    housingExpenses,
    liquidAssets,
    annualIncome,
    netWorth,
  } = input;

  // Debt-to-Income Ratio
  const dtiValue =
    monthlyGrossIncome > 0 ? totalMonthlyDebt / monthlyGrossIncome : 0;
  const debtToIncome: RatioDetail = {
    value: dtiValue,
    rating: getRating(dtiValue, 0.36, 0.43, false),
    benchmark: "Under 36%",
    description: "Percentage of monthly income going to debt payments",
  };

  // Savings Rate
  const savingsValue =
    monthlyGrossIncome > 0
      ? (monthlyGrossIncome - monthlyExpenses) / monthlyGrossIncome
      : 0;
  const savingsRate: RatioDetail = {
    value: Math.max(0, savingsValue),
    rating: getRating(Math.max(0, savingsValue), 0.2, 0.1, true),
    benchmark: "Over 20%",
    description: "Portion of income being saved",
  };

  // Liquidity Ratio
  const liquidityValue =
    monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
  const liquidityRatio: RatioDetail = {
    value: liquidityValue,
    rating: getRating(liquidityValue, 6, 3, true),
    benchmark: "6+ months",
    description: "Months of expenses covered by liquid assets",
  };

  // Housing Ratio
  const housingValue =
    monthlyGrossIncome > 0 ? housingExpenses / monthlyGrossIncome : 0;
  const housingRatio: RatioDetail = {
    value: housingValue,
    rating: getRating(housingValue, 0.28, 0.36, false),
    benchmark: "Under 28%",
    description: "Housing costs as share of income",
  };

  // Net Worth to Income Ratio
  const nwToIncomeValue = annualIncome > 0 ? netWorth / annualIncome : 0;
  const netWorthToIncome: RatioDetail = {
    value: nwToIncomeValue,
    rating: getRating(nwToIncomeValue, 2, 1, true),
    benchmark: "2x+ income",
    description: "Net worth relative to annual income",
  };

  // Calculate overall score
  const ratios = [
    debtToIncome,
    savingsRate,
    liquidityRatio,
    housingRatio,
    netWorthToIncome,
  ];

  const points = ratios.reduce((sum, ratio) => {
    if (ratio.rating === "good") return sum + 2;
    if (ratio.rating === "fair") return sum + 1;
    return sum;
  }, 0);

  const overallScore = (points / 10) * 100;
  const overallRating: "good" | "fair" | "poor" =
    overallScore >= 70 ? "good" : overallScore >= 40 ? "fair" : "poor";

  return {
    debtToIncome,
    savingsRate,
    liquidityRatio,
    housingRatio,
    netWorthToIncome,
    overallScore,
    overallRating,
  };
}
