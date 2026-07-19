/**
 * Verifies login session persistence for manual test user.
 * Run: npx tsx scripts/verify-auth-session.ts
 */
import { hashPassword } from "../src/lib/security/password";
import {
  initDemoAccounts,
  findAccountByEmail,
  createSession,
} from "../src/lib/security/demo-store";
import { bootstrapManualTestUser } from "../src/lib/security/account-password";
import {
  isPersistedSessionValid,
  persistSession,
} from "../src/lib/security/auth-store";
import { signSessionToken, verifySessionToken } from "../src/lib/security/jwt";
import { MANUAL_TEST_USER_EMAIL } from "../src/lib/security/roles";

async function main() {
  await initDemoAccounts(hashPassword);
  await bootstrapManualTestUser();

  const account = findAccountByEmail(MANUAL_TEST_USER_EMAIL);
  if (!account) {
    throw new Error("Manual test user not found");
  }

  const { sessionId, session } = createSession(account.id, {
    userAgent: "verify-script",
    ip: "127.0.0.1",
  });

  persistSession({
    sessionId,
    accountId: account.id,
    userAgent: "verify-script",
    ip: "127.0.0.1",
    deviceLabel: session.deviceLabel,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
  });

  if (!isPersistedSessionValid(sessionId, account.id)) {
    throw new Error("Persisted session not found after persistSession()");
  }

  const token = await signSessionToken({
    sub: account.id,
    email: account.email,
    role: account.role,
    sessionId,
  });

  const payload = await verifySessionToken(token);
  if (!payload || payload.sub !== account.id) {
    throw new Error("JWT verify failed");
  }

  console.log("OK: login session persists and JWT verifies for", MANUAL_TEST_USER_EMAIL);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
