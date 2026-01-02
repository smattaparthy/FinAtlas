import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string; contributionId: string }> };

// GET /api/accounts/[id]/contributions/[contributionId] - Get single contribution
export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId, contributionId } = await params;

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

  const contribution = await prisma.contribution.findFirst({
    where: {
      id: contributionId,
      accountId,
    },
  });

  if (!contribution) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  return NextResponse.json({ contribution });
}

// PUT /api/accounts/[id]/contributions/[contributionId] - Update contribution
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId, contributionId } = await params;
  const body = await req.json();
  const { amount, frequency, startDate, endDate, employerMatch, employerMatchLimit } = body;

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

  const existingContribution = await prisma.contribution.findFirst({
    where: {
      id: contributionId,
      accountId,
    },
  });

  if (!existingContribution) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  const contribution = await prisma.contribution.update({
    where: { id: contributionId },
    data: {
      amount: amount !== undefined ? amount : undefined,
      frequency: frequency !== undefined ? frequency : undefined,
      startDate: startDate !== undefined ? new Date(startDate) : undefined,
      endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
      employerMatch: employerMatch !== undefined ? employerMatch : undefined,
      employerMatchLimit: employerMatchLimit !== undefined ? employerMatchLimit : undefined,
    },
  });

  return NextResponse.json({ contribution });
}

// DELETE /api/accounts/[id]/contributions/[contributionId] - Delete contribution
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: accountId, contributionId } = await params;

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

  const existingContribution = await prisma.contribution.findFirst({
    where: {
      id: contributionId,
      accountId,
    },
  });

  if (!existingContribution) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
  }

  await prisma.contribution.delete({
    where: { id: contributionId },
  });

  return NextResponse.json({ success: true });
}
