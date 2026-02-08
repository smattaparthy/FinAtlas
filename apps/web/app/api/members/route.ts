import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const createMemberSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1).max(100),
  birthDate: z.string().optional().nullable(),
  retirementAge: z.number().int().min(40).max(100).optional().nullable(),
  roleTag: z.string().optional().nullable(),
});

// GET /api/members?householdId=xxx - List all members for a household
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify user owns this household
    const household = await prisma.household.findFirst({
      where: {
        id: data.householdId,
        ownerUserId: user.id,
      },
    });

    if (!household) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    const member = await prisma.householdMember.create({
      data: {
        householdId: data.householdId,
        name: data.name,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        retirementAge: data.retirementAge ?? null,
        roleTag: data.roleTag || null,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("Error creating member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
