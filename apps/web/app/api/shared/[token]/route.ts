import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ token: string }> };

// GET /api/shared/[token] - Public endpoint, no auth required
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
    include: {
      scenario: {
        include: {
          incomes: true,
          expenses: true,
          accounts: { include: { contributions: true } },
          loans: true,
          goals: true,
          lifeEvents: true,
          assumptions: true,
        },
      },
    },
  });

  if (!shareToken) {
    return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
  }

  // Check expiry
  if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
  }

  // Increment access count
  await prisma.shareToken.update({
    where: { id: shareToken.id },
    data: { accessCount: { increment: 1 } },
  });

  const scenario = shareToken.scenario;

  // Build simple projection
  const frequencyMultipliers: Record<string, number> = {
    ANNUAL: 1,
    MONTHLY: 12,
    BIWEEKLY: 26,
    WEEKLY: 52,
    ONE_TIME: 0,
  };

  const totalBalance = scenario.accounts.reduce((s, a) => s + a.balance, 0);
  const annualIncome = scenario.incomes.reduce(
    (s, i) => s + i.amount * (frequencyMultipliers[i.frequency] ?? 1),
    0
  );
  const annualExpenses = scenario.expenses.reduce(
    (s, e) => s + e.amount * (frequencyMultipliers[e.frequency] ?? 1),
    0
  );
  const totalDebt = scenario.loans.reduce((s, l) => s + l.currentBalance, 0);
  const netWorth = totalBalance - totalDebt;

  // Simple 10-year projection
  const projectionYears = scenario.assumptions?.projectionYears ?? 10;
  const growthRate = scenario.assumptions?.defaultGrowthRate ?? 0.07;
  const taxRate = 0.25;
  const netAnnualSavings = (annualIncome - annualExpenses) * (1 - taxRate);

  const projection: Array<{ t: string; v: number }> = [];
  let nw = netWorth;
  const now = new Date();

  for (let i = 0; i <= projectionYears; i++) {
    const date = new Date(now);
    date.setFullYear(now.getFullYear() + i);
    projection.push({ t: date.toISOString(), v: Math.round(nw) });
    nw = nw * (1 + growthRate) + netAnnualSavings;
  }

  return NextResponse.json({
    scenarioName: scenario.name,
    summary: {
      netWorth,
      totalAssets: totalBalance,
      totalDebt,
      annualIncome,
      annualExpenses,
      incomeCount: scenario.incomes.length,
      expenseCount: scenario.expenses.length,
      accountCount: scenario.accounts.length,
      loanCount: scenario.loans.length,
      goalCount: scenario.goals.length,
    },
    projection,
    milestones: scenario.lifeEvents.map((le) => ({
      date: le.targetDate,
      name: le.name,
      color: le.color,
    })),
  });
}
