import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
