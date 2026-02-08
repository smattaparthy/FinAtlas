import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Frequency multipliers convert TO annual amounts
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

async function verifyScenarioOwnership(userId: string, scenarioId: string) {
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: userId },
    },
    select: { id: true },
  });
  return !!scenario;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  const monthsParam = req.nextUrl.searchParams.get("months");
  const months = monthsParam ? parseInt(monthsParam, 10) : 12;

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  if (months < 1 || months > 24) {
    return NextResponse.json({ error: "months must be between 1 and 24" }, { status: 400 });
  }

  const hasAccess = await verifyScenarioOwnership(user.id, scenarioId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Fetch incomes, expenses, and loans in parallel
  const [incomes, expenses, loans] = await Promise.all([
    prisma.income.findMany({
      where: { scenarioId },
      select: { amount: true, frequency: true },
    }),
    prisma.expense.findMany({
      where: { scenarioId },
      select: { amount: true, frequency: true },
    }),
    prisma.loan.findMany({
      where: { scenarioId },
      select: { monthlyPayment: true },
    }),
  ]);

  // Calculate monthly inflows: sum of income amounts converted to monthly
  const monthlyInflows = incomes.reduce((sum, income) => {
    const multiplier = FREQUENCY_MULTIPLIERS[income.frequency] || 0;
    const monthlyAmount = multiplier > 0 ? (income.amount * multiplier) / 12 : 0;
    return sum + monthlyAmount;
  }, 0);

  // Calculate monthly outflows: sum of expense amounts converted to monthly + loan payments
  const monthlyExpenses = expenses.reduce((sum, expense) => {
    const multiplier = FREQUENCY_MULTIPLIERS[expense.frequency] || 0;
    const monthlyAmount = multiplier > 0 ? (expense.amount * multiplier) / 12 : 0;
    return sum + monthlyAmount;
  }, 0);

  const monthlyLoanPayments = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);
  const monthlyOutflows = monthlyExpenses + monthlyLoanPayments;

  // Generate array of N months starting from current month
  const now = new Date();
  const monthsData = [];
  let runningBalance = 0;

  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthString = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    const netCashFlow = monthlyInflows - monthlyOutflows;
    runningBalance += netCashFlow;

    monthsData.push({
      month: monthString,
      inflows: monthlyInflows,
      outflows: monthlyOutflows,
      netCashFlow,
      runningBalance,
    });
  }

  // Calculate summary statistics
  const avgMonthlyInflow = monthlyInflows;
  const avgMonthlyOutflow = monthlyOutflows;
  const avgNetCashFlow = monthlyInflows - monthlyOutflows;
  const projectedSurplus = runningBalance;

  return NextResponse.json({
    months: monthsData,
    summary: {
      avgMonthlyInflow,
      avgMonthlyOutflow,
      avgNetCashFlow,
      projectedSurplus,
    },
  });
}
