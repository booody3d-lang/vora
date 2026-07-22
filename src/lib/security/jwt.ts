import { SignJWT, jwtVerify } from "jose";
import type { SessionPayload, VoraRole } from "@/types/security";

const COOKIE_NAME = "vora_session";
const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours short-lived

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing JWT_SECRET");
    }
    return new TextEncoder().encode("vora-dev-jwt-secret-change-in-production-2026");
  }
  return new TextEncoder().encode(secret);
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };

export async function signSessionToken(payload: {
  sub: string;
  email: string;
  role: VoraRole;
  sessionId: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .setIssuer("vora.sa")
    .setAudience("vora-app")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "vora.sa",
      audience: "vora-app",
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as VoraRole,
      sessionId: payload.sessionId as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
