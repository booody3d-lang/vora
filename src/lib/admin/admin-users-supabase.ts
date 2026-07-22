import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserRecord, BanType, UserAccountRole } from "@/types/admin";

interface DbAccountRow {
  id: string;
  email: string;
  full_name: string | null;
  tier: "basic" | "professional";
  primary_role: string | null;
  professional_unlocked: boolean | null;
  has_freelancer_store: boolean | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  banned_until: string | null;
  created_at: string;
  last_login_at: string | null;
  updated_at: string;
}

interface DbProfileRow {
  account_id: string;
  slug: string;
  is_verified: boolean | null;
  is_premium: boolean | null;
}

const ACCOUNT_SELECT =
  "id, email, full_name, tier, primary_role, professional_unlocked, has_freelancer_store, is_banned, ban_reason, banned_until, created_at, last_login_at, updated_at";

function mapVoraRoleToAdminRole(role: string | null): UserAccountRole {
  switch (role) {
    case "professional":
      return "professional";
    case "company":
      return "company";
    case "admin":
    case "owner":
      return "admin";
    default:
      return "user";
  }
}

export function mapAdminRoleToVoraRole(role: UserAccountRole): string {
  switch (role) {
    case "professional":
      return "professional";
    case "company":
      return "company";
    case "admin":
      return "admin";
    default:
      return "registered";
  }
}

function deriveBanType(isBanned: boolean, bannedUntil: string | null): BanType {
  if (!isBanned) return "none";
  if (bannedUntil) return "temporary";
  return "permanent";
}

function formatJoinedAt(iso: string): string {
  return iso.slice(0, 10);
}

function mapAccountToAdminUser(
  account: DbAccountRow,
  profile: DbProfileRow | undefined,
  hasCompany: boolean
): AdminUserRecord {
  const isBanned = account.is_banned ?? false;
  const tier =
    account.tier === "professional" || account.professional_unlocked
      ? "professional"
      : "basic";

  return {
    id: account.id,
    slug: profile?.slug ?? account.id,
    fullName: account.full_name?.trim() || account.email.split("@")[0] || "User",
    email: account.email,
    role: mapVoraRoleToAdminRole(account.primary_role),
    tier,
    isVerified: profile?.is_verified ?? false,
    isPremium: profile?.is_premium ?? false,
    isBanned,
    banType: deriveBanType(isBanned, account.banned_until),
    banReason: account.ban_reason ?? undefined,
    joinedAt: formatJoinedAt(account.created_at),
    lastActiveAt: account.last_login_at ?? account.updated_at,
    hasStore: account.has_freelancer_store ?? false,
    hasCompany,
  };
}

export async function listUsersForAdminFromSupabase(limit = 200): Promise<AdminUserRecord[]> {
  const admin = createAdminClient();

  const [accountsRes, profilesRes, companiesRes] = await Promise.all([
    admin.from("accounts").select(ACCOUNT_SELECT).order("created_at", { ascending: false }).limit(limit),
    admin.from("professional_profiles").select("account_id, slug, is_verified, is_premium"),
    admin.from("companies").select("owner_account_id"),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (companiesRes.error) throw companiesRes.error;

  const profilesByAccount = new Map<string, DbProfileRow>();
  for (const row of profilesRes.data ?? []) {
    profilesByAccount.set(row.account_id as string, row as DbProfileRow);
  }

  const companyOwners = new Set(
    (companiesRes.data ?? []).map((row) => row.owner_account_id as string)
  );

  return (accountsRes.data ?? []).map((row) =>
    mapAccountToAdminUser(row as DbAccountRow, profilesByAccount.get(row.id as string), companyOwners.has(row.id as string))
  );
}

export async function updateUserRoleInSupabase(
  userId: string,
  role: UserAccountRole
): Promise<AdminUserRecord | null> {
  const admin = createAdminClient();
  const voraRole = mapAdminRoleToVoraRole(role);
  const professionalUnlocked = role === "professional" || role === "admin";

  const { error } = await admin
    .from("accounts")
    .update({
      primary_role: voraRole,
      professional_unlocked: professionalUnlocked,
      tier: professionalUnlocked ? "professional" : "basic",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  const users = await listUsersForAdminFromSupabase();
  return users.find((user) => user.id === userId) ?? null;
}

export async function banUserInSupabase(
  userId: string,
  banType: BanType,
  reason: string
): Promise<AdminUserRecord | null> {
  const admin = createAdminClient();
  const bannedUntil =
    banType === "temporary"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error } = await admin
    .from("accounts")
    .update({
      is_banned: true,
      ban_reason: reason.trim(),
      banned_until: bannedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  const users = await listUsersForAdminFromSupabase();
  return users.find((user) => user.id === userId) ?? null;
}

export async function unbanUserInSupabase(userId: string): Promise<AdminUserRecord | null> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("accounts")
    .update({
      is_banned: false,
      ban_reason: null,
      banned_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  const users = await listUsersForAdminFromSupabase();
  return users.find((user) => user.id === userId) ?? null;
}
