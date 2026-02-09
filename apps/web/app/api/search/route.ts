import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface SearchResult {
  id: string;
  type: "income" | "expense" | "account" | "loan" | "goal";
  name: string;
  subtitle: string;
  href: string;
}

function formatAccountType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatGoalType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatFrequency(freq: string): string {
  const map: Record<string, string> = {
    MONTHLY: "monthly",
    BIWEEKLY: "biweekly",
    WEEKLY: "weekly",
    ANNUAL: "annual",
    ONE_TIME: "one-time",
  };
  return map[freq] || freq.toLowerCase();
}

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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 60 searches per minute (autocomplete can be frequent)
    const rateLimit = checkRateLimit(`search:${user.id}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const q = req.nextUrl.searchParams.get("q");
    const scenarioId = req.nextUrl.searchParams.get("scenarioId");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 }
      );
    }

    const hasAccess = await verifyScenarioOwnership(user.id, scenarioId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const [incomes, expenses, accounts, loans, goals] = await Promise.all([
      prisma.income.findMany({
        where: { scenarioId, name: { contains: q } },
        take: 3,
        select: { id: true, name: true, amount: true, frequency: true },
      }),
      prisma.expense.findMany({
        where: { scenarioId, name: { contains: q } },
        take: 3,
        select: { id: true, name: true, amount: true, category: true },
      }),
      prisma.account.findMany({
        where: { scenarioId, name: { contains: q } },
        take: 3,
        select: { id: true, name: true, type: true, balance: true },
      }),
      prisma.loan.findMany({
        where: { scenarioId, name: { contains: q } },
        take: 3,
        select: { id: true, name: true, currentBalance: true },
      }),
      prisma.goal.findMany({
        where: { scenarioId, name: { contains: q } },
        take: 3,
        select: { id: true, name: true, type: true, targetAmount: true },
      }),
    ]);

    const results: SearchResult[] = [
      ...incomes.map((i) => ({
        id: i.id,
        type: "income" as const,
        name: i.name,
        subtitle: `${formatCurrency(i.amount)} / ${formatFrequency(i.frequency)}`,
        href: "/incomes",
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: "expense" as const,
        name: e.name,
        subtitle: `${e.category || "Uncategorized"} \u00b7 ${formatCurrency(e.amount)}`,
        href: "/expenses",
      })),
      ...accounts.map((a) => ({
        id: a.id,
        type: "account" as const,
        name: a.name,
        subtitle: `${formatAccountType(a.type)} \u00b7 ${formatCurrency(a.balance)}`,
        href: "/investments",
      })),
      ...loans.map((l) => ({
        id: l.id,
        type: "loan" as const,
        name: l.name,
        subtitle: `${formatCurrency(l.currentBalance)} remaining`,
        href: "/loans",
      })),
      ...goals.map((g) => ({
        id: g.id,
        type: "goal" as const,
        name: g.name,
        subtitle: `${formatGoalType(g.type)} \u00b7 ${formatCurrency(g.targetAmount)} target`,
        href: "/goals",
      })),
    ];

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
