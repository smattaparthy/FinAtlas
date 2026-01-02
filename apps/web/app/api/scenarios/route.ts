import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all households for the user
    const households = await prisma.household.findMany({
      where: { ownerUserId: user.id },
      select: { id: true },
    });

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
