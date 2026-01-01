import { cookies } from "next/headers";
import { verifySession, type SessionUser } from "./jwt";

export function sessionCookieName() {
  return process.env.AUTH_COOKIE_NAME || "finatlas_session";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookie = await cookies();
  const token = cookie.get(sessionCookieName())?.value;
  if (!token) return null;
  return verifySession(token);
}
