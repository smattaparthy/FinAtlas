import type { ScenarioInputDTO } from "@finatlas/engine/src/types";

/**
 * Map database growth rule to engine growth rule.
 */
export function mapGrowthRule(rule: string): "NONE" | "TRACK_INFLATION" | "CUSTOM_PERCENT" {
  switch (rule) {
    case "INFLATION":
      return "TRACK_INFLATION";
    case "FIXED":
      return "CUSTOM_PERCENT";
    case "INFLATION_PLUS":
      return "CUSTOM_PERCENT";
    default:
      return "NONE";
  }
}

/**
 * Build engine input DTO from a Prisma scenario with includes.
 * Used by both the deterministic projections route and Monte Carlo route.
 */
export function buildEngineInput(scenario: {
  id: string;
  household: {
    members: Array<{ id: string; name: string }>;
  };
  incomes: Array<{
    id: string;
    member?: { name: string } | null;
    name: string;
    amount: number;
    frequency: string;
    startDate: Date;
    endDate: Date | null;
    growthRule: string;
    growthRate: number | null;
  }>;
  expenses: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    startDate: Date;
    endDate: Date | null;
    growthRule: string;
    growthRate: number | null;
    category: string | null;
  }>;
  accounts: Array<{
    id: string;
    name: string;
    holdings: Array<{
      symbol: string;
      shares: number;
      costBasis: number | null;
    }>;
  }>;
  loans: Array<{
    id: string;
    name: string;
    principal: number;
    interestRate: number;
    termMonths: number;
    startDate: Date;
    monthlyPayment: number;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    targetDate: Date | null;
  }>;
}): ScenarioInputDTO {
  return {
    scenarioId: scenario.id,
    household: {
      currency: "USD",
      anchorDate: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().getFullYear() + 20, 11, 31).toISOString().split("T")[0],
    },
    assumptions: {
      inflationRatePct: 2.5,
      taxableInterestYieldPct: 0.5,
      taxableDividendYieldPct: 2.0,
      realizedStGainPct: 0.0,
      realizedLtGainPct: 5.0,
    },
    taxProfile: {
      stateCode: "CA",
      filingStatus: "MFJ",
      taxYear: new Date().getFullYear(),
      includePayrollTaxes: true,
      advancedOverridesEnabled: false,
    },
    taxRules: {
      federal: null,
      state: null,
    },
    incomes: scenario.incomes
      .filter((income) => income.startDate !== null)
      .map((income) => ({
        id: income.id,
        memberName: income.member?.name,
        name: income.name,
        amount: income.amount,
        frequency: income.frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME",
        startDate: income.startDate.toISOString().split("T")[0],
        endDate: income.endDate ? income.endDate.toISOString().split("T")[0] : undefined,
        growthRule: mapGrowthRule(income.growthRule),
        growthPct: income.growthRate ? income.growthRate * 100 : undefined,
      })),
    expenses: scenario.expenses
      .filter((expense) => expense.startDate !== null)
      .map((expense) => ({
        id: expense.id,
        category: expense.category || "Uncategorized",
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME",
        startDate: expense.startDate.toISOString().split("T")[0],
        endDate: expense.endDate ? expense.endDate.toISOString().split("T")[0] : undefined,
        growthRule: mapGrowthRule(expense.growthRule),
        growthPct: expense.growthRate ? expense.growthRate * 100 : undefined,
        isEssential: true,
      })),
    accounts: scenario.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: "TAXABLE" as const,
      expectedReturnPct: 7.0,
      holdings: account.holdings.map((holding) => ({
        ticker: holding.symbol,
        shares: holding.shares,
        avgPrice: holding.costBasis ?? 0,
        lastPrice: undefined,
        asOfDate: undefined,
      })),
    })),
    contributions: [],
    loans: scenario.loans
      .filter((loan) => loan.startDate !== null)
      .map((loan) => ({
        id: loan.id,
        type: "OTHER" as const,
        name: loan.name,
        principal: loan.principal,
        aprPct: loan.interestRate,
        termMonths: loan.termMonths,
        startDate: loan.startDate.toISOString().split("T")[0],
        paymentOverrideMonthly: loan.monthlyPayment ?? undefined,
        extraPaymentMonthly: undefined,
      })),
    goals: scenario.goals
      .filter((goal) => goal.targetDate !== null)
      .map((goal) => ({
        id: goal.id,
        type: "RETIREMENT" as const,
        name: goal.name,
        targetAmountReal: goal.targetAmount,
        targetDate: goal.targetDate!.toISOString().split("T")[0],
        priority: 2 as const,
      })),
  };
}
