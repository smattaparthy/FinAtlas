import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// GET /api/spending-trends?scenarioId=X&months=12
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");
  const monthsParam = searchParams.get("months");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
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

  // Parse months parameter (default 12, clamp 1-24)
  const months = Math.max(1, Math.min(24, parseInt(monthsParam || "12") || 12));

  // Generate list of past N months as YYYY-MM strings
  const now = new Date();
  const monthList: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthList.push(monthStr);
  }

  // Query ActualExpense for all those months
  const actuals = await prisma.actualExpense.findMany({
    where: {
      scenarioId,
      month: { in: monthList },
    },
    orderBy: [{ month: "asc" }, { category: "asc" }],
  });

  // Group by month, then by category
  const monthsData: Array<{ month: string; categories: Record<string, number>; total: number }> = [];
  const categoryAccumulator: Record<string, { total: number; monthlyValues: number[] }> = {};

  for (const monthStr of monthList) {
    const monthActuals = actuals.filter((a) => a.month === monthStr);
    const categories: Record<string, number> = {};
    let total = 0;

    for (const actual of monthActuals) {
      categories[actual.category] = actual.amount;
      total += actual.amount;

      // Accumulate for category totals
      if (!categoryAccumulator[actual.category]) {
        categoryAccumulator[actual.category] = { total: 0, monthlyValues: [] };
      }
      categoryAccumulator[actual.category].total += actual.amount;
      categoryAccumulator[actual.category].monthlyValues.push(actual.amount);
    }

    monthsData.push({ month: monthStr, categories, total });
  }

  // Calculate category totals and trends
  const categoryTotals = Object.entries(categoryAccumulator)
    .map(([category, data]) => {
      const average = data.total / months;

      // Calculate trend (compare last 2 months for each category)
      let trend: "up" | "down" | "stable" = "stable";
      const lastTwoMonths = monthsData.slice(-2);

      if (lastTwoMonths.length === 2) {
        const prev = lastTwoMonths[0].categories[category] || 0;
        const current = lastTwoMonths[1].categories[category] || 0;

        if (current > prev * 1.05) {
          trend = "up";
        } else if (current < prev * 0.95) {
          trend = "down";
        }
      }

      return {
        category,
        total: Math.round(data.total * 100) / 100,
        average: Math.round(average * 100) / 100,
        trend,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Get current and previous month totals
  const currentMonthTotal = monthsData.length > 0 ? monthsData[monthsData.length - 1].total : 0;
  const previousMonthTotal = monthsData.length > 1 ? monthsData[monthsData.length - 2].total : 0;

  return NextResponse.json({
    months: monthsData,
    categoryTotals,
    currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
    previousMonthTotal: Math.round(previousMonthTotal * 100) / 100,
  });
}
