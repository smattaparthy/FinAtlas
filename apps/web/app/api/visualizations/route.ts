import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

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

// GET /api/visualizations?scenarioId=X&type=sankey|heatmap|treemap
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  const type = req.nextUrl.searchParams.get("type");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  if (!type || !["sankey", "heatmap", "treemap"].includes(type)) {
    return NextResponse.json({ error: "type must be sankey, heatmap, or treemap" }, { status: 400 });
  }

  const hasAccess = await verifyScenarioOwnership(user.id, scenarioId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  if (type === "sankey") {
    return handleSankey(scenarioId);
  } else if (type === "heatmap") {
    return handleHeatmap(scenarioId);
  } else {
    return handleTreemap(scenarioId);
  }
}

async function handleSankey(scenarioId: string) {
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { scenarioId },
      select: { name: true, amount: true, frequency: true },
    }),
    prisma.expense.findMany({
      where: { scenarioId },
      select: { name: true, amount: true, frequency: true, category: true },
    }),
  ]);

  // Sources: each income annualized
  const sources = incomes.map((inc) => {
    const multiplier = FREQUENCY_MULTIPLIERS[inc.frequency] || 0;
    return {
      name: inc.name,
      amount: Math.round(inc.amount * multiplier * 100) / 100,
    };
  }).filter((s) => s.amount > 0);

  // Targets: group expenses by category (or name if no category), annualized
  const categoryMap: Record<string, number> = {};
  for (const exp of expenses) {
    const multiplier = FREQUENCY_MULTIPLIERS[exp.frequency] || 0;
    const annualAmount = exp.amount * multiplier;
    if (annualAmount <= 0) continue;
    const key = exp.category || exp.name;
    categoryMap[key] = (categoryMap[key] || 0) + annualAmount;
  }

  const targets = Object.entries(categoryMap)
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Flows: distribute each income proportionally across all expense categories
  const totalExpense = targets.reduce((s, t) => s + t.amount, 0);
  const flows: Array<{ from: string; to: string; amount: number }> = [];

  for (const source of sources) {
    for (const target of targets) {
      // Each source flows proportionally to each target based on target's share
      const flowAmount = totalExpense > 0
        ? (target.amount / totalExpense) * source.amount
        : source.amount / targets.length;
      if (flowAmount > 0) {
        flows.push({
          from: source.name,
          to: target.name,
          amount: Math.round(flowAmount * 100) / 100,
        });
      }
    }
  }

  return NextResponse.json({ sources, targets, flows });
}

async function handleHeatmap(scenarioId: string) {
  // Get actual expenses for last 12 weeks
  const now = new Date();
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks * 7 days

  const actuals = await prisma.actualExpense.findMany({
    where: { scenarioId },
    orderBy: { month: "asc" },
  });

  // Build a map of daily spending from monthly data
  // Since ActualExpense stores monthly aggregates, distribute across the month
  const cells: Array<{ date: string; amount: number }> = [];

  // Generate last 12 weeks of dates
  for (let i = 83; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // Find matching month's expenses and distribute daily
    const monthActuals = actuals.filter((a) => a.month === monthStr);
    const monthTotal = monthActuals.reduce((s, a) => s + a.amount, 0);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const dailyAmount = monthTotal / daysInMonth;

    cells.push({
      date: dateStr,
      amount: Math.round(dailyAmount * 100) / 100,
    });
  }

  return NextResponse.json({ cells });
}

async function handleTreemap(scenarioId: string) {
  const dbAccounts = await prisma.account.findMany({
    where: { scenarioId },
    include: { holdings: true },
  });

  const accounts = dbAccounts.map((account) => {
    const holdingChildren = account.holdings.map((h) => ({
      name: h.name || h.symbol,
      value: Math.abs(h.shares * (h.costBasis || 0)),
    })).filter((c) => c.value > 0);

    // Account value: balance or sum of holdings (whichever is greater)
    const holdingsTotal = holdingChildren.reduce((s, c) => s + c.value, 0);
    const accountValue = Math.max(account.balance, holdingsTotal);

    return {
      name: account.name,
      type: account.type,
      value: Math.round(accountValue * 100) / 100,
      children: holdingChildren,
    };
  }).filter((a) => a.value > 0);

  return NextResponse.json({ accounts });
}
