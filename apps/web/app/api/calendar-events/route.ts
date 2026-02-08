import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

interface CalendarEvent {
  id: string;
  date: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "LOAN_PAYOFF" | "GOAL" | "LIFE_EVENT";
  amount?: number;
  color: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenarioId");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!scenarioId) {
      return NextResponse.json(
        { error: "Scenario ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        household: {
          ownerUserId: user.id,
        },
      },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found or access denied" },
        { status: 404 }
      );
    }

    // Parse year and month, default to current
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

    // Calculate month boundaries
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Query all data in parallel
    const [incomes, expenses, loans, goals, lifeEvents] = await Promise.all([
      prisma.income.findMany({
        where: { scenarioId },
        select: {
          id: true,
          name: true,
          amount: true,
          startDate: true,
          endDate: true,
        },
      }),
      prisma.expense.findMany({
        where: { scenarioId },
        select: {
          id: true,
          name: true,
          amount: true,
          category: true,
          startDate: true,
          endDate: true,
        },
      }),
      prisma.loan.findMany({
        where: { scenarioId },
        select: {
          id: true,
          name: true,
          startDate: true,
          termMonths: true,
          monthlyPayment: true,
        },
      }),
      prisma.goal.findMany({
        where: { scenarioId },
        select: {
          id: true,
          name: true,
          targetAmount: true,
          targetDate: true,
          type: true,
        },
      }),
      prisma.lifeEvent.findMany({
        where: { scenarioId },
        select: {
          id: true,
          name: true,
          targetDate: true,
          color: true,
          type: true,
        },
      }),
    ]);

    const events: CalendarEvent[] = [];

    // Helper to check if date is within month
    const isWithinMonth = (date: Date): boolean => {
      return date >= monthStart && date <= monthEnd;
    };

    // Transform incomes
    incomes.forEach((income) => {
      if (isWithinMonth(income.startDate)) {
        events.push({
          id: `income-start-${income.id}`,
          date: income.startDate.toISOString(),
          name: `${income.name} starts`,
          type: "INCOME",
          amount: income.amount,
          color: "emerald",
        });
      }
      if (income.endDate && isWithinMonth(income.endDate)) {
        events.push({
          id: `income-end-${income.id}`,
          date: income.endDate.toISOString(),
          name: `${income.name} ends`,
          type: "INCOME",
          color: "emerald",
        });
      }
    });

    // Transform expenses
    expenses.forEach((expense) => {
      if (isWithinMonth(expense.startDate)) {
        events.push({
          id: `expense-start-${expense.id}`,
          date: expense.startDate.toISOString(),
          name: `${expense.name} starts`,
          type: "EXPENSE",
          amount: expense.amount,
          color: "red",
        });
      }
      if (expense.endDate && isWithinMonth(expense.endDate)) {
        events.push({
          id: `expense-end-${expense.id}`,
          date: expense.endDate.toISOString(),
          name: `${expense.name} ends`,
          type: "EXPENSE",
          color: "red",
        });
      }
    });

    // Transform loans (calculate payoff date)
    loans.forEach((loan) => {
      const payoffDate = new Date(
        loan.startDate.getTime() + loan.termMonths * 30.44 * 24 * 60 * 60 * 1000
      );
      if (isWithinMonth(payoffDate)) {
        events.push({
          id: `loan-payoff-${loan.id}`,
          date: payoffDate.toISOString(),
          name: `${loan.name} payoff`,
          type: "LOAN_PAYOFF",
          color: "amber",
        });
      }
    });

    // Transform goals
    goals.forEach((goal) => {
      if (goal.targetDate && isWithinMonth(goal.targetDate)) {
        events.push({
          id: `goal-${goal.id}`,
          date: goal.targetDate.toISOString(),
          name: `${goal.name} deadline`,
          type: "GOAL",
          amount: goal.targetAmount,
          color: "blue",
        });
      }
    });

    // Transform life events
    lifeEvents.forEach((lifeEvent) => {
      if (isWithinMonth(lifeEvent.targetDate)) {
        events.push({
          id: `life-event-${lifeEvent.id}`,
          date: lifeEvent.targetDate.toISOString(),
          name: lifeEvent.name,
          type: "LIFE_EVENT",
          color: lifeEvent.color || "purple",
        });
      }
    });

    return NextResponse.json({
      events,
      month,
      year,
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
