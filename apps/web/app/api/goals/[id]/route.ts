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

const updateGoalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  type: GoalType.optional(),
  targetAmount: z.number().positive("Target amount must be positive").optional(),
  targetDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(3).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// Helper to verify goal access
async function getGoalWithAccess(goalId: string, userId: string) {
  return prisma.goal.findFirst({
    where: {
      id: goalId,
      scenario: {
        household: {
          ownerUserId: userId,
        },
      },
    },
  });
}

// GET /api/goals/[id] - Get a single goal
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await getGoalWithAccess(id, user.id);

  if (!goal) {
    return NextResponse.json(
      { error: "Goal not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json({ goal });
}

// PUT /api/goals/[id] - Update a goal
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingGoal = await getGoalWithAccess(id, user.id);

  if (!existingGoal) {
    return NextResponse.json(
      { error: "Goal not found or access denied" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, type, targetAmount, targetDate, priority } = parsed.data;

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(targetAmount !== undefined && { targetAmount }),
      ...(targetDate !== undefined && {
        targetDate: targetDate ? new Date(targetDate) : null,
      }),
      ...(priority !== undefined && { priority }),
    },
  });

  return NextResponse.json({ goal });
}

// DELETE /api/goals/[id] - Delete a goal
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingGoal = await getGoalWithAccess(id, user.id);

  if (!existingGoal) {
    return NextResponse.json(
      { error: "Goal not found or access denied" },
      { status: 404 }
    );
  }

  await prisma.goal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
