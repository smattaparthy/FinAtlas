import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signSession } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { sessionCookieName } from "@/lib/auth/session";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Constant-time delay to prevent timing-based user enumeration
const MIN_RESPONSE_MS = 200;

export async function POST(req: Request) {
  const start = Date.now();

  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`login:${ip}`, { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const body = await req.json().catch(() => null);
  const email = body?.email?.toString()?.toLowerCase();
  const password = body?.password?.toString();

  if (!email || !password) {
    await constantTimeDelay(start);
    return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await constantTimeDelay(start);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    await constantTimeDelay(start);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({ id: user.id, email: user.email, role: user.role as "ADMIN" | "USER" });

  const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  await constantTimeDelay(start);
  return res;
}

async function constantTimeDelay(start: number) {
  const elapsed = Date.now() - start;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
  }
}
