import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const createHoldingSchema = z.object({
  symbol: z.string().min(1).max(10),
  name: z.string().max(200).nullable().optional(),
  shares: z.number().min(0),
  costBasis: z.number().nullable().optional(),
});

// GET /api/accounts/[id]/holdings - List holdings for account
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
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
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/accounts/[id]/holdings - Add holding to account
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: accountId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createHoldingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

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
        symbol: data.symbol.toUpperCase(),
        name: data.name || null,
        shares: data.shares,
        costBasis: data.costBasis ?? null,
      },
    });

    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    console.error("Error creating holding:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
