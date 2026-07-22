import "server-only";

import { hashPassword, validatePassword } from "@/lib/security/password";
import {
  getStoredPasswordHash,
  setAccountPasswordHash,
} from "@/lib/security/auth-store";
import {
  DEMO_ACCOUNTS,
  findAccountById,
  syncAccountPasswordHash,
} from "@/lib/security/demo-store";
import {
  isManualTestUserEmail,
  isPlatformOwnerEmail,
  isStandardRegisteredUser,
  getManualTestUserBootstrapPassword,
  getPlatformOwnerBootstrapPassword,
  MANUAL_TEST_USER_EMAIL,
  PLATFORM_OWNER_EMAIL,
  resolveEffectiveRole,
} from "@/lib/security/roles";
import { createProfileForAccount, ensureFreelancerStoreForAccount, getProfileByAccountId } from "@/lib/profile/profile-store";
import { verifyPassword } from "@/lib/security/password";

export async function getEffectivePasswordHash(accountId: string): Promise<string | null> {
  const stored = getStoredPasswordHash(accountId);
  if (stored) return stored;
  const account = findAccountById(accountId);
  return account?.passwordHash ?? null;
}

export async function verifyAccountPassword(
  accountId: string,
  password: string
): Promise<boolean> {
  const hash = await getEffectivePasswordHash(accountId);
  if (!hash) return false;
  return verifyPassword(password, hash);
}

export async function changeAccountPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Invalid password" };
  }

  const valid = await verifyAccountPassword(accountId, currentPassword);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect" };
  }

  await setAccountPasswordHash(accountId, newPassword);
  const hash = await hashPassword(newPassword);
  syncAccountPasswordHash(accountId, hash);
  return { ok: true };
}

export async function resetAccountPassword(
  accountId: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Invalid password" };
  }

  await setAccountPasswordHash(accountId, newPassword);
  const hash = await hashPassword(newPassword);
  syncAccountPasswordHash(accountId, hash);
  return { ok: true };
}

/** Persist platform owner credentials into auth-store on server bootstrap */
export async function bootstrapOwnerCredentials(): Promise<void> {
  const bootstrapPassword = getPlatformOwnerBootstrapPassword();
  if (!bootstrapPassword) return;

  for (const account of DEMO_ACCOUNTS) {
    if (!isPlatformOwnerEmail(account.email)) continue;
    if (getStoredPasswordHash(account.id)) continue;
    await setAccountPasswordHash(account.id, bootstrapPassword);
  }
}

/** Persist manual test user — standard registered role only; never touches owner account */
export async function bootstrapManualTestUser(): Promise<void> {
  const account = DEMO_ACCOUNTS.find((a) => isManualTestUserEmail(a.email));
  if (!account) return;

  if (account.role !== "registered") {
    throw new Error("Manual test user must remain a standard registered account");
  }
  if (isPlatformOwnerEmail(account.email)) {
    throw new Error("Manual test user email must not overlap platform owner");
  }
  if (!isStandardRegisteredUser(account)) {
    throw new Error("Manual test user must not receive admin or owner privileges");
  }
  if (resolveEffectiveRole(account) !== "registered") {
    throw new Error("Manual test user effective role must be registered");
  }

  const owner = DEMO_ACCOUNTS.find((a) => isPlatformOwnerEmail(a.email));
  if (!owner || owner.email !== PLATFORM_OWNER_EMAIL) {
    throw new Error("Platform owner account missing — aborting test user bootstrap");
  }

  if (!getStoredPasswordHash(account.id)) {
    const bootstrapPassword = getManualTestUserBootstrapPassword();
    if (!bootstrapPassword) return;
    await setAccountPasswordHash(account.id, bootstrapPassword);
    syncAccountPasswordHash(account.id, await hashPassword(bootstrapPassword));
  }

  if (!getProfileByAccountId(account.id)) {
    createProfileForAccount({
      accountId: account.id,
      fullName: account.fullName,
      email: account.email,
      role: "registered",
      gender: account.gender,
    });
  }

  ensureFreelancerStoreForAccount(account.id);
}
