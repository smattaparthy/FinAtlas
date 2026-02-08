import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_ASSUMPTIONS } from "@/lib/constants";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user exists in database first
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

    // Get all households for the user
    let households = await prisma.household.findMany({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

    // Auto-create household if user has none
    if (households.length === 0) {
      const newHousehold = await prisma.household.create({
        data: {
          name: "My Household",
          ownerUserId: user.id,
        },
      });

      // Create default baseline scenario
      await prisma.scenario.create({
        data: {
          householdId: newHousehold.id,
          name: "Baseline",
          description: "Your baseline financial scenario",
          isBaseline: true,
        },
      });

      // Create scenario assumptions
      await prisma.scenarioAssumption.create({
        data: {
          scenarioId: (await prisma.scenario.findFirst({
            where: { householdId: newHousehold.id },
            select: { id: true },
          }))!.id,
          ...DEFAULT_ASSUMPTIONS,
        },
      });

      households = [{ id: newHousehold.id }];
    }

    const householdIds = households.map((h) => h.id);

    // Get all scenarios for those households
    const scenarios = await prisma.scenario.findMany({
      where: {
        householdId: { in: householdIds },
      },
      select: {
        id: true,
        name: true,
        description: true,
        isBaseline: true,
        householdId: true,
      },
      orderBy: [
        { isBaseline: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error("Failed to fetch scenarios:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios" },
      { status: 500 }
    );
  }
}
