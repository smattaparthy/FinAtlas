import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string; holdingId: string }> };

// GET /api/accounts/[id]/holdings/[holdingId] - Get single holding
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId, holdingId } = await params;

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

    const holding = await prisma.holding.findFirst({
      where: {
        id: holdingId,
        accountId,
      },
    });

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    return NextResponse.json({ holding });
  } catch (error) {
    console.error("Error fetching holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/accounts/[id]/holdings/[holdingId] - Update holding
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId, holdingId } = await params;
    const body = await req.json();
    const { symbol, name, shares, costBasis } = body;

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

    const existingHolding = await prisma.holding.findFirst({
      where: {
        id: holdingId,
        accountId,
      },
    });

    if (!existingHolding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    const holding = await prisma.holding.update({
      where: { id: holdingId },
      data: {
        symbol: symbol !== undefined ? symbol.toUpperCase() : undefined,
        name: name !== undefined ? (name || null) : undefined,
        shares: shares !== undefined ? shares : undefined,
        costBasis: costBasis !== undefined ? costBasis : undefined,
      },
    });

    return NextResponse.json({ holding });
  } catch (error) {
    console.error("Error updating holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/accounts/[id]/holdings/[holdingId] - Delete holding
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId, holdingId } = await params;

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

    const existingHolding = await prisma.holding.findFirst({
      where: {
        id: holdingId,
        accountId,
      },
    });

    if (!existingHolding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 });
    }

    await prisma.holding.delete({
      where: { id: holdingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
