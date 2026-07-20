import type { User } from "@supabase/supabase-js";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import {
  createProfileForAccount,
  getGenderForAccount,
  getProfileByAccountId,
  getProfileSlugForAccount,
  getStoreSlugForAccount,
} from "@/lib/profile/profile-store";
import { ensureSupabaseProfileAndStore } from "@/lib/supabase/profile-persistence";
import { resolveEffectiveRole } from "@/lib/security/roles";
import type { UserGender } from "@/types/profile";
import type { AuthUser, VoraRole } from "@/types/security";

interface DbAccountRow {
  id: string;
  email: string;
  full_name: string | null;
  primary_role: VoraRole | null;
  gender: UserGender | null;
  phone: string | null;
  phone_verified: boolean | null;
  totp_enabled: boolean | null;
  is_banned: boolean | null;
  professional_unlocked: boolean | null;
  has_freelancer_store: boolean | null;
}

const ACCOUNT_SELECT =
  "id, email, full_name, primary_role, gender, phone, phone_verified, totp_enabled, is_banned, professional_unlocked, has_freelancer_store";

function parseRole(value: unknown): VoraRole | null {
  const roles: VoraRole[] = ["registered", "professional", "company", "admin", "owner"];
  if (typeof value === "string" && roles.includes(value as VoraRole)) {
    return value as VoraRole;
  }
  return null;
}

function parseGender(value: unknown): UserGender | undefined {
  if (value === "male" || value === "female") return value;
  return undefined;
}

export function mapDbAccount(row: DbAccountRow): AuthUser {
  const role = row.primary_role ?? "registered";
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? "",
    role,
    phone: row.phone ?? undefined,
    phoneVerified: row.phone_verified ?? false,
    totpEnabled: row.totp_enabled ?? false,
    isBanned: row.is_banned ?? false,
    professionalUnlocked: row.professional_unlocked ?? role === "professional",
    hasFreelancerStore: row.has_freelancer_store ?? false,
    hasProfessionalProfile: role !== "company",
    gender: row.gender ?? undefined,
  };
}

export function buildAuthUserFromMetadata(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const role = parseRole(meta.role) ?? "registered";
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: String(meta.full_name ?? meta.fullName ?? ""),
    role,
    phoneVerified: false,
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: role === "professional" || role === "owner" || role === "admin",
    hasFreelancerStore: role === "professional",
    hasProfessionalProfile: role !== "company",
    gender: parseGender(meta.gender),
  };
}

export async function upsertAccountRow(authUser: AuthUser): Promise<void> {
  if (!isAdminClientAvailable()) return;

  await runOptionalDbSyncVoid("upsert account row", async () => {
    const admin = createAdminClient();
    const { error } = await admin.from("accounts").upsert(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.fullName,
        primary_role: authUser.role,
        gender: authUser.gender ?? null,
        professional_unlocked: authUser.professionalUnlocked,
        has_freelancer_store: authUser.hasFreelancerStore,
        is_banned: authUser.isBanned,
        phone_verified: authUser.phoneVerified,
        totp_enabled: authUser.totpEnabled,
      },
      { onConflict: "id" }
    );

    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("upsert account row", error);
      } else {
        console.error("[supabase-account] upsert failed:", error.message);
      }
    }
  });
}

export function ensureLocalProfile(authUser: AuthUser): void {
  if (getProfileByAccountId(authUser.id)) return;

  createProfileForAccount({
    accountId: authUser.id,
    fullName: authUser.fullName,
    email: authUser.email,
    role: authUser.role,
    gender: authUser.gender,
    hasFreelancerStore: authUser.hasFreelancerStore,
  });
}

export async function resolveAuthUser(user: User): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      markSupabaseDbSyncUnavailable("fetch account row", error);
    } else {
      console.error("[supabase-account] fetch failed:", error.message);
    }
  }

  const authUser = row ? mapDbAccount(row as DbAccountRow) : buildAuthUserFromMetadata(user);
  if (!row) {
    await upsertAccountRow(authUser);
  }

  ensureLocalProfile(authUser);
  await ensureSupabaseProfileAndStore(authUser);
  return authUser;
}

export function enrichAuthUser(authUser: AuthUser): AuthUser {
  const effectiveRole = resolveEffectiveRole(authUser);
  return {
    ...authUser,
    role: effectiveRole,
    profileSlug: getProfileSlugForAccount(authUser.id) ?? undefined,
    storeSlug: getStoreSlugForAccount(authUser.id) ?? undefined,
    gender: getGenderForAccount(authUser.id) ?? authUser.gender,
  };
}
