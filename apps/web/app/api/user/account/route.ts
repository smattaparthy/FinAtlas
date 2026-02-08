import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

export async function DELETE(request: Request) {
  try {
    // 1. Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate confirmation
    const body = await request.json();
    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Invalid confirmation" },
        { status: 400 }
      );
    }

    // 3. Delete user (cascades to all data)
    await prisma.user.delete({ where: { id: user.id } });

    // 4. Clear session cookie
    cookies().set("session", "", { maxAge: 0, path: "/" });

    // 5. Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
