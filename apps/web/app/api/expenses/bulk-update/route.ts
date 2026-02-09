import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { validateArrayLength } from "@/lib/validation";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one ID is required"),
  scenarioId: z.string().min(1, "Scenario ID is required"),
  updates: z.object({
    category: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 15 bulk operations per minute
    const rateLimit = checkRateLimit(`bulk-update:${user.id}`, { maxRequests: 15, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

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

    // Validate array length to prevent DoS (max 100 items per request)
    if (!validateArrayLength(ids, 100)) {
      return NextResponse.json(
        { error: "Too many items. Maximum 100 items per bulk operation." },
        { status: 400 }
      );
    }

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
      return tx.expense.updateMany({
        where: {
          id: { in: ids },
          scenarioId,
        },
        data: {
          ...(updates.category !== undefined && { category: updates.category }),
        },
      });
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (error) {
    console.error("Error bulk updating expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
