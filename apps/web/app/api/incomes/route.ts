import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const FrequencyEnum = z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]);
const GrowthRuleEnum = z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]);

const CreateIncomeSchema = z.object({
  scenarioId: z.string().min(1),
  memberId: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  frequency: FrequencyEnum.default("ANNUAL"),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
  growthRule: GrowthRuleEnum.default("NONE"),
  growthRate: z.number().nullable().optional(),
  isTaxable: z.boolean().default(true),
});

async function verifyScenarioOwnership(userId: string, scenarioId: string) {
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: userId },
    },
    select: { id: true },
  });
  return !!scenario;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const hasAccess = await verifyScenarioOwnership(user.id, scenarioId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const incomes = await prisma.income.findMany({
    where: { scenarioId },
    include: {
      member: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ incomes });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateIncomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { scenarioId, memberId, ...incomeData } = parsed.data;

  const hasAccess = await verifyScenarioOwnership(user.id, scenarioId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Verify member belongs to the household if provided
  if (memberId) {
    const member = await prisma.householdMember.findFirst({
      where: {
        id: memberId,
        household: { ownerUserId: user.id },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 400 });
    }
  }

  const income = await prisma.income.create({
    data: {
      scenarioId,
      memberId: memberId ?? null,
      ...incomeData,
    },
    include: {
      member: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ income }, { status: 201 });
}
