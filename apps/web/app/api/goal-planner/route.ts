import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const frequencyMultipliers: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

function getPriorityWeight(priority: number): number {
  if (priority === 1) return 3;
  if (priority === 2) return 2;
  return 1;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json(
      { error: "scenarioId required" },
      { status: 400 }
    );
  }

  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, household: { ownerUserId: user.id } },
  });
  if (!scenario) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  try {
    const [goals, incomes, expenses, accounts, loans] = await Promise.all([
      prisma.goal.findMany({ where: { scenarioId }, orderBy: [{ priority: "asc" }] }),
      prisma.income.findMany({ where: { scenarioId } }),
      prisma.expense.findMany({ where: { scenarioId } }),
      prisma.account.findMany({ where: { scenarioId } }),
      prisma.loan.findMany({ where: { scenarioId } }),
    ]);

    const totalAnnualIncome = incomes.reduce((sum, i) => {
      const multiplier = frequencyMultipliers[i.frequency] ?? 1;
      return sum + i.amount * multiplier;
    }, 0);

    const totalAnnualExpenses = expenses.reduce((sum, e) => {
      const multiplier = frequencyMultipliers[e.frequency] ?? 1;
      return sum + e.amount * multiplier;
    }, 0);

    const totalLoanPayments = loans.reduce(
      (sum, l) => sum + l.monthlyPayment * 12,
      0
    );

    const estimatedTaxes = totalAnnualIncome * 0.25;

    const annualSavings =
      totalAnnualIncome - totalAnnualExpenses - totalLoanPayments - estimatedTaxes;

    const monthlySavingsAvailable = Math.max(annualSavings / 12, 0);

    const currentSavings = accounts.reduce((sum, a) => sum + a.balance, 0);

    // Calculate priority weights for allocation
    const totalWeight = goals.reduce(
      (sum, g) => sum + getPriorityWeight(g.priority),
      0
    );

    const monthlyGrowthRate = 0.005; // 6% annual

    const goalResults = goals.map((goal) => {
      const weight = getPriorityWeight(goal.priority);
      const allocatedSavings =
        totalWeight > 0 ? currentSavings * (weight / totalWeight) : 0;

      if (!goal.targetDate) {
        return {
          id: goal.id,
          name: goal.name,
          type: goal.type,
          targetAmount: goal.targetAmount,
          targetDate: null,
          priority: goal.priority,
          monthsRemaining: null,
          allocatedSavings,
          requiredMonthly: null,
          onTrack: false,
          projectedCompletionMonths: null,
        };
      }

      const now = new Date();
      const target = new Date(goal.targetDate);
      const monthsRemaining = Math.max(
        Math.ceil(
          (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        ),
        1
      );

      const r = monthlyGrowthRate;
      const n = monthsRemaining;

      // Future value of allocated savings with compound growth
      const fvAllocated = allocatedSavings * Math.pow(1 + r, n);

      // Remaining amount needed after growth on allocated savings
      const remaining = goal.targetAmount - fvAllocated;

      let requiredMonthly: number;
      if (remaining <= 0) {
        requiredMonthly = 0;
      } else {
        // PMT formula: remaining / (((1+r)^n - 1) / r)
        const fvAnnuityFactor = (Math.pow(1 + r, n) - 1) / r;
        requiredMonthly = remaining / fvAnnuityFactor;
      }

      // Determine on-track status
      const allocatedMonthlyBudget =
        totalWeight > 0
          ? monthlySavingsAvailable * (weight / totalWeight)
          : 0;
      const onTrack = requiredMonthly <= allocatedMonthlyBudget;

      // Projected completion: solve for months needed at current contribution rate
      let projectedCompletionMonths: number | null = null;
      if (allocatedMonthlyBudget > 0 && requiredMonthly > 0) {
        // FV = allocatedSavings*(1+r)^m + contribution*(((1+r)^m - 1)/r) = targetAmount
        // Solve iteratively
        let balance = allocatedSavings;
        let months = 0;
        const maxMonths = 600; // 50-year cap
        while (balance < goal.targetAmount && months < maxMonths) {
          balance = balance * (1 + r) + allocatedMonthlyBudget;
          months++;
        }
        projectedCompletionMonths = months < maxMonths ? months : null;
      }

      return {
        id: goal.id,
        name: goal.name,
        type: goal.type,
        targetAmount: goal.targetAmount,
        targetDate: goal.targetDate.toISOString(),
        priority: goal.priority,
        monthsRemaining,
        allocatedSavings,
        requiredMonthly: Math.round(requiredMonthly * 100) / 100,
        onTrack,
        projectedCompletionMonths,
      };
    });

    const totalMonthlyNeeded = goalResults.reduce(
      (sum, g) => sum + (g.requiredMonthly ?? 0),
      0
    );

    const totalTargetAmount = goalResults.reduce(
      (sum, g) => sum + g.targetAmount,
      0
    );

    const totalAllocatedSavings = goalResults.reduce(
      (sum, g) => sum + g.allocatedSavings,
      0
    );

    return NextResponse.json({
      goals: goalResults,
      summary: {
        totalMonthlyNeeded: Math.round(totalMonthlyNeeded * 100) / 100,
        monthlySavingsAvailable:
          Math.round(monthlySavingsAvailable * 100) / 100,
        fundingGap:
          Math.round(
            (totalMonthlyNeeded - monthlySavingsAvailable) * 100
          ) / 100,
        totalTargetAmount,
        totalAllocatedSavings:
          Math.round(totalAllocatedSavings * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Failed to compute goal planner:", error);
    return NextResponse.json(
      { error: "Failed to compute goal planner" },
      { status: 500 }
    );
  }
}
