import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one ID is required"),
  scenarioId: z.string().min(1, "Scenario ID is required"),
  updates: z.object({
    category: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { ids, scenarioId, updates } = parsed.data;

  // Verify user owns the scenario's household
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { household: true },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  if (scenario.household.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.expense.updateMany({
    where: {
      id: { in: ids },
      scenarioId,
    },
    data: {
      ...(updates.category !== undefined && { category: updates.category }),
    },
  });

  return NextResponse.json({ updatedCount: result.count });
}
