import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/accounts/[id] - Get single account with holdings and contributions
export async function GET(req: NextRequest, { params }: RouteParams) {
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
}

// PUT /api/accounts/[id] - Update account
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { memberId, name, type, balance, growthRule, growthRate } = body;

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
  if (memberId) {
    const member = await prisma.householdMember.findFirst({
      where: {
        id: memberId,
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
      memberId: memberId !== undefined ? (memberId || null) : undefined,
      name: name !== undefined ? name : undefined,
      type: type !== undefined ? type : undefined,
      balance: balance !== undefined ? balance : undefined,
      growthRule: growthRule !== undefined ? growthRule : undefined,
      growthRate: growthRate !== undefined ? growthRate : undefined,
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
}

// DELETE /api/accounts/[id] - Delete account
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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
}
