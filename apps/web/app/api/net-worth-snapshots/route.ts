import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify user owns the scenario
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: {
        ownerUserId: user.id,
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { scenarioId },
    orderBy: { snapshotDate: "desc" },
  });

  return NextResponse.json({ snapshots });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scenarioId, notes } = body;

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify user owns the scenario
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: {
        ownerUserId: user.id,
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Compute current totals from accounts and loans
  const [accounts, loans] = await Promise.all([
    prisma.account.findMany({ where: { scenarioId }, select: { balance: true } }),
    prisma.loan.findMany({ where: { scenarioId }, select: { currentBalance: true } }),
  ]);

  const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = loans.reduce((s, l) => s + l.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Upsert for today's date (one snapshot per day)
  const snapshotDate = new Date(new Date().toISOString().split("T")[0]);

  const snapshot = await prisma.netWorthSnapshot.upsert({
    where: {
      scenarioId_snapshotDate: { scenarioId, snapshotDate },
    },
    update: {
      totalAssets,
      totalLiabilities,
      netWorth,
      notes: notes || null,
    },
    create: {
      scenarioId,
      snapshotDate,
      totalAssets,
      totalLiabilities,
      netWorth,
      notes: notes || null,
      isAutomatic: false,
    },
  });

  return NextResponse.json({ snapshot }, { status: 201 });
}
