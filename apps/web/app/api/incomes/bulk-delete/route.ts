import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one ID is required"),
  scenarioId: z.string().min(1, "Scenario ID is required"),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ids, scenarioId } = parsed.data;

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

    const result = await prisma.$transaction(async (tx) => {
      return tx.income.deleteMany({
        where: {
          id: { in: ids },
          scenarioId,
        },
      });
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    console.error("Error bulk deleting incomes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
