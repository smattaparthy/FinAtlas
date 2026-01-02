import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { runEngine } from "@finatlas/engine";
import type { ScenarioInputDTO } from "@finatlas/engine/src/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Fetch all scenario data
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: {
        ownerUserId: user.id,
      },
    },
    include: {
      household: {
        include: {
          members: true,
        },
      },
      incomes: {
        include: {
          member: true,
        },
      },
      expenses: true,
      accounts: {
        include: {
          holdings: true,
        },
      },
      loans: true,
      goals: true,
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Build engine input
  const engineInput: ScenarioInputDTO = {
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
        category: expense.category,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency as "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL" | "ONE_TIME",
        startDate: expense.startDate.toISOString().split("T")[0],
        endDate: expense.endDate ? expense.endDate.toISOString().split("T")[0] : undefined,
        growthRule: mapGrowthRule(expense.growthRule),
        growthPct: expense.growthRate ? expense.growthRate * 100 : undefined,
        isEssential: true, // Default to true for now
      })),
    accounts: scenario.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: "TAXABLE" as const, // Simplified for now
      expectedReturnPct: 7.0, // Default 7% return
      holdings: account.holdings.map((holding) => ({
        ticker: holding.ticker,
        shares: holding.shares,
        avgPrice: holding.avgPrice,
        lastPrice: holding.lastPrice ?? undefined,
        asOfDate: holding.asOfDate ? holding.asOfDate.toISOString().split("T")[0] : undefined,
      })),
    })),
    contributions: [], // No contributions for now
    loans: scenario.loans
      .filter((loan) => loan.startDate !== null)
      .map((loan) => ({
        id: loan.id,
        type: "OTHER" as const, // Simplified for now
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
        type: "RETIREMENT" as const, // Simplified for now
        name: goal.name,
        targetAmountReal: goal.targetAmount,
        targetDate: goal.targetDate.toISOString().split("T")[0],
        priority: 2,
      })),
  };

  try {
    // Run the engine
    const result = runEngine(engineInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Projection engine error:", error);
    return NextResponse.json(
      { error: "Failed to generate projection" },
      { status: 500 }
    );
  }
}

// Helper function to map growth rules
function mapGrowthRule(rule: string): "NONE" | "TRACK_INFLATION" | "CUSTOM_PERCENT" {
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
