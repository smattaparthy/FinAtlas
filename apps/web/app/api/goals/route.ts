import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const GoalType = z.enum([
  "RETIREMENT",
  "EDUCATION",
  "MAJOR_PURCHASE",
  "EMERGENCY_FUND",
  "CUSTOM",
]);

const createGoalSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  name: z.string().min(1, "Name is required").max(100),
  type: GoalType.default("CUSTOM"),
  targetAmount: z.number().positive("Target amount must be positive"),
  targetDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(3).default(2),
});

// GET /api/goals - List all goals for a scenario
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this scenario through household ownership
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

    const goals = await prisma.goal.findMany({
      where: { scenarioId },
      orderBy: [{ priority: "asc" }, { targetDate: "asc" }],
    });

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scenarioId, name, type, targetAmount, targetDate, priority } =
      parsed.data;

    // Verify user has access to this scenario through household ownership
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

    const goal = await prisma.goal.create({
      data: {
        scenarioId,
        name,
        type,
        targetAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
