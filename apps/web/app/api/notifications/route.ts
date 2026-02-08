import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createHash } from "crypto";

interface Alert {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  actionHref?: string;
  priority: number;
}

function makeAlertId(parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 12);
}

// Frequency multipliers to normalize to annual amounts
const frequencyToAnnual: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

// Normalize any frequency to a monthly amount
function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "BIWEEKLY":
      return (amount * 26) / 12;
    case "WEEKLY":
      return (amount * 52) / 12;
    case "ANNUAL":
      return amount / 12;
    case "ONE_TIME":
      return 0;
    default:
      return amount;
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
    return NextResponse.json(
      { error: "scenarioId is required" },
      { status: 400 }
    );
  }

  // Verify user owns the scenario through household
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json(
      { error: "Scenario not found" },
      { status: 404 }
    );
  }

  const alerts: Alert[] = [];

  // -------------------------------------------------------
  // 1. Budget overspend: compare actuals vs planned by category
  // -------------------------------------------------------
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenses = await prisma.expense.findMany({
    where: { scenarioId },
  });

  // Build planned monthly budget by category
  const plannedByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const startDate = new Date(exp.startDate);
    const endDate = exp.endDate ? new Date(exp.endDate) : null;

    if (startDate > monthEnd) continue;
    if (endDate && endDate < monthStart) continue;
    if (exp.frequency === "ONE_TIME") continue;

    const cat = exp.category || "Uncategorized";
    plannedByCategory[cat] = (plannedByCategory[cat] || 0) + toMonthly(exp.amount, exp.frequency);
  }

  // Get actual expenses for current month
  const actuals = await prisma.actualExpense.findMany({
    where: { scenarioId, month: currentMonth },
  });

  for (const actual of actuals) {
    const planned = plannedByCategory[actual.category];
    if (planned && planned > 0) {
      const pctUsed = actual.amount / planned;
      if (pctUsed > 0.9) {
        const overUnder = pctUsed >= 1 ? "over budget" : "at 90%+ of budget";
        alerts.push({
          id: makeAlertId(["budget", scenarioId, actual.category, currentMonth]),
          type: "warning",
          title: `${actual.category} ${overUnder}`,
          description: `You've spent $${Math.round(actual.amount).toLocaleString()} of $${Math.round(planned).toLocaleString()} budgeted (${Math.round(pctUsed * 100)}%).`,
          actionHref: "/budget",
          priority: pctUsed >= 1 ? 90 : 70,
        });
      }
    }
  }

  // -------------------------------------------------------
  // 2. Goal milestones: check progress toward target amounts
  // -------------------------------------------------------
  const goals = await prisma.goal.findMany({
    where: { scenarioId },
  });

  // Total liquid assets to measure against goals
  const accounts = await prisma.account.findMany({
    where: { scenarioId },
  });

  const totalSavings = accounts.reduce((sum, a) => sum + a.balance, 0);

  for (const goal of goals) {
    if (goal.targetAmount <= 0) continue;
    const progress = totalSavings / goal.targetAmount;
    const milestones = [1.0, 0.75, 0.5, 0.25];
    for (const milestone of milestones) {
      if (progress >= milestone) {
        const pct = Math.round(milestone * 100);
        alerts.push({
          id: makeAlertId(["goal", scenarioId, goal.id, String(pct)]),
          type: "success",
          title: `${goal.name}: ${pct}% reached`,
          description: `You've saved $${Math.round(totalSavings).toLocaleString()} toward your $${Math.round(goal.targetAmount).toLocaleString()} goal.`,
          actionHref: "/goals",
          priority: pct === 100 ? 80 : 30,
        });
        break; // Only show highest milestone
      }
    }
  }

  // -------------------------------------------------------
  // 3. Emergency fund: liquid assets / monthly expenses
  // -------------------------------------------------------
  const liquidAccounts = accounts.filter((a) => a.type === "SAVINGS");
  const liquidAssets = liquidAccounts.reduce((sum, a) => sum + a.balance, 0);

  const totalMonthlyExpenses = expenses.reduce((sum, e) => {
    return sum + toMonthly(e.amount, e.frequency);
  }, 0);

  if (totalMonthlyExpenses > 0) {
    const emergencyMonths = liquidAssets / totalMonthlyExpenses;
    if (emergencyMonths < 3) {
      const shortfall = totalMonthlyExpenses * 3 - liquidAssets;
      alerts.push({
        id: makeAlertId(["emergency", scenarioId]),
        type: "warning",
        title: "Emergency fund below 3 months",
        description: `You have ${emergencyMonths.toFixed(1)} months of expenses saved. Consider adding $${Math.round(shortfall).toLocaleString()} to reach 3 months.`,
        actionHref: "/accounts",
        priority: emergencyMonths < 1 ? 95 : 75,
      });
    }
  }

  // -------------------------------------------------------
  // 4. High DTI: annual loan payments / annual income > 36%
  // -------------------------------------------------------
  const loans = await prisma.loan.findMany({
    where: { scenarioId },
  });

  const incomes = await prisma.income.findMany({
    where: { scenarioId },
  });

  const annualLoanPayments = loans.reduce((sum, loan) => {
    return sum + loan.monthlyPayment * 12;
  }, 0);

  const totalAnnualIncome = incomes.reduce((sum, inc) => {
    const mult = frequencyToAnnual[inc.frequency] ?? 1;
    return sum + inc.amount * mult;
  }, 0);

  if (totalAnnualIncome > 0) {
    const dti = annualLoanPayments / totalAnnualIncome;
    if (dti > 0.36) {
      alerts.push({
        id: makeAlertId(["dti", scenarioId]),
        type: "warning",
        title: "High debt-to-income ratio",
        description: `Your DTI is ${Math.round(dti * 100)}%, which exceeds the recommended 36% threshold. Consider paying down debt.`,
        actionHref: "/loans",
        priority: dti > 0.5 ? 95 : 85,
      });
    }
  }

  // -------------------------------------------------------
  // 5. Large upcoming one-time expenses in next 30 days
  // -------------------------------------------------------
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingOneTime = expenses.filter((e) => {
    if (e.frequency !== "ONE_TIME") return false;
    const start = new Date(e.startDate);
    return start >= now && start <= thirtyDaysFromNow;
  });

  for (const expense of upcomingOneTime) {
    const daysUntil = Math.ceil(
      (new Date(expense.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    alerts.push({
      id: makeAlertId(["upcoming", scenarioId, expense.id]),
      type: "info",
      title: `Upcoming: ${expense.name}`,
      description: `$${Math.round(expense.amount).toLocaleString()} expense in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
      actionHref: "/expenses",
      priority: 60,
    });
  }

  // Sort by priority descending
  alerts.sort((a, b) => b.priority - a.priority);

  return NextResponse.json({ alerts, count: alerts.length });
}
