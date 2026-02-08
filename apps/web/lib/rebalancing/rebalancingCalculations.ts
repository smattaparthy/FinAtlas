export type AssetClass = "Stocks" | "Bonds" | "Cash";

export interface RiskProfile {
  stocks: number;  // percentage 0-100
  bonds: number;
  cash: number;
}

export const RISK_PROFILES: Record<string, RiskProfile> = {
  conservative: { stocks: 30, bonds: 50, cash: 20 },
  moderate: { stocks: 60, bonds: 30, cash: 10 },
  aggressive: { stocks: 80, bonds: 15, cash: 5 },
};

export interface AllocationItem {
  assetClass: AssetClass;
  currentValue: number;
  currentPct: number;    // 0-100
  targetPct: number;     // 0-100
  difference: number;    // currentPct - targetPct
  action: "BUY" | "SELL" | "HOLD";
  adjustAmount: number;  // dollar amount to buy/sell
}

export interface RebalanceResult {
  allocations: AllocationItem[];
  totalValue: number;
  driftScore: number;    // sum of |difference| across all classes
}

export function classifyAccount(type: string): AssetClass {
  if (type === "SAVINGS") {
    return "Cash";
  }
  // Everything else is simplified to Stocks for now
  // In reality, bonds would need holding-level data
  return "Stocks";
}

export function calculateAllocations(
  accounts: Array<{ type: string; balance: number }>,
  targetProfile: RiskProfile
): RebalanceResult {
  // Group accounts by asset class and sum balances
  const classValues: Record<AssetClass, number> = {
    Stocks: 0,
    Bonds: 0,
    Cash: 0,
  };

  accounts.forEach((account) => {
    const assetClass = classifyAccount(account.type);
    classValues[assetClass] += account.balance;
  });

  // Calculate total value
  const totalValue = classValues.Stocks + classValues.Bonds + classValues.Cash;

  // Build allocations for all three asset classes
  const allocations: AllocationItem[] = [];
  const assetClasses: AssetClass[] = ["Stocks", "Bonds", "Cash"];

  assetClasses.forEach((assetClass) => {
    const currentValue = classValues[assetClass];
    const currentPct = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    const targetPct = targetProfile[assetClass.toLowerCase() as keyof RiskProfile];
    const difference = currentPct - targetPct;

    let action: "BUY" | "SELL" | "HOLD";
    if (difference > 2) {
      action = "SELL";
    } else if (difference < -2) {
      action = "BUY";
    } else {
      action = "HOLD";
    }

    const adjustAmount = Math.abs(difference / 100) * totalValue;

    allocations.push({
      assetClass,
      currentValue,
      currentPct,
      targetPct,
      difference,
      action,
      adjustAmount,
    });
  });

  // Calculate drift score
  const driftScore = allocations.reduce((sum, item) => sum + Math.abs(item.difference), 0);

  return {
    allocations,
    totalValue,
    driftScore,
  };
}
