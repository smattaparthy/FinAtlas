import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/scenarios/[id]/share - Create a share token
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: scenarioId } = await params;

  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json(
      { error: "Scenario not found or access denied" },
      { status: 404 }
    );
  }

  let expiresInDays: number | null = null;
  try {
    const body = await request.json();
    expiresInDays = body.expiresInDays ?? null;
  } catch {
    // No body is fine, default to no expiry
  }

  const token = crypto.randomUUID();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const shareToken = await prisma.shareToken.create({
    data: {
      scenarioId,
      token,
      expiresAt,
      createdBy: user.id,
    },
  });

  return NextResponse.json(
    {
      shareToken: {
        id: shareToken.id,
        token: shareToken.token,
        url: `/shared/${shareToken.token}`,
        expiresAt: shareToken.expiresAt,
        createdAt: shareToken.createdAt,
      },
    },
    { status: 201 }
  );
}

// GET /api/scenarios/[id]/share - List share tokens
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: scenarioId } = await params;

  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json(
      { error: "Scenario not found or access denied" },
      { status: 404 }
    );
  }

  const tokens = await prisma.shareToken.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      token: t.token,
      url: `/shared/${t.token}`,
      expiresAt: t.expiresAt,
      accessCount: t.accessCount,
      createdAt: t.createdAt,
    })),
  });
}
