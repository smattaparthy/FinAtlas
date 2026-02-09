import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { generateInsights } from "@/lib/insights/insightEngine";

/**
 * GET /api/insights
 * Returns active (non-dismissed, non-expired) insights for the current user and scenario.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify scenario belongs to user
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  try {
    // Fetch active insights
    const insights = await prisma.insight.findMany({
      where: {
        scenarioId,
        userId: user.id,
        dismissedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Failed to fetch insights:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

/**
 * POST /api/insights
 * Generates new insights for the scenario.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

  // Verify scenario belongs to user
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      household: { ownerUserId: user.id },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  try {
    // Delete old insights for this scenario (keep dismissed ones for history)
    await prisma.insight.deleteMany({
      where: {
        scenarioId,
        userId: user.id,
        dismissedAt: null,
      },
    });

    // Generate new insights
    const insightData = await generateInsights(scenarioId, user.id);

    // Save to database
    const createdInsights = await Promise.all(
      insightData.map((insight) =>
        prisma.insight.create({
          data: {
            scenarioId,
            userId: user.id,
            type: insight.type,
            severity: insight.severity,
            title: insight.title,
            message: insight.message,
            data: insight.data ? JSON.stringify(insight.data) : null,
            expiresAt: insight.expiresAt,
          },
        })
      )
    );

    return NextResponse.json({ insights: createdInsights, count: createdInsights.length });
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
