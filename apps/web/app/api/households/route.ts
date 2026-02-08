import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import { DEFAULT_ASSUMPTIONS } from "@/lib/constants";

const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(100),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const households = await prisma.household.findMany({
      where: { ownerUserId: user.id },
      include: {
        scenarios: {
          select: {
            id: true,
            name: true,
            isBaseline: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            roleTag: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ households });
  } catch (error) {
    console.error("Failed to fetch households:", error);
    return NextResponse.json(
      { error: "Failed to fetch households" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      console.error("User from session not found in database:", user.id);
      return NextResponse.json(
        { error: "User account not found. Please log out and log in again." },
        { status: 400 }
      );
    }

    // Create household
    const household = await prisma.household.create({
      data: {
        name,
        ownerUserId: user.id,
      },
    });

    // Create default baseline scenario
    const scenario = await prisma.scenario.create({
      data: {
        householdId: household.id,
        name: "Baseline",
        description: "Your baseline financial scenario",
        isBaseline: true,
      },
    });

    // Create default scenario assumptions
    await prisma.scenarioAssumption.create({
      data: {
        scenarioId: scenario.id,
        ...DEFAULT_ASSUMPTIONS,
      },
    });

    return NextResponse.json({
      household: {
        ...household,
        scenarios: [scenario],
      },
    });
  } catch (error) {
    console.error("Failed to create household:", error);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }
}
