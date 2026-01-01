import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionUser = { id: string; email: string; role: "ADMIN" | "USER" };

function secretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("Missing AUTH_JWT_SECRET");
  return encoder.encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = payload.sub;
    const email = payload.email;
    const role = payload.role;
    if (!id || typeof email !== "string" || (role !== "ADMIN" && role !== "USER"))
      return null;
    return { id, email, role };
  } catch {
    return null;
  }
}
