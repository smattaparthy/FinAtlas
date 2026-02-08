import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const LifeEventType = z.enum([
  "BUY_HOUSE",
  "HAVE_BABY",
  "RETIRE_EARLY",
  "CAREER_CHANGE",
  "CUSTOM",
]);

const updateLifeEventSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: LifeEventType.optional(),
  targetDate: z.string().optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

async function getLifeEventWithAccess(eventId: string, userId: string) {
  return prisma.lifeEvent.findFirst({
    where: {
      id: eventId,
      scenario: {
        household: { ownerUserId: userId },
      },
    },
  });
}

// GET /api/life-events/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const lifeEvent = await getLifeEventWithAccess(id, user.id);

  if (!lifeEvent) {
    return NextResponse.json(
      { error: "Life event not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.json({ lifeEvent });
}

// PUT /api/life-events/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getLifeEventWithAccess(id, user.id);

  if (!existing) {
    return NextResponse.json(
      { error: "Life event not found or access denied" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateLifeEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, type, targetDate, description, color, icon } = parsed.data;

  const lifeEvent = await prisma.lifeEvent.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(targetDate !== undefined && { targetDate: new Date(targetDate) }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
    },
  });

  return NextResponse.json({ lifeEvent });
}

// DELETE /api/life-events/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getLifeEventWithAccess(id, user.id);

  if (!existing) {
    return NextResponse.json(
      { error: "Life event not found or access denied" },
      { status: 404 }
    );
  }

  await prisma.lifeEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
