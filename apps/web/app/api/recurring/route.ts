import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Frequency = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "ANNUAL";

function toMonthlyEquivalent(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "ANNUAL":
      return amount / 12;
    case "MONTHLY":
      return amount;
    case "BIWEEKLY":
      return (amount * 26) / 12;
    case "WEEKLY":
      return (amount * 52) / 12;
    default:
      return amount;
  }
}

function computeNextOccurrence(
  startDate: Date,
  endDate: Date | null,
  frequency: Frequency
): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If endDate is in the past, no next occurrence
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < now) return null;
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // If start is in the future, that is the next occurrence
  if (start >= now) {
    return start.toISOString().split("T")[0];
  }

  let next: Date;

  switch (frequency) {
    case "MONTHLY": {
      // Same day of current month or next month
      next = new Date(now.getFullYear(), now.getMonth(), start.getDate());
      if (next < now) {
        next = new Date(now.getFullYear(), now.getMonth() + 1, start.getDate());
      }
      break;
    }
    case "BIWEEKLY": {
      // Every 14 days from startDate
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const periodsPassed = Math.floor(diffDays / 14);
      next = new Date(start.getTime() + (periodsPassed + 1) * 14 * 24 * 60 * 60 * 1000);
      // If the calculated date is still before today, advance one more period
      if (next < now) {
        next = new Date(next.getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "WEEKLY": {
      // Every 7 days from startDate
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const periodsPassed = Math.floor(diffDays / 7);
      next = new Date(start.getTime() + (periodsPassed + 1) * 7 * 24 * 60 * 60 * 1000);
      if (next < now) {
        next = new Date(next.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "ANNUAL": {
      // Same month/day this year or next
      next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
      if (next < now) {
        next = new Date(now.getFullYear() + 1, start.getMonth(), start.getDate());
      }
      break;
    }
    default:
      return null;
  }

  // Check against endDate
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (next > end) return null;
  }

  return next.toISOString().split("T")[0];
}

function getOccurrencesInNext30Days(
  startDate: Date,
  endDate: Date | null,
  frequency: Frequency
): Date[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : null;
  if (end) end.setHours(0, 0, 0, 0);

  // If endDate is in the past, no occurrences
  if (end && end < now) return [];

  const occurrences: Date[] = [];

  switch (frequency) {
    case "MONTHLY": {
      // Check current month and next month
      for (let m = 0; m <= 1; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() + m, start.getDate());
        if (d >= now && d <= thirtyDaysLater) {
          if (!end || d <= end) {
            occurrences.push(d);
          }
        }
      }
      break;
    }
    case "BIWEEKLY": {
      // Find first occurrence on or after today
      let current: Date;
      if (start >= now) {
        current = new Date(start);
      } else {
        const diffMs = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const periodsPassed = Math.ceil(diffDays / 14);
        current = new Date(start.getTime() + periodsPassed * 14 * 24 * 60 * 60 * 1000);
        if (current < now) {
          current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
        }
      }
      while (current <= thirtyDaysLater) {
        if (!end || current <= end) {
          occurrences.push(new Date(current));
        }
        current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "WEEKLY": {
      let current: Date;
      if (start >= now) {
        current = new Date(start);
      } else {
        const diffMs = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const periodsPassed = Math.ceil(diffDays / 7);
        current = new Date(start.getTime() + periodsPassed * 7 * 24 * 60 * 60 * 1000);
        if (current < now) {
          current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }
      while (current <= thirtyDaysLater) {
        if (!end || current <= end) {
          occurrences.push(new Date(current));
        }
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case "ANNUAL": {
      const d = new Date(now.getFullYear(), start.getMonth(), start.getDate());
      if (d >= now && d <= thirtyDaysLater) {
        if (!end || d <= end) {
          occurrences.push(d);
        }
      }
      break;
    }
  }

  return occurrences;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenarioId = req.nextUrl.searchParams.get("scenarioId");
    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId required" }, { status: 400 });
    }

    const scenario = await prisma.scenario.findFirst({
      where: { id: scenarioId, household: { ownerUserId: user.id } },
    });
    if (!scenario) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({
        where: { scenarioId, NOT: { frequency: "ONE_TIME" } },
      }),
      prisma.expense.findMany({
        where: { scenarioId, NOT: { frequency: "ONE_TIME" } },
      }),
    ]);

    type RecurringItem = {
      id: string;
      name: string;
      type: "INCOME" | "EXPENSE";
      amount: number;
      frequency: Frequency;
      monthlyEquivalent: number;
      nextOccurrence: string | null;
      category: string | null;
      startDate: string;
      endDate: string | null;
      editUrl: string;
    };

    const items: RecurringItem[] = [];

    for (const income of incomes) {
      const freq = income.frequency as Frequency;
      items.push({
        id: income.id,
        name: income.name,
        type: "INCOME",
        amount: income.amount,
        frequency: freq,
        monthlyEquivalent: toMonthlyEquivalent(income.amount, freq),
        nextOccurrence: computeNextOccurrence(income.startDate, income.endDate, freq),
        category: null,
        startDate: income.startDate.toISOString().split("T")[0],
        endDate: income.endDate ? income.endDate.toISOString().split("T")[0] : null,
        editUrl: `/incomes/${income.id}/edit`,
      });
    }

    for (const expense of expenses) {
      const freq = expense.frequency as Frequency;
      items.push({
        id: expense.id,
        name: expense.name,
        type: "EXPENSE",
        amount: expense.amount,
        frequency: freq,
        monthlyEquivalent: toMonthlyEquivalent(expense.amount, freq),
        nextOccurrence: computeNextOccurrence(expense.startDate, expense.endDate, freq),
        category: expense.category,
        startDate: expense.startDate.toISOString().split("T")[0],
        endDate: expense.endDate ? expense.endDate.toISOString().split("T")[0] : null,
        editUrl: `/expenses/${expense.id}/edit`,
      });
    }

    // Compute summary
    const totalMonthlyInflows = items
      .filter((i) => i.type === "INCOME")
      .reduce((sum, i) => sum + i.monthlyEquivalent, 0);

    const totalMonthlyOutflows = items
      .filter((i) => i.type === "EXPENSE")
      .reduce((sum, i) => sum + i.monthlyEquivalent, 0);

    const netMonthly = totalMonthlyInflows - totalMonthlyOutflows;

    // Compute upcoming 30-day events
    type UpcomingEvent = {
      date: string;
      name: string;
      amount: number;
      type: "INCOME" | "EXPENSE";
    };

    const upcoming: UpcomingEvent[] = [];

    for (const income of incomes) {
      const freq = income.frequency as Frequency;
      const occurrences = getOccurrencesInNext30Days(income.startDate, income.endDate, freq);
      for (const occ of occurrences) {
        upcoming.push({
          date: occ.toISOString().split("T")[0],
          name: income.name,
          amount: income.amount,
          type: "INCOME",
        });
      }
    }

    for (const expense of expenses) {
      const freq = expense.frequency as Frequency;
      const occurrences = getOccurrencesInNext30Days(expense.startDate, expense.endDate, freq);
      for (const occ of occurrences) {
        upcoming.push({
          date: occ.toISOString().split("T")[0],
          name: expense.name,
          amount: expense.amount,
          type: "EXPENSE",
        });
      }
    }

    // Sort upcoming by date
    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      items,
      summary: {
        totalMonthlyInflows,
        totalMonthlyOutflows,
        netMonthly,
      },
      upcoming,
    });
  } catch (error) {
    console.error("Error fetching recurring items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
