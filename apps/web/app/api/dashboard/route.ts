import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { FREQUENCY_MULTIPLIERS, DEFAULT_TAX_RATE, DEFAULT_PROJECTION_GROWTH_RATE } from "@/lib/constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "Scenario ID is required" }, { status: 400 });
  }

  try {
    // Verify scenario belongs to user's household
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: { household: true },
    });

    if (!scenario || scenario.household.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Scenario not found or access denied" }, { status: 404 });
    }

    // Get summary data in parallel
    const [incomes, expenses, accounts, loans, goals] = await Promise.all([
      prisma.income.findMany({
        where: { scenarioId },
        select: { amount: true, frequency: true },
      }),
      prisma.expense.findMany({
        where: { scenarioId },
        select: { amount: true, frequency: true },
      }),
      prisma.account.findMany({
        where: { scenarioId },
        select: { balance: true },
      }),
      prisma.loan.findMany({
        where: { scenarioId },
        select: {
          principal: true,
          currentBalance: true,
          interestRate: true,
          termMonths: true,
          startDate: true,
        },
      }),
      prisma.goal.findMany({
        where: { scenarioId },
        select: { targetAmount: true, targetDate: true },
      }),
    ]);

    // Calculate annualized totals
    const totalAnnualIncome = incomes.reduce((sum, i) => {
      const multiplier = FREQUENCY_MULTIPLIERS[i.frequency] ?? 1;
      return sum + i.amount * multiplier;
    }, 0);

    const totalAnnualExpenses = expenses.reduce((sum, e) => {
      const multiplier = FREQUENCY_MULTIPLIERS[e.frequency] ?? 1;
      return sum + e.amount * multiplier;
    }, 0);

    const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);

    // Calculate loan payments
    const annualLoanPayments = loans.reduce((sum, loan) => {
      if (!loan.principal || !loan.termMonths) return sum;

      const monthlyRate = (loan.interestRate || 0) / 12;
      const numPayments = loan.termMonths;

      let monthlyPayment = 0;
      if (monthlyRate === 0) {
        monthlyPayment = loan.principal / numPayments;
      } else {
        monthlyPayment =
          (loan.principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1);
      }

      return sum + (isNaN(monthlyPayment) ? 0 : monthlyPayment * 12);
    }, 0);

    // Calculate goals progress
    const goalsProgress = calculateGoalsProgress({
      currentNetWorth: netWorth,
      annualIncome: totalAnnualIncome,
      annualExpenses: totalAnnualExpenses,
      annualLoanPayments,
      goals,
    });

    return NextResponse.json({
      totalAnnualIncome,
      totalAnnualExpenses,
      netWorth,
      goalsProgress,
      goalsCount: goals.length,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

function calculateGoalsProgress({
  currentNetWorth,
  annualIncome,
  annualExpenses,
  annualLoanPayments,
  goals,
}: {
  currentNetWorth: number;
  annualIncome: number;
  annualExpenses: number;
  annualLoanPayments: number;
  goals: Array<{ targetAmount: number; targetDate: Date | null }>;
}): number {
  if (goals.length === 0) return 0;

  const annualSavings = annualIncome - annualExpenses - annualLoanPayments;
  const estimatedTaxRate = DEFAULT_TAX_RATE;
  const netAnnualSavings = annualSavings * (1 - estimatedTaxRate);
  const growthRate = DEFAULT_PROJECTION_GROWTH_RATE;

  // Calculate progress for each goal
  const goalProgresses = goals.map((goal) => {
    if (!goal.targetDate) {
      // No target date - use current net worth vs target
      return Math.min((currentNetWorth / goal.targetAmount) * 100, 100);
    }

    // Calculate projected net worth at goal's target date
    const yearsToGoal = Math.max(
      0,
      (goal.targetDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    let projectedNetWorth = currentNetWorth;
    for (let i = 0; i < yearsToGoal; i++) {
      projectedNetWorth = projectedNetWorth * (1 + growthRate) + netAnnualSavings;
    }

    // Calculate progress as percentage toward goal
    return Math.min((projectedNetWorth / goal.targetAmount) * 100, 100);
  });

  // Return average progress across all goals
  return goalProgresses.reduce((sum, p) => sum + p, 0) / goalProgresses.length;
}
