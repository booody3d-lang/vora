import "server-only";

import { getClientIp } from "@/lib/security/rate-limit";
import {
  getSupabaseAccessToken,
  hashSessionToken,
  recordUserSession,
  getSupabaseSessionExpiry,
} from "@/lib/auth/sessions-store";

export async function persistLoginSession(
  request: Request,
  accountId: string,
  sessionToken?: string | null
): Promise<void> {
  const token = sessionToken ?? (await getSupabaseAccessToken());
  if (!token) return;

  const ua = request.headers.get("user-agent") ?? "unknown";
  const ip = getClientIp(request);
  const expiresAt = await getSupabaseSessionExpiry();

  await recordUserSession({
    accountId,
    sessionToken: token,
    userAgent: ua,
    ip,
    expiresAt,
  });
}

export async function resolveCurrentTokenHash(): Promise<string | null> {
  const token = await getSupabaseAccessToken();
  if (!token) return null;
  return hashSessionToken(token);
}
