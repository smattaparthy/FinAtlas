import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/accounts/[id]/holdings - List holdings for account
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

  const holdings = await prisma.holding.findMany({
    where: { accountId },
    orderBy: { symbol: "asc" },
  });

  return NextResponse.json({ holdings });
}

// POST /api/accounts/[id]/holdings - Add holding to account
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId } = await params;
  const body = await req.json();
  const { symbol, name, shares, costBasis } = body;

  if (!symbol || shares === undefined) {
    return NextResponse.json(
      { error: "symbol and shares are required" },
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

  const holding = await prisma.holding.create({
    data: {
      accountId,
      symbol: symbol.toUpperCase(),
      name: name || null,
      shares,
      costBasis: costBasis ?? null,
    },
  });

  return NextResponse.json({ holding }, { status: 201 });
}
