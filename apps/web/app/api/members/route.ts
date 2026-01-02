import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

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

  // Verify user owns the scenario
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
          members: {
            select: {
              id: true,
              name: true,
              birthDate: true,
              retirementAge: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json({ members: scenario.household.members });
}
