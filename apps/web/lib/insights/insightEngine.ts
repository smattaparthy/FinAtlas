import { prisma } from "@/lib/db/prisma";

export interface InsightData {
  type: string;
  severity: "INFO" | "WARNING" | "POSITIVE" | "ACTION_NEEDED";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  ANNUAL: 1,
  MONTHLY: 12,
  BIWEEKLY: 26,
  WEEKLY: 52,
  ONE_TIME: 0,
};

/**
 * Generate all insights for a scenario.
 */
export async function generateInsights(
  scenarioId: string,
  userId: string
): Promise<InsightData[]> {
  const insights: InsightData[] = [];

  try {
    // Fetch all data we need
    const [incomes, expenses, accounts, loans, goals, lifeEvents, actualExpenses] = await Promise.all([
      prisma.income.findMany({
        where: { scenarioId },
        select: { amount: true, frequency: true, name: true },
      }),
      prisma.expense.findMany({
        where: { scenarioId },
        select: { amount: true, frequency: true, name: true, category: true },
      }),
      prisma.account.findMany({
        where: { scenarioId },
        select: { balance: true, name: true },
      }),
      prisma.loan.findMany({
        where: { scenarioId },
        select: {
          name: true,
          currentBalance: true,
          principal: true,
          interestRate: true,
        },
      }),
      prisma.goal.findMany({
        where: { scenarioId },
        select: { name: true, targetAmount: true, targetDate: true },
      }),
      prisma.lifeEvent.findMany({
        where: { scenarioId },
        select: { name: true, targetDate: true, type: true },
      }),
      prisma.actualExpense.findMany({
        where: { scenarioId },
        orderBy: { month: "desc" },
        take: 12,
      }),
    ]);

    // Run all analyzers
    insights.push(...analyzeSpendingTrends(expenses, actualExpenses));
    insights.push(...analyzeSavingsRate(incomes, expenses));
    insights.push(...analyzeGoalProgress(goals, accounts, incomes, expenses));
    insights.push(...analyzeDebtMilestones(loans));
    insights.push(...analyzeNetWorthChange(scenarioId));
    insights.push(...analyzeBudgetAdherence(expenses, actualExpenses));
    insights.push(...analyzeUpcomingEvents(lifeEvents));
  } catch (error) {
    console.error("Error generating insights:", error);
  }

  return insights;
}

/**
 * Compare current month's expenses vs 3-month rolling average.
 */
function analyzeSpendingTrends(
  expenses: Array<{ amount: number; frequency: string; name: string; category: string | null }>,
  actualExpenses: Array<{ month: string; amount: number; category: string }>
): InsightData[] {
  const insights: InsightData[] = [];

  // If we don't have actual expense data, compare planned expenses
  if (actualExpenses.length === 0) {
    return insights;
  }

  // Group by month
  const monthlyTotals = actualExpenses.reduce((acc, exp) => {
    acc[exp.month] = (acc[exp.month] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const months = Object.keys(monthlyTotals).sort();
  if (months.length < 2) return insights;

  const currentMonth = months[months.length - 1];
  const currentTotal = monthlyTotals[currentMonth];

  // Calculate 3-month average (excluding current month)
  const previousMonths = months.slice(Math.max(0, months.length - 4), months.length - 1);
  if (previousMonths.length === 0) return insights;

  const avgTotal =
    previousMonths.reduce((sum, m) => sum + monthlyTotals[m], 0) / previousMonths.length;

  const changePercent = ((currentTotal - avgTotal) / avgTotal) * 100;

  if (changePercent > 15) {
    insights.push({
      type: "SPENDING_SPIKE",
      severity: "WARNING",
      title: "Spending Increased",
      message: `Your spending in ${currentMonth} was ${changePercent.toFixed(0)}% higher than your 3-month average.`,
      data: { currentTotal, avgTotal, changePercent },
    });
  } else if (changePercent < -15) {
    insights.push({
      type: "SPENDING_SPIKE",
      severity: "POSITIVE",
      title: "Spending Decreased",
      message: `Great job! Your spending in ${currentMonth} was ${Math.abs(changePercent).toFixed(0)}% lower than your 3-month average.`,
      data: { currentTotal, avgTotal, changePercent },
    });
  }

  return insights;
}

/**
 * Calculate savings rate and flag if below 20% or above 30%.
 */
function analyzeSavingsRate(
  incomes: Array<{ amount: number; frequency: string }>,
  expenses: Array<{ amount: number; frequency: string }>
): InsightData[] {
  const insights: InsightData[] = [];

  const totalAnnualIncome = incomes.reduce((sum, i) => {
    const multiplier = FREQUENCY_MULTIPLIERS[i.frequency] ?? 1;
    return sum + i.amount * multiplier;
  }, 0);

  const totalAnnualExpenses = expenses.reduce((sum, e) => {
    const multiplier = FREQUENCY_MULTIPLIERS[e.frequency] ?? 1;
    return sum + e.amount * multiplier;
  }, 0);

  if (totalAnnualIncome === 0) return insights;

  const savingsRate = ((totalAnnualIncome - totalAnnualExpenses) / totalAnnualIncome) * 100;

  if (savingsRate < 20) {
    insights.push({
      type: "SAVINGS_RATE",
      severity: "WARNING",
      title: "Low Savings Rate",
      message: `You're saving ${savingsRate.toFixed(1)}% of your income. Financial experts recommend 20% or more.`,
      data: { savingsRate, totalAnnualIncome, totalAnnualExpenses },
    });
  } else if (savingsRate >= 30) {
    insights.push({
      type: "SAVINGS_RATE",
      severity: "POSITIVE",
      title: "Excellent Savings Rate",
      message: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep up the great work!`,
      data: { savingsRate, totalAnnualIncome, totalAnnualExpenses },
    });
  }

  return insights;
}

/**
 * Check if goals are on track based on current savings rate.
 */
function analyzeGoalProgress(
  goals: Array<{ name: string; targetAmount: number; targetDate: Date | null }>,
  accounts: Array<{ balance: number }>,
  incomes: Array<{ amount: number; frequency: string }>,
  expenses: Array<{ amount: number; frequency: string }>
): InsightData[] {
  const insights: InsightData[] = [];

  if (goals.length === 0) return insights;

  const totalAnnualIncome = incomes.reduce((sum, i) => {
    const multiplier = FREQUENCY_MULTIPLIERS[i.frequency] ?? 1;
    return sum + i.amount * multiplier;
  }, 0);

  const totalAnnualExpenses = expenses.reduce((sum, e) => {
    const multiplier = FREQUENCY_MULTIPLIERS[e.frequency] ?? 1;
    return sum + e.amount * multiplier;
  }, 0);

  const currentNetWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const annualSavings = totalAnnualIncome - totalAnnualExpenses;

  for (const goal of goals) {
    if (!goal.targetDate) continue;

    const yearsToGoal = Math.max(
      0,
      (goal.targetDate.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (yearsToGoal === 0) continue;

    // Simple projection: current net worth + (annual savings * years)
    const projectedAmount = currentNetWorth + annualSavings * yearsToGoal * 0.9; // 10% buffer
    const progress = (projectedAmount / goal.targetAmount) * 100;

    if (progress < 80) {
      insights.push({
        type: "GOAL_PROGRESS",
        severity: "WARNING",
        title: `Goal Behind Schedule: ${goal.name}`,
        message: `At your current savings rate, you're projected to reach ${progress.toFixed(0)}% of your "${goal.name}" goal by the target date.`,
        data: { goalName: goal.name, progress, yearsToGoal },
      });
    } else if (progress >= 100) {
      insights.push({
        type: "GOAL_PROGRESS",
        severity: "POSITIVE",
        title: `Goal On Track: ${goal.name}`,
        message: `You're on track to exceed your "${goal.name}" goal! Projected progress: ${progress.toFixed(0)}%.`,
        data: { goalName: goal.name, progress, yearsToGoal },
      });
    }
  }

  return insights;
}

/**
 * Flag loans within 10% of payoff or with high interest rates.
 */
function analyzeDebtMilestones(
  loans: Array<{ name: string; currentBalance: number; principal: number; interestRate: number }>
): InsightData[] {
  const insights: InsightData[] = [];

  for (const loan of loans) {
    const percentPaid = loan.principal > 0 ? ((loan.principal - loan.currentBalance) / loan.principal) * 100 : 0;

    if (percentPaid >= 90) {
      insights.push({
        type: "DEBT_MILESTONE",
        severity: "POSITIVE",
        title: `Almost Paid Off: ${loan.name}`,
        message: `You've paid off ${percentPaid.toFixed(0)}% of your ${loan.name}. You're almost debt-free on this loan!`,
        data: { loanName: loan.name, percentPaid },
      });
    }

    if (loan.interestRate > 0.08) {
      insights.push({
        type: "DEBT_MILESTONE",
        severity: "ACTION_NEEDED",
        title: `High Interest Rate: ${loan.name}`,
        message: `Your ${loan.name} has an interest rate of ${(loan.interestRate * 100).toFixed(1)}%. Consider refinancing or prioritizing payoff.`,
        data: { loanName: loan.name, interestRate: loan.interestRate },
      });
    }
  }

  return insights;
}

/**
 * Compare current net worth to 3 months ago (requires net worth snapshots).
 */
function analyzeNetWorthChange(scenarioId: string): InsightData[] {
  // This would require fetching NetWorthSnapshot records
  // For now, we'll return empty and implement when snapshots are available
  return [];
}

/**
 * Compare actual expenses to budgeted amounts.
 */
function analyzeBudgetAdherence(
  expenses: Array<{ amount: number; frequency: string; category: string | null }>,
  actualExpenses: Array<{ month: string; amount: number; category: string }>
): InsightData[] {
  const insights: InsightData[] = [];

  if (actualExpenses.length === 0) return insights;

  // Calculate monthly budget per category
  const budgetByCategory = expenses.reduce((acc, exp) => {
    const category = exp.category || "Uncategorized";
    const multiplier = FREQUENCY_MULTIPLIERS[exp.frequency] ?? 1;
    const monthlyAmount = (exp.amount * multiplier) / 12;
    acc[category] = (acc[category] || 0) + monthlyAmount;
    return acc;
  }, {} as Record<string, number>);

  // Get latest month's actuals
  const latestMonth = actualExpenses.reduce((latest, exp) =>
    exp.month > latest ? exp.month : latest, actualExpenses[0].month
  );

  const actualsByCategory = actualExpenses
    .filter((exp) => exp.month === latestMonth)
    .reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

  // Check for overspending
  for (const [category, budgeted] of Object.entries(budgetByCategory)) {
    const actual = actualsByCategory[category] || 0;
    if (actual > budgeted * 1.2) {
      // 20% over budget
      const overPercent = ((actual - budgeted) / budgeted) * 100;
      insights.push({
        type: "BUDGET_ALERT",
        severity: "WARNING",
        title: `Over Budget: ${category}`,
        message: `You spent ${overPercent.toFixed(0)}% more than budgeted in ${category} for ${latestMonth}.`,
        data: { category, budgeted, actual, overPercent },
      });
    }
  }

  return insights;
}

/**
 * Flag life events in the next 90 days.
 */
function analyzeUpcomingEvents(
  lifeEvents: Array<{ name: string; targetDate: Date; type: string }>
): InsightData[] {
  const insights: InsightData[] = [];

  const now = Date.now();
  const ninetyDaysFromNow = now + 90 * 24 * 60 * 60 * 1000;

  for (const event of lifeEvents) {
    const eventTime = event.targetDate.getTime();
    if (eventTime >= now && eventTime <= ninetyDaysFromNow) {
      const daysUntil = Math.ceil((eventTime - now) / (24 * 60 * 60 * 1000));
      insights.push({
        type: "UPCOMING_EVENT",
        severity: "INFO",
        title: `Upcoming: ${event.name}`,
        message: `Your life event "${event.name}" is ${daysUntil} days away. Make sure your financial plans are ready.`,
        data: { eventName: event.name, daysUntil, eventType: event.type },
        expiresAt: event.targetDate,
      });
    }
  }

  return insights;
}
