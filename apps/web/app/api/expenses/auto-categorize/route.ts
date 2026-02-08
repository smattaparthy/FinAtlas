import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { categorizeExpense } from "@/lib/categorization/matchRule";
import type { CategorizationRule } from "@/lib/categorization/defaultRules";

const autoCategorizeSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  rules: z.array(
    z.object({
      id: z.string(),
      pattern: z.string().min(1),
      matchType: z.enum(["contains", "startsWith", "exact"]),
      category: z.string().min(1),
    })
  ),
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

  const parsed = autoCategorizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { scenarioId, rules } = parsed.data;

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

  // Fetch expenses where category is null or empty
  const expenses = await prisma.expense.findMany({
    where: {
      scenarioId,
      OR: [{ category: null }, { category: "" }],
    },
  });

  let categorizedCount = 0;

  for (const expense of expenses) {
    const category = categorizeExpense(expense.name, rules as CategorizationRule[]);
    if (category) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: { category },
      });
      categorizedCount++;
    }
  }

  return NextResponse.json({ categorizedCount });
}
