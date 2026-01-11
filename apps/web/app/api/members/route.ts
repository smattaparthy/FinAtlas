import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// GET /api/members?householdId=xxx - List all members for a household
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get("householdId");

    if (!householdId) {
      // Get all households for the user and their members
      const households = await prisma.household.findMany({
        where: { ownerUserId: user.id },
        include: {
          members: {
            orderBy: { name: "asc" },
          },
        },
      });

      // Flatten all members from all households
      const allMembers = households.flatMap(h => h.members);
      return NextResponse.json({ members: allMembers });
    }

    // Verify user owns this household
    const household = await prisma.household.findFirst({
      where: {
        id: householdId,
        ownerUserId: user.id,
      },
      include: {
        members: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    return NextResponse.json({ members: household.members });
  } catch (error: any) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

// POST /api/members - Create a new member
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { householdId, name, birthDate, retirementAge, roleTag } = body;

    if (!householdId || !name) {
      return NextResponse.json(
        { error: "householdId and name are required" },
        { status: 400 }
      );
    }

    // Verify user owns this household
    const household = await prisma.household.findFirst({
      where: {
        id: householdId,
        ownerUserId: user.id,
      },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    const member = await prisma.householdMember.create({
      data: {
        householdId,
        name,
        birthDate: birthDate ? new Date(birthDate) : null,
        retirementAge: retirementAge ? parseInt(retirementAge) : null,
        roleTag: roleTag || null,
      },
    });

    return NextResponse.json(member);
  } catch (error: any) {
    console.error("Failed to create member:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
