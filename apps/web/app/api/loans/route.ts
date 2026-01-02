import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const LoanTypeEnum = z.enum(["MORTGAGE", "AUTO", "STUDENT", "PERSONAL", "HELOC", "OTHER"]);

const createLoanSchema = z.object({
  scenarioId: z.string().min(1, "Scenario is required"),
  memberId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required"),
  type: LoanTypeEnum.default("OTHER"),
  principal: z.number().positive("Principal must be positive"),
  currentBalance: z.number().min(0, "Current balance cannot be negative"),
  interestRate: z.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%"),
  monthlyPayment: z.number().min(0, "Monthly payment cannot be negative").optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  termMonths: z.number().int().positive("Term must be positive"),
});

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify user owns the scenario
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: {
        ownerUserId: user.id,
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const loans = await prisma.loan.findMany({
    where: { scenarioId },
    include: {
      member: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ loans });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify user owns the scenario
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: data.scenarioId,
      household: {
        ownerUserId: user.id,
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // If memberId provided, verify member belongs to the household
  if (data.memberId) {
    const member = await prisma.householdMember.findFirst({
      where: {
        id: data.memberId,
        householdId: scenario.householdId,
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found in household" }, { status: 404 });
    }
  }

  // Calculate monthly payment if not provided
  const monthlyPayment = data.monthlyPayment ??
    calculateMonthlyPayment(data.principal, data.interestRate, data.termMonths);

  const loan = await prisma.loan.create({
    data: {
      scenarioId: data.scenarioId,
      memberId: data.memberId ?? null,
      name: data.name,
      type: data.type,
      principal: data.principal,
      currentBalance: data.currentBalance,
      interestRate: data.interestRate,
      monthlyPayment,
      startDate: new Date(data.startDate),
      termMonths: data.termMonths,
    },
    include: {
      member: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ loan }, { status: 201 });
}
