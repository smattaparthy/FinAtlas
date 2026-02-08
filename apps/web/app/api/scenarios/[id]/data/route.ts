import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            ownerUserId: true,
          },
        },
        incomes: true,
        expenses: true,
        accounts: true,
        loans: true,
        goals: true,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    if (scenario.household.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        name: scenario.name,
        isBaseline: scenario.isBaseline,
      },
      incomes: scenario.incomes,
      expenses: scenario.expenses,
      accounts: scenario.accounts,
      loans: scenario.loans,
      goals: scenario.goals,
    });
  } catch (error) {
    console.error("Scenario data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario data" },
      { status: 500 }
    );
  }
}
