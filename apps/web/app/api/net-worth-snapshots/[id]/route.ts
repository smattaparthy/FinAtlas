import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const snapshot = await prisma.netWorthSnapshot.findFirst({
    where: { id },
    include: {
      scenario: {
        include: {
          household: true,
        },
      },
    },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  if (snapshot.scenario.household.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.netWorthSnapshot.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
