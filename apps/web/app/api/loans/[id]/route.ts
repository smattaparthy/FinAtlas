import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const LoanTypeEnum = z.enum(["MORTGAGE", "AUTO", "STUDENT", "PERSONAL", "HELOC", "OTHER"]);

const updateLoanSchema = z.object({
  memberId: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required").optional(),
  type: LoanTypeEnum.optional(),
  principal: z.number().positive("Principal must be positive").optional(),
  currentBalance: z.number().min(0, "Current balance cannot be negative").optional(),
  interestRate: z.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%").optional(),
  monthlyPayment: z.number().min(0, "Monthly payment cannot be negative").optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  termMonths: z.number().int().positive("Term must be positive").optional(),
});

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

async function getLoanWithOwnerCheck(loanId: string, userId: string) {
  const loan = await prisma.loan.findFirst({
    where: {
      id: loanId,
      scenario: {
        household: {
          ownerUserId: userId,
        },
      },
    },
    include: {
      member: {
        select: { id: true, name: true },
      },
      scenario: {
        select: { householdId: true },
      },
    },
  });
  return loan;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const loan = await getLoanWithOwnerCheck(id, user.id);

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    return NextResponse.json({ loan });
  } catch (error) {
    console.error("Error fetching loan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingLoan = await getLoanWithOwnerCheck(id, user.id);

    if (!existingLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateLoanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // If memberId provided, verify member belongs to the household
    if (data.memberId !== undefined && data.memberId !== null) {
      const member = await prisma.householdMember.findFirst({
        where: {
          id: data.memberId,
          householdId: existingLoan.scenario.householdId,
        },
      });
      if (!member) {
        return NextResponse.json({ error: "Member not found in household" }, { status: 404 });
      }
    }

    // Calculate monthly payment if principal, rate, or term changed but monthlyPayment not provided
    let monthlyPayment = data.monthlyPayment;
    if (monthlyPayment === undefined) {
      const principal = data.principal ?? existingLoan.principal;
      const interestRate = data.interestRate ?? existingLoan.interestRate;
      const termMonths = data.termMonths ?? existingLoan.termMonths;

      // Only recalculate if any of these values changed
      if (data.principal !== undefined || data.interestRate !== undefined || data.termMonths !== undefined) {
        monthlyPayment = calculateMonthlyPayment(principal, interestRate, termMonths);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.memberId !== undefined) updateData.memberId = data.memberId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.principal !== undefined) updateData.principal = data.principal;
    if (data.currentBalance !== undefined) updateData.currentBalance = data.currentBalance;
    if (data.interestRate !== undefined) updateData.interestRate = data.interestRate;
    if (monthlyPayment !== undefined) updateData.monthlyPayment = monthlyPayment;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.termMonths !== undefined) updateData.termMonths = data.termMonths;

    const loan = await prisma.loan.update({
      where: { id },
      data: updateData,
      include: {
        member: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ loan });
  } catch (error) {
    console.error("Error updating loan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingLoan = await getLoanWithOwnerCheck(id, user.id);

    if (!existingLoan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    await prisma.loan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting loan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
