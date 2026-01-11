import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// PUT /api/members/[id] - Update a member
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberId = params.id;
    const body = await req.json();
    const { name, birthDate, retirementAge, roleTag } = body;

    // Verify user owns the household that contains this member
    const existingMember = await prisma.householdMember.findFirst({
      where: {
        id: memberId,
        household: {
          ownerUserId: user.id,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updatedMember = await prisma.householdMember.update({
      where: { id: memberId },
      data: {
        name: name || existingMember.name,
        birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : existingMember.birthDate,
        retirementAge: retirementAge !== undefined ? (retirementAge ? parseInt(retirementAge) : null) : existingMember.retirementAge,
        roleTag: roleTag !== undefined ? roleTag : existingMember.roleTag,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    console.error("Failed to update member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberId = params.id;

    // Verify user owns the household that contains this member
    const existingMember = await prisma.householdMember.findFirst({
      where: {
        id: memberId,
        household: {
          ownerUserId: user.id,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await prisma.householdMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete member:", error);
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}
