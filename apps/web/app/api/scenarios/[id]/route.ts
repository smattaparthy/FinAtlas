import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenario = await prisma.scenario.findFirst({
    where: { id: params.id, household: { ownerUserId: user.id } },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (scenario.isBaseline) {
    return NextResponse.json(
      { error: "Cannot delete baseline scenario" },
      { status: 400 }
    );
  }

  await prisma.scenario.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
