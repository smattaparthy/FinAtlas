import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const LifeEventType = z.enum([
  "BUY_HOUSE",
  "HAVE_BABY",
  "RETIRE_EARLY",
  "CAREER_CHANGE",
  "CUSTOM",
]);

const createLifeEventSchema = z.object({
  scenarioId: z.string().min(1, "Scenario ID is required"),
  name: z.string().min(1, "Name is required").max(100),
  type: LifeEventType.default("CUSTOM"),
  targetDate: z.string().min(1, "Target date is required"),
  description: z.string().max(500).optional().nullable(),
  color: z.string().default("#10b981"),
  icon: z.string().optional().nullable(),
});

// GET /api/life-events - List all life events for a scenario
export async function GET(request: NextRequest) {
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

  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json(
      { error: "Scenario not found or access denied" },
      { status: 404 }
    );
  }

  const lifeEvents = await prisma.lifeEvent.findMany({
    where: { scenarioId },
    orderBy: { targetDate: "asc" },
  });

  return NextResponse.json({ lifeEvents });
}

// POST /api/life-events - Create a new life event
export async function POST(request: NextRequest) {
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

  const parsed = createLifeEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { scenarioId, name, type, targetDate, description, color, icon } =
    parsed.data;

  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json(
      { error: "Scenario not found or access denied" },
      { status: 404 }
    );
  }

  const lifeEvent = await prisma.lifeEvent.create({
    data: {
      scenarioId,
      name,
      type,
      targetDate: new Date(targetDate),
      description: description ?? null,
      color,
      icon: icon ?? null,
    },
  });

  return NextResponse.json({ lifeEvent }, { status: 201 });
}
