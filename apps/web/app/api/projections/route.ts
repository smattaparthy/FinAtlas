import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { runEngine } from "@finatlas/engine";
import { buildEngineInput } from "@/lib/engine/buildEngineInput";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`projections:${user.id}`, { maxRequests: 30, windowMs: 60000 });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
    }

    // Fetch all scenario data
    const scenario = await prisma.scenario.findFirst({
      where: {
        id: scenarioId,
        household: {
          ownerUserId: user.id,
        },
      },
      include: {
        household: {
          include: {
            members: true,
          },
        },
        incomes: {
          include: {
            member: true,
          },
        },
        expenses: true,
        accounts: {
          include: {
            holdings: true,
          },
        },
        loans: true,
        goals: true,
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const engineInput = buildEngineInput(scenario);

    const result = runEngine(engineInput);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating projection:", error);
    return NextResponse.json(
      { error: "Failed to generate projection" },
      { status: 500 }
    );
  }
}
