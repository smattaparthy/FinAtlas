import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// GET /api/accounts - List accounts for a scenario
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify user owns the scenario through household
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const accounts = await prisma.account.findMany({
    where: { scenarioId },
    include: {
      holdings: true,
      contributions: true,
      member: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts });
}

// POST /api/accounts - Create a new account
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { scenarioId, memberId, name, type, balance, growthRule, growthRate } = body;

  if (!scenarioId || !name || !type) {
    return NextResponse.json(
      { error: "scenarioId, name, and type are required" },
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
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Verify member belongs to the household if provided
  if (memberId) {
    const member = await prisma.householdMember.findFirst({
      where: {
        id: memberId,
        householdId: scenario.householdId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found in household" }, { status: 404 });
    }
  }

  const account = await prisma.account.create({
    data: {
      scenarioId,
      memberId: memberId || null,
      name,
      type,
      balance: balance ?? 0,
      growthRule: growthRule ?? "FIXED",
      growthRate: growthRate ?? null,
    },
    include: {
      holdings: true,
      contributions: true,
      member: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
