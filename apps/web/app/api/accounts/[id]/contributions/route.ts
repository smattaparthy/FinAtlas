import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/accounts/[id]/contributions - List contributions for account
export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await params;

  // Verify user owns this account through scenario/household
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      scenario: {
        household: { ownerUserId: user.id },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const contributions = await prisma.contribution.findMany({
    where: { accountId },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ contributions });
}

// POST /api/accounts/[id]/contributions - Add contribution to account
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await params;
  const body = await req.json();
  const { amount, frequency, startDate, endDate, employerMatch, employerMatchLimit } = body;

  if (amount === undefined || !startDate) {
    return NextResponse.json(
      { error: "amount and startDate are required" },
      { status: 400 }
    );
  }

  // Verify user owns this account through scenario/household
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      scenario: {
        household: { ownerUserId: user.id },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const contribution = await prisma.contribution.create({
    data: {
      accountId,
      amount,
      frequency: frequency ?? "ANNUAL",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      employerMatch: employerMatch ?? null,
      employerMatchLimit: employerMatchLimit ?? null,
    },
  });

  return NextResponse.json({ contribution }, { status: 201 });
}
