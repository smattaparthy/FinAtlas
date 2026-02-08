interface EmergencyFundInput {
  monthlyEssentialExpenses: number;
  targetMonths: number;
  currentLiquidAssets: number;
  monthlySavings: number;
}

export interface EmergencyFundResult {
  targetAmount: number;
  currentAmount: number;
  gap: number; // positive = shortfall, negative = surplus
  monthsCovered: number; // currentLiquidAssets / monthlyEssentialExpenses
  monthsToTarget: number | null; // null if already funded or no savings
  fundedPercentage: number; // 0 to 100+
  status: "FULLY_FUNDED" | "PARTIAL" | "CRITICAL";
}

export function calculateEmergencyFund(
  input: EmergencyFundInput
): EmergencyFundResult {
  const targetAmount = input.monthlyEssentialExpenses * input.targetMonths;
  const currentAmount = input.currentLiquidAssets;
  const gap = targetAmount - currentAmount;

  const monthsCovered =
    input.monthlyEssentialExpenses > 0
      ? currentAmount / input.monthlyEssentialExpenses
      : 0;

  let monthsToTarget: number | null = null;
  if (gap > 0 && input.monthlySavings > 0) {
    monthsToTarget = Math.ceil(gap / input.monthlySavings);
  }

  const fundedPercentage =
    targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  let status: "FULLY_FUNDED" | "PARTIAL" | "CRITICAL";
  if (fundedPercentage >= 100) {
    status = "FULLY_FUNDED";
  } else if (fundedPercentage >= 50) {
    status = "PARTIAL";
  } else {
    status = "CRITICAL";
  }

  return {
    targetAmount,
    currentAmount,
    gap,
    monthsCovered,
    monthsToTarget,
    fundedPercentage,
    status,
  };
}
