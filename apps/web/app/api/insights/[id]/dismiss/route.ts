import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/insights/[id]/dismiss
 * Dismisses an insight.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify insight belongs to user
    const insight = await prisma.insight.findUnique({
      where: { id },
    });

    if (!insight || insight.userId !== user.id) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    // Dismiss the insight
    const updated = await prisma.insight.update({
      where: { id },
      data: { dismissedAt: new Date() },
    });

    return NextResponse.json({ insight: updated });
  } catch (error) {
    console.error("Failed to dismiss insight:", error);
    return NextResponse.json({ error: "Failed to dismiss insight" }, { status: 500 });
  }
}
