import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// Frequency multipliers to normalize to monthly amounts
function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY": return amount;
    case "BIWEEKLY": return (amount * 26) / 12;
    case "WEEKLY": return (amount * 52) / 12;
    case "ANNUAL": return amount / 12;
    case "ONE_TIME": return 0; // Not recurring
    default: return amount;
  }
}

// GET /api/budget?scenarioId=X&month=YYYY-MM
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");
  const month = searchParams.get("month"); // YYYY-MM

  if (!scenarioId || !month) {
    return NextResponse.json({ error: "scenarioId and month are required" }, { status: 400 });
  }

  // Verify ownership
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Get all planned expenses for this scenario
  const expenses = await prisma.expense.findMany({
    where: { scenarioId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Parse the month to check if expenses are active during this period
  const [yearStr, monthStr] = month.split("-");
  const monthStart = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const monthEnd = new Date(parseInt(yearStr), parseInt(monthStr), 0); // last day of month

  // Group planned expenses by category, normalized to monthly amounts
  const plannedByCategory: Record<string, { planned: number; names: string[] }> = {};
  for (const exp of expenses) {
    // Check if expense is active in this month
    const startDate = new Date(exp.startDate);
    const endDate = exp.endDate ? new Date(exp.endDate) : null;

    if (startDate > monthEnd) continue; // hasn't started yet
    if (endDate && endDate < monthStart) continue; // already ended
    if (exp.frequency === "ONE_TIME") continue; // skip one-time expenses from budget view

    const cat = exp.category || "Uncategorized";
    if (!plannedByCategory[cat]) {
      plannedByCategory[cat] = { planned: 0, names: [] };
    }
    plannedByCategory[cat].planned += toMonthly(exp.amount, exp.frequency);
    plannedByCategory[cat].names.push(exp.name);
  }

  // Get actual expenses for this month
  const actuals = await prisma.actualExpense.findMany({
    where: { scenarioId, month },
  });

  const actualByCategory: Record<string, { actual: number; notes: string | null; id: string }> = {};
  for (const a of actuals) {
    actualByCategory[a.category] = { actual: a.amount, notes: a.notes, id: a.id };
  }

  // Merge into rows
  const allCategories = new Set([...Object.keys(plannedByCategory), ...Object.keys(actualByCategory)]);
  const rows = Array.from(allCategories).sort().map((category) => {
    const planned = plannedByCategory[category]?.planned ?? 0;
    const actual = actualByCategory[category]?.actual ?? 0;
    const variance = planned - actual;
    return {
      category,
      planned: Math.round(planned * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      names: plannedByCategory[category]?.names ?? [],
      notes: actualByCategory[category]?.notes ?? null,
      actualId: actualByCategory[category]?.id ?? null,
    };
  });

  return NextResponse.json({ rows, month });
}

// POST /api/budget - Bulk upsert actual expenses
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scenarioId, month, entries } = body as {
    scenarioId: string;
    month: string;
    entries: Array<{ category: string; amount: number; notes?: string }>;
  };

  if (!scenarioId || !month || !Array.isArray(entries)) {
    return NextResponse.json({ error: "scenarioId, month, and entries are required" }, { status: 400 });
  }

  // Verify ownership
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Bulk upsert
  await prisma.$transaction(
    entries
      .filter((e) => e.amount > 0)
      .map((entry) =>
        prisma.actualExpense.upsert({
          where: {
            scenarioId_category_month: {
              scenarioId,
              category: entry.category,
              month,
            },
          },
          create: {
            scenarioId,
            category: entry.category,
            amount: entry.amount,
            month,
            notes: entry.notes ?? null,
          },
          update: {
            amount: entry.amount,
            notes: entry.notes ?? null,
          },
        })
      )
  );

  // Delete entries with 0 amount
  const zeroCategories = entries.filter((e) => e.amount <= 0).map((e) => e.category);
  if (zeroCategories.length > 0) {
    await prisma.actualExpense.deleteMany({
      where: {
        scenarioId,
        month,
        category: { in: zeroCategories },
      },
    });
  }

  return NextResponse.json({ success: true });
}
