import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateAccountSchema = z.object({
  memberId: z.string().nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).optional(),
  balance: z.number().min(0).optional(),
  growthRule: z.string().optional(),
  growthRate: z.number().nullable().optional(),
});

// GET /api/accounts/[id] - Get single account with holdings and contributions
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id,
        scenario: {
          household: { ownerUserId: user.id },
        },
      },
      include: {
        holdings: true,
        contributions: {
          orderBy: { startDate: "desc" },
        },
        member: {
          select: { id: true, name: true },
        },
        scenario: {
          select: { id: true, name: true, householdId: true },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/accounts/[id] - Update account
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user owns this account through scenario/household
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        scenario: {
          household: { ownerUserId: user.id },
        },
      },
      include: {
        scenario: true,
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify member belongs to the household if provided
    if (data.memberId) {
      const member = await prisma.householdMember.findFirst({
        where: {
          id: data.memberId,
          householdId: existingAccount.scenario.householdId,
        },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found in household" }, { status: 404 });
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data: {
        memberId: data.memberId !== undefined ? (data.memberId || null) : undefined,
        name: data.name !== undefined ? data.name : undefined,
        type: data.type !== undefined ? data.type : undefined,
        balance: data.balance !== undefined ? data.balance : undefined,
        growthRule: data.growthRule !== undefined ? data.growthRule : undefined,
        growthRate: data.growthRate !== undefined ? data.growthRate : undefined,
      },
      include: {
        holdings: true,
        contributions: true,
        member: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error updating account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify user owns this account through scenario/household
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        scenario: {
          household: { ownerUserId: user.id },
        },
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
