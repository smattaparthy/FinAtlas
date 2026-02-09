import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { runMonteCarlo } from "@finatlas/engine";
import type { MonteCarloConfig } from "@finatlas/engine";
import { buildEngineInput } from "@/lib/engine/buildEngineInput";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 Monte Carlo runs per minute (computationally expensive)
  const rateLimit = checkRateLimit(`monte-carlo:${user.id}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const { searchParams } = new URL(req.url);
  const scenarioId = searchParams.get("scenarioId");
  const simulations = parseInt(searchParams.get("simulations") ?? "500", 10);
  const volatility = parseFloat(searchParams.get("volatility") ?? "15");

  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required" }, { status: 400 });
  }

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

  const config: MonteCarloConfig = {
    simulations: Math.min(Math.max(simulations, 50), 2000),
    volatilityPct: Math.min(Math.max(volatility, 1), 50),
  };

  try {
    const result = runMonteCarlo(engineInput, config);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Monte Carlo engine error:", error);
    return NextResponse.json(
      { error: "Failed to run Monte Carlo simulation" },
      { status: 500 }
    );
  }
}
