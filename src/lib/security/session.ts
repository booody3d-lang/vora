import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/security/jwt";
import type { SessionPayload } from "@/types/security";
import { findAccountById, isSessionValid, toPublicUser } from "@/lib/security/demo-store";
import { isDevAuthBypass } from "@/lib/security/dev-auth";

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Dev: JWT alone is sufficient (in-memory session store is not shared across workers)
  if (!isDevAuthBypass() && !isSessionValid(payload.sessionId)) return null;

  const account = findAccountById(payload.sub);
  if (!account || account.isBanned) return null;
  return payload;
}

export async function getAuthenticatedUser() {
  const session = await getServerSession();
  if (!session) return null;
  const account = findAccountById(session.sub);
  if (!account) return null;
  return { session, user: toPublicUser(account) };
}

export function requireRole(session: SessionPayload, roles: SessionPayload["role"][]): boolean {
  if (isDevAuthBypass()) return true;
  if (session.role === "owner") return true;
  return roles.includes(session.role);
}
