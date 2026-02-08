import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { runEngine } from "@finatlas/engine";
import type { ScenarioInputDTO } from "@finatlas/engine/src/types";

interface ComponentScore {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface Insight {
  type: "positive" | "warning" | "action";
  title: string;
  description: string;
}

function scoreSavingsRate(income: number, expenses: number, taxes: number): ComponentScore {
  const rate = income > 0 ? ((income - expenses - taxes) / income) * 100 : 0;
  let score: number;
  if (rate >= 20) score = 100;
  else if (rate >= 15) score = 80;
  else if (rate >= 10) score = 60;
  else if (rate >= 5) score = 40;
  else score = 20;

  return {
    name: "Savings Rate",
    score,
    weight: 0.25,
    description: `${rate.toFixed(1)}% of income saved`,
  };
}

function scoreDebtToIncome(annualLoanPayments: number, income: number): ComponentScore {
  const ratio = income > 0 ? (annualLoanPayments / income) * 100 : 0;
  let score: number;
  if (ratio < 15) score = 100;
  else if (ratio < 28) score = 70;
  else if (ratio < 36) score = 50;
  else if (ratio < 50) score = 30;
  else score = 10;

  return {
    name: "Debt-to-Income",
    score,
    weight: 0.2,
    description: `${ratio.toFixed(1)}% of income goes to debt`,
  };
}

function scoreEmergencyFund(liquidAssets: number, monthlyExpenses: number): ComponentScore {
  const months = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;
  let score: number;
  if (months >= 9) score = 100;
  else if (months >= 6) score = 80;
  else if (months >= 3) score = 60;
  else if (months >= 1) score = 30;
  else score = 10;

  return {
    name: "Emergency Fund",
    score,
    weight: 0.2,
    description: `${months.toFixed(1)} months of expenses covered`,
  };
}

function scoreRetirementReadiness(projectedNW: number, annualExpenses: number): ComponentScore {
  const target = annualExpenses * 25; // 4% rule
  const ratio = target > 0 ? Math.min((projectedNW / target) * 100, 100) : 0;

  return {
    name: "Retirement Readiness",
    score: Math.round(ratio),
    weight: 0.2,
    description: `${Math.round(ratio)}% of 25x expenses target`,
  };
}

function scoreGrowthTrajectory(annual: { year: number; endNetWorth: number }[]): ComponentScore {
  if (annual.length < 2) {
    return { name: "NW Growth", score: 50, weight: 0.15, description: "Insufficient data" };
  }

  const startNW = Math.max(annual[0].endNetWorth, 1);
  const endNW = annual[annual.length - 1].endNetWorth;
  const years = annual.length - 1;
  const cagr = years > 0 ? (Math.pow(Math.max(endNW, 0) / startNW, 1 / years) - 1) * 100 : 0;

  let score: number;
  if (cagr > 10) score = 100;
  else if (cagr > 6) score = 75;
  else if (cagr > 3) score = 50;
  else if (cagr > 0) score = 30;
  else score = 10;

  return {
    name: "NW Growth",
    score,
    weight: 0.15,
    description: `${cagr.toFixed(1)}% CAGR projected`,
  };
}

function generateInsights(components: ComponentScore[], data: {
  savingsRate: number;
  debtRatio: number;
  emergencyMonths: number;
  retirementRatio: number;
  cagr: number;
}): Insight[] {
  const insights: Insight[] = [];

  // Find strongest and weakest
  const sorted = [...components].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  // Positive insight for strongest area
  if (strongest.score >= 80) {
    insights.push({
      type: "positive",
      title: `Strong ${strongest.name}`,
      description: strongest.description,
    });
  }

  // Warning for weakest area
  if (weakest.score < 50) {
    insights.push({
      type: "warning",
      title: `Improve ${weakest.name}`,
      description: `Your ${weakest.name.toLowerCase()} score is ${weakest.score}/100. ${weakest.description}.`,
    });
  }

  // Specific action items
  if (data.emergencyMonths < 3) {
    insights.push({
      type: "action",
      title: "Build Emergency Fund",
      description: `You have ${data.emergencyMonths.toFixed(1)} months of expenses saved. Aim for 3-6 months.`,
    });
  }

  if (data.savingsRate < 15) {
    insights.push({
      type: "action",
      title: "Increase Savings Rate",
      description: `At ${data.savingsRate.toFixed(1)}%, aim to save at least 15-20% of income.`,
    });
  }

  if (data.debtRatio > 36) {
    insights.push({
      type: "warning",
      title: "High Debt Load",
      description: `Debt payments consume ${data.debtRatio.toFixed(1)}% of income. Consider accelerating payoff.`,
    });
  }

  // Limit to 5 insights max
  return insights.slice(0, 5);
}

// Reuse the same growth rule mapper from projections API
function mapGrowthRule(rule: string): "NONE" | "TRACK_INFLATION" | "CUSTOM_PERCENT" {
  switch (rule) {
    case "INFLATION": return "TRACK_INFLATION";
    case "FIXED":
    case "INFLATION_PLUS": return "CUSTOM_PERCENT";
    default: return "NONE";
  }
}

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

  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
    include: {
      household: { include: { members: true } },
      incomes: { include: { member: true } },
      expenses: true,
      accounts: { include: { holdings: true } },
      loans: true,
      goals: true,
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Build engine input (same as projections API)
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
    taxRules: { federal: null, state: null },
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
        priority: 2,
      })),
  };

  try {
    const result = runEngine(engineInput);

    // Compute dashboard-level data
    const frequencyMultipliers: Record<string, number> = {
      ANNUAL: 1, MONTHLY: 12, BIWEEKLY: 26, WEEKLY: 52, ONE_TIME: 0,
    };

    const totalAnnualIncome = scenario.incomes.reduce((sum, i) => {
      const mult = frequencyMultipliers[i.frequency] ?? 1;
      return sum + i.amount * mult;
    }, 0);

    const totalAnnualExpenses = scenario.expenses.reduce((sum, e) => {
      const mult = frequencyMultipliers[e.frequency] ?? 1;
      return sum + e.amount * mult;
    }, 0);

    const liquidAssets = scenario.accounts.reduce((sum, a) => sum + a.balance, 0);

    const annualLoanPayments = scenario.loans.reduce((sum, loan) => {
      if (!loan.principal || !loan.termMonths) return sum;
      const monthlyRate = (loan.interestRate || 0) / 12;
      const n = loan.termMonths;
      let monthlyPayment = 0;
      if (monthlyRate === 0) monthlyPayment = loan.principal / n;
      else monthlyPayment = (loan.principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
      return sum + (isNaN(monthlyPayment) ? 0 : monthlyPayment * 12);
    }, 0);

    // Estimate annual taxes from first year of projection
    const firstYearTaxes = result.annual.length > 0 ? result.annual[0].taxes : totalAnnualIncome * 0.25;

    // Last year projected net worth
    const lastYearNW = result.annual.length > 0
      ? result.annual[result.annual.length - 1].endNetWorth
      : liquidAssets;

    // Compute data for scoring
    const savingsRate = totalAnnualIncome > 0
      ? ((totalAnnualIncome - totalAnnualExpenses - firstYearTaxes) / totalAnnualIncome) * 100
      : 0;
    const debtRatio = totalAnnualIncome > 0
      ? (annualLoanPayments / totalAnnualIncome) * 100
      : 0;
    const emergencyMonths = (totalAnnualExpenses / 12) > 0
      ? liquidAssets / (totalAnnualExpenses / 12)
      : 0;

    // Compute 5 component scores
    const components: ComponentScore[] = [
      scoreSavingsRate(totalAnnualIncome, totalAnnualExpenses, firstYearTaxes),
      scoreDebtToIncome(annualLoanPayments, totalAnnualIncome),
      scoreEmergencyFund(liquidAssets, totalAnnualExpenses / 12),
      scoreRetirementReadiness(lastYearNW, totalAnnualExpenses),
      scoreGrowthTrajectory(result.annual),
    ];

    // Weighted overall score
    const overall = Math.round(
      components.reduce((sum, c) => sum + c.score * c.weight, 0)
    );

    // CAGR for insights
    let cagr = 0;
    if (result.annual.length >= 2) {
      const startNW = Math.max(result.annual[0].endNetWorth, 1);
      const endNW = result.annual[result.annual.length - 1].endNetWorth;
      const years = result.annual.length - 1;
      cagr = years > 0 ? (Math.pow(Math.max(endNW, 0) / startNW, 1 / years) - 1) * 100 : 0;
    }

    const retirementRatio = totalAnnualExpenses > 0
      ? (lastYearNW / (totalAnnualExpenses * 25)) * 100
      : 0;

    const insights = generateInsights(components, {
      savingsRate,
      debtRatio,
      emergencyMonths,
      retirementRatio,
      cagr,
    });

    return NextResponse.json({
      overall,
      components,
      insights,
    });
  } catch (error) {
    console.error("Health score error:", error);
    return NextResponse.json({ error: "Failed to compute health score" }, { status: 500 });
  }
}
