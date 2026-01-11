import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const updateHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required").max(100),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = parsed.data;

    // Verify ownership
    const existingHousehold = await prisma.household.findUnique({
      where: { id },
      select: { ownerUserId: true },
    });

    if (!existingHousehold) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    if (existingHousehold.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to edit this household" },
        { status: 403 }
      );
    }

    // Update household
    const household = await prisma.household.update({
      where: { id },
      data: { name },
      include: {
        scenarios: {
          select: {
            id: true,
            name: true,
            isBaseline: true,
          },
        },
      },
    });

    return NextResponse.json({ household });
  } catch (error) {
    console.error("Failed to update household:", error);
    return NextResponse.json(
      { error: "Failed to update household" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify ownership
    const existingHousehold = await prisma.household.findUnique({
      where: { id },
      select: { ownerUserId: true },
    });

    if (!existingHousehold) {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }

    if (existingHousehold.ownerUserId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this household" },
        { status: 403 }
      );
    }

    // Delete household (cascades to scenarios, members, etc.)
    await prisma.household.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete household:", error);
    return NextResponse.json(
      { error: "Failed to delete household" },
      { status: 500 }
    );
  }
}
