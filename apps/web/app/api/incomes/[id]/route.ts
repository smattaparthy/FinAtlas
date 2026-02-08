import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const FrequencyEnum = z.enum(["MONTHLY", "BIWEEKLY", "WEEKLY", "ANNUAL", "ONE_TIME"]);
const GrowthRuleEnum = z.enum(["NONE", "FIXED", "INFLATION", "INFLATION_PLUS"]);

const UpdateIncomeSchema = z.object({
  memberId: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required").optional(),
  amount: z.number().positive("Amount must be positive").optional(),
  frequency: FrequencyEnum.optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : val === null ? null : undefined)),
  growthRule: GrowthRuleEnum.optional(),
  growthRate: z.number().nullable().optional(),
  isTaxable: z.boolean().optional(),
});

async function getIncomeWithOwnership(userId: string, incomeId: string) {
  return prisma.income.findFirst({
    where: {
      id: incomeId,
      scenario: {
        household: { ownerUserId: userId },
      },
    },
    include: {
      member: { select: { id: true, name: true } },
      scenario: { select: { id: true, householdId: true } },
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const income = await getIncomeWithOwnership(user.id, id);

    if (!income) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    return NextResponse.json({ income });
  } catch (error) {
    console.error("Error fetching income:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingIncome = await getIncomeWithOwnership(user.id, id);

    if (!existingIncome) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = UpdateIncomeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const data = parsed.data;

    // Only include fields that are explicitly provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.growthRule !== undefined) updateData.growthRule = data.growthRule;
    if (data.growthRate !== undefined) updateData.growthRate = data.growthRate;
    if (data.isTaxable !== undefined) updateData.isTaxable = data.isTaxable;

    // Handle memberId specially - can be set to null
    if ("memberId" in data) {
      if (data.memberId) {
        // Verify member belongs to the household
        const member = await prisma.householdMember.findFirst({
          where: {
            id: data.memberId,
            householdId: existingIncome.scenario.householdId,
          },
        });
        if (!member) {
          return NextResponse.json({ error: "Member not found" }, { status: 400 });
        }
      }
      updateData.memberId = data.memberId ?? null;
    }

    const income = await prisma.income.update({
      where: { id },
      data: updateData,
      include: {
        member: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ income });
  } catch (error) {
    console.error("Error updating income:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingIncome = await getIncomeWithOwnership(user.id, id);

    if (!existingIncome) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    await prisma.income.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting income:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
