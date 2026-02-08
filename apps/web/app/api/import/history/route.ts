import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenarioId = req.nextUrl.searchParams.get("scenarioId");
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify scenario belongs to user's household
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
    select: { id: true },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const logs = await prisma.importLog.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ logs });
}
