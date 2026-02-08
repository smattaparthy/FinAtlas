import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string; tokenId: string }> };

// DELETE /api/scenarios/[id]/share/[tokenId] - Revoke a share token
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: scenarioId, tokenId } = await params;

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

    const shareToken = await prisma.shareToken.findFirst({
      where: { id: tokenId, scenarioId },
    });

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token not found" },
        { status: 404 }
      );
    }

    await prisma.shareToken.delete({ where: { id: tokenId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting share token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
