import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyName } from "@/lib/profile/slugify";
import { isPlatformOwnerEmail } from "@/lib/security/roles";
import { noteSupabaseDbSyncAvailable } from "@/lib/supabase/safe-db";
import type { AdminUserRecord, BanType, UserAccountRole } from "@/types/admin";

interface ProductionAccountRow {
  id: string;
  email: string;
  account_type: string | null;
  status: string | null;
}

interface ProductionProfileRow {
  id: string;
  full_name: string | null;
  updated_at: string | null;
}

interface FullAccountRow {
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

interface FullProfileRow {
  account_id: string;
  slug: string;
  is_verified: boolean | null;
  is_premium: boolean | null;
}

const FULL_ACCOUNT_SELECT =
  "id, email, full_name, tier, primary_role, professional_unlocked, has_freelancer_store, is_banned, ban_reason, banned_until, created_at, last_login_at, updated_at";

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "PGRST204" || (message.includes("could not find") && message.includes("column"));
}

function mapAccountTypeToAdminRole(accountType: string | null, email: string): UserAccountRole {
  if (isPlatformOwnerEmail(email)) return "admin";
  switch (accountType) {
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

function deriveBanType(isBanned: boolean, bannedUntil: string | null): BanType {
  if (!isBanned) return "none";
  if (bannedUntil) return "temporary";
  return "permanent";
}

function formatJoinedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function isPremiumTier(tierId: string | null | undefined): boolean {
  if (!tierId) return false;
  const normalized = tierId.toLowerCase();
  return normalized.includes("premium") || normalized === "premium-user";
}

function mapProductionAccountToAdminUser(
  account: ProductionAccountRow,
  profile: ProductionProfileRow | undefined,
  hasCompany: boolean,
  isPremium: boolean,
  companySlug?: string
): AdminUserRecord {
  const fullName =
    profile?.full_name?.trim() || account.email.split("@")[0] || "User";
  const slug = companySlug ?? slugifyName(fullName);
  const isBanned = account.status != null && account.status !== "active";

  return {
    id: account.id,
    slug,
    fullName,
    email: account.email,
    role: mapAccountTypeToAdminRole(account.account_type, account.email),
    tier:
      account.account_type === "professional" ||
      account.account_type === "admin" ||
      account.account_type === "owner"
        ? "professional"
        : "basic",
    isVerified: false,
    isPremium,
    isBanned,
    banType: isBanned ? "permanent" : "none",
    joinedAt: formatJoinedAt(profile?.updated_at),
    lastActiveAt: profile?.updated_at ?? new Date().toISOString(),
    hasStore:
      account.account_type === "professional" ||
      account.account_type === "admin" ||
      account.account_type === "owner",
    hasCompany,
  };
}

function mapFullAccountToAdminUser(
  account: FullAccountRow,
  profile: FullProfileRow | undefined,
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

async function listUsersFromProductionSchema(limit: number): Promise<AdminUserRecord[]> {
  const admin = createAdminClient();

  const [accountsRes, profilesRes, companiesRes, subsRes, overridesRes] = await Promise.all([
    admin
      .from("accounts")
      .select("id, email, account_type, status")
      .order("email", { ascending: true })
      .limit(limit),
    admin.from("profiles").select("id, full_name, updated_at"),
    admin.from("companies").select("owner_account_id, slug"),
    admin.from("account_subscription_assignments").select("account_id, tier_id, status"),
    admin.from("subscription_manual_overrides").select("account_id, tier_id"),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (profilesRes.error && !isMissingColumnError(profilesRes.error)) throw profilesRes.error;
  if (companiesRes.error && !isMissingColumnError(companiesRes.error)) throw companiesRes.error;

  const profilesById = new Map<string, ProductionProfileRow>();
  for (const row of profilesRes.data ?? []) {
    profilesById.set(row.id as string, row as ProductionProfileRow);
  }

  const companyByOwner = new Map<string, string>();
  for (const row of companiesRes.data ?? []) {
    companyByOwner.set(row.owner_account_id as string, row.slug as string);
  }

  const premiumAccounts = new Set<string>();
  for (const row of subsRes.data ?? []) {
    if (isPremiumTier(row.tier_id as string)) {
      premiumAccounts.add(row.account_id as string);
    }
  }
  for (const row of overridesRes.data ?? []) {
    if (isPremiumTier(row.tier_id as string)) {
      premiumAccounts.add(row.account_id as string);
    }
  }

  noteSupabaseDbSyncAvailable();

  return (accountsRes.data ?? []).map((row) => {
    const account = row as ProductionAccountRow;
    const profile = profilesById.get(account.id);
    const companySlug = companyByOwner.get(account.id);
    return mapProductionAccountToAdminUser(
      account,
      profile,
      companyByOwner.has(account.id),
      premiumAccounts.has(account.id),
      companySlug
    );
  });
}

async function listUsersFromFullSchema(limit: number): Promise<AdminUserRecord[]> {
  const admin = createAdminClient();

  const [accountsRes, profilesRes, companiesRes] = await Promise.all([
    admin.from("accounts").select(FULL_ACCOUNT_SELECT).order("created_at", { ascending: false }).limit(limit),
    admin.from("professional_profiles").select("account_id, slug, is_verified, is_premium"),
    admin.from("companies").select("owner_account_id"),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (companiesRes.error) throw companiesRes.error;

  const profilesByAccount = new Map<string, FullProfileRow>();
  for (const row of profilesRes.data ?? []) {
    profilesByAccount.set(row.account_id as string, row as FullProfileRow);
  }

  const companyOwners = new Set(
    (companiesRes.data ?? []).map((row) => row.owner_account_id as string)
  );

  noteSupabaseDbSyncAvailable();

  return (accountsRes.data ?? []).map((row) =>
    mapFullAccountToAdminUser(
      row as FullAccountRow,
      profilesByAccount.get(row.id as string),
      companyOwners.has(row.id as string)
    )
  );
}

export async function listUsersForAdminFromSupabase(limit = 200): Promise<AdminUserRecord[]> {
  const admin = createAdminClient();

  const probe = await admin.from("accounts").select("id, email, account_type, status").limit(1);
  if (!probe.error) {
    return listUsersFromProductionSchema(limit);
  }

  if (isMissingColumnError(probe.error)) {
    return listUsersFromFullSchema(limit);
  }

  throw probe.error;
}

export async function updateUserRoleInSupabase(
  userId: string,
  role: UserAccountRole
): Promise<AdminUserRecord | null> {
  const admin = createAdminClient();
  const voraRole = mapAdminRoleToVoraRole(role);

  const production = await admin
    .from("accounts")
    .update({ account_type: voraRole === "registered" ? "registered" : voraRole })
    .eq("id", userId);

  if (!production.error) {
    const users = await listUsersForAdminFromSupabase();
    return users.find((user) => user.id === userId) ?? null;
  }

  if (!isMissingColumnError(production.error)) throw production.error;

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

  const production = await admin
    .from("accounts")
    .update({ status: "banned" })
    .eq("id", userId);

  if (!production.error) {
    const users = await listUsersForAdminFromSupabase();
    return users.find((user) => user.id === userId) ?? null;
  }

  if (!isMissingColumnError(production.error)) throw production.error;

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

  const production = await admin
    .from("accounts")
    .update({ status: "active" })
    .eq("id", userId);

  if (!production.error) {
    const users = await listUsersForAdminFromSupabase();
    return users.find((user) => user.id === userId) ?? null;
  }

  if (!isMissingColumnError(production.error)) throw production.error;

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
