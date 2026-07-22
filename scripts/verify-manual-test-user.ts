/**
 * One-off verification for the manual test user bootstrap.
 * Run: npx tsx scripts/verify-manual-test-user.ts
 */
import { hashPassword, verifyPassword } from "../src/lib/security/password";
import {
  MANUAL_TEST_USER_EMAIL,
  MANUAL_TEST_USER_ID,
  getManualTestUserBootstrapPassword,
  PLATFORM_OWNER_EMAIL,
  isPlatformOwnerEmail,
  isStandardRegisteredUser,
  resolveEffectiveRole,
} from "../src/lib/security/roles";
import { DEMO_ACCOUNTS, findAccountByEmail, initDemoAccounts } from "../src/lib/security/demo-store";

async function main() {
  await initDemoAccounts(hashPassword);

  const testUser = findAccountByEmail(MANUAL_TEST_USER_EMAIL);
  const owner = findAccountByEmail(PLATFORM_OWNER_EMAIL);

  if (!testUser) {
    throw new Error("Manual test user not found in DEMO_ACCOUNTS");
  }
  if (!owner) {
    throw new Error("Platform owner account missing");
  }

  if (testUser.id !== MANUAL_TEST_USER_ID) {
    throw new Error(`Unexpected test user id: ${testUser.id}`);
  }
  if (testUser.role !== "registered") {
    throw new Error(`Test user role must be registered, got ${testUser.role}`);
  }
  if (!isStandardRegisteredUser(testUser)) {
    throw new Error("Test user failed standard-user privilege check");
  }
  if (resolveEffectiveRole(testUser) !== "registered") {
    throw new Error("Test user effective role is not registered");
  }
  if (isPlatformOwnerEmail(testUser.email)) {
    throw new Error("Test user must not be platform owner");
  }

  const bootstrapPassword =
    getManualTestUserBootstrapPassword() ?? process.env.VORA_DEMO_DEFAULT_PASSWORD ?? "Vora@2026!";
  const hashOk = await verifyPassword(bootstrapPassword, testUser.passwordHash);
  if (!hashOk) {
    throw new Error("Password hash verification failed for manual test user");
  }

  const ownerUnchanged =
    owner.email === PLATFORM_OWNER_EMAIL && owner.id === "platform-owner-1";
  if (!ownerUnchanged) {
    throw new Error("Platform owner account was modified");
  }

  console.log("OK: Manual test user verified");
  console.log(`  Email: ${MANUAL_TEST_USER_EMAIL}`);
  console.log(`  Role: ${testUser.role} (effective: ${resolveEffectiveRole(testUser)})`);
  console.log(`  Owner intact: ${owner.email}`);
  console.log(`  Total accounts: ${DEMO_ACCOUNTS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
