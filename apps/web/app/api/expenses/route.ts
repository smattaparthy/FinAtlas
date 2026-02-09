import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const createExpenseSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  frequency: z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().nullable().optional().transform((s) => (s ? new Date(s) : null)),
  growthRule: z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]).default("INFLATION"),
  growthRate: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  isDiscretionary: z.boolean().default(false),
});

// GET /api/expenses?scenarioId=xxx - List all expenses for a scenario
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
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

    const expenses = await prisma.expense.findMany({
      where: { scenarioId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/expenses - Create a new expense
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 100 requests per minute for standard CRUD operations
    const rateLimit = checkRateLimit(`crud:${user.id}`, { maxRequests: 100, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user owns the scenario's household
    const scenario = await prisma.scenario.findUnique({
      where: { id: data.scenarioId },
      include: { household: true },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    if (scenario.household.ownerUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expense = await prisma.expense.create({
      data: {
        scenarioId: data.scenarioId,
        name: data.name,
        amount: data.amount,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate,
        growthRule: data.growthRule,
        growthRate: data.growthRate,
        category: data.category,
        isDiscretionary: data.isDiscretionary,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
