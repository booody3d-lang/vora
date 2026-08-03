import type { User } from "@supabase/supabase-js";
import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
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

interface ProductionAccountRow {
  id: string;
  email: string;
  account_type: string | null;
  status: string | null;
}

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

/** Production PostgREST schema (slim accounts table). */
const PRODUCTION_ACCOUNT_SELECT = "id, email, account_type, status";

/** Full migration schema when extended account columns exist. */
const FULL_ACCOUNT_SELECT =
  "id, email, full_name, primary_role, gender, phone, phone_verified, totp_enabled, is_banned, professional_unlocked, has_freelancer_store";

function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return error.code === "PGRST204" || (message.includes("could not find") && message.includes("column"));
}

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

function mapRoleToAuthUser(
  row: Pick<ProductionAccountRow, "id" | "email">,
  role: VoraRole,
  extras?: Partial<Pick<DbAccountRow, "full_name" | "gender" | "phone" | "phone_verified" | "totp_enabled" | "is_banned" | "professional_unlocked" | "has_freelancer_store"> & { status?: string | null }>
): AuthUser {
  const isBanned =
    extras?.is_banned ??
    (typeof extras?.status === "string" ? extras.status !== "active" : false);

  return {
    id: row.id,
    email: row.email,
    fullName: extras?.full_name ?? "",
    role,
    phone: extras?.phone ?? undefined,
    phoneVerified: extras?.phone_verified ?? false,
    totpEnabled: extras?.totp_enabled ?? false,
    isBanned,
    professionalUnlocked:
      extras?.professional_unlocked ?? role === "professional" || role === "owner" || role === "admin",
    hasFreelancerStore: extras?.has_freelancer_store ?? role === "professional",
    hasProfessionalProfile: role !== "company",
    gender: extras?.gender ?? undefined,
  };
}

export function mapProductionAccount(row: ProductionAccountRow): AuthUser {
  const role = parseRole(row.account_type) ?? "registered";
  return mapRoleToAuthUser(row, role, { status: row.status });
}

export function mapDbAccount(row: DbAccountRow): AuthUser {
  const role = row.primary_role ?? "registered";
  return mapRoleToAuthUser(row, role, row);
}

async function fetchAccountById(accountId: string): Promise<AuthUser | null> {
  if (!isAdminClientAvailable()) return null;

  const admin = createAdminClient();

  const production = await admin
    .from("accounts")
    .select(PRODUCTION_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle();

  if (!production.error && production.data) {
    return mapProductionAccount(production.data as ProductionAccountRow);
  }

  if (production.error && !isMissingColumnError(production.error) && !isMissingRelationError(production.error)) {
    console.error("[supabase-account] production fetch failed:", production.error.message);
  }

  const full = await admin
    .from("accounts")
    .select(FULL_ACCOUNT_SELECT)
    .eq("id", accountId)
    .maybeSingle();

  if (!full.error && full.data) {
    return mapDbAccount(full.data as DbAccountRow);
  }

  if (full.error && !isMissingRelationError(full.error)) {
    console.error("[supabase-account] full fetch failed:", full.error.message);
  }

  return null;
}

export function buildAuthUserFromMetadata(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const role = parseRole(meta.role) ?? "registered";
  const phoneFromMeta = typeof meta.phone === "string" ? meta.phone : undefined;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: String(meta.full_name ?? meta.fullName ?? ""),
    role,
    phone: phoneFromMeta ?? user.phone ?? undefined,
    phoneVerified: Boolean(meta.phone_verified ?? user.phone_confirmed_at),
    totpEnabled: false,
    isBanned: false,
    professionalUnlocked: role === "professional" || role === "owner" || role === "admin",
    hasFreelancerStore: role === "professional",
    hasProfessionalProfile: role !== "company",
    gender: parseGender(meta.gender),
  };
}

export async function findAccountByPhoneFromDb(phoneE164: string): Promise<AuthUser | null> {
  if (!isAdminClientAvailable()) return null;

  return runOptionalDbSync(
    "find account by phone",
    async () => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("accounts")
        .select(FULL_ACCOUNT_SELECT)
        .eq("phone", phoneE164)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) {
          markSupabaseDbSyncUnavailable("find account by phone", error);
        }
        throw error;
      }

      return data ? mapDbAccount(data as DbAccountRow) : null;
    },
    null
  );
}

export async function upsertAccountRow(
  authUser: AuthUser,
  extras?: { phoneCountry?: string; preferredOtpChannel?: "sms" | "whatsapp" }
): Promise<void> {
  if (!isAdminClientAvailable()) return;

  await runOptionalDbSyncVoid("upsert account row", async () => {
    const admin = createAdminClient();
    const productionPayload = {
      id: authUser.id,
      email: authUser.email,
      account_type: authUser.role,
      status: authUser.isBanned ? "suspended" : "active",
    };

    const production = await admin.from("accounts").upsert(productionPayload, { onConflict: "id" });
    if (!production.error) return;

    const { error } = await admin.from("accounts").upsert(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.fullName,
        primary_role: authUser.role,
        gender: authUser.gender ?? null,
        phone: authUser.phone ?? null,
        phone_verified: authUser.phoneVerified,
        professional_unlocked: authUser.professionalUnlocked,
        has_freelancer_store: authUser.hasFreelancerStore,
        is_banned: authUser.isBanned,
        totp_enabled: authUser.totpEnabled,
        ...(extras?.phoneCountry ? { phone_country: extras.phoneCountry } : {}),
        ...(extras?.preferredOtpChannel
          ? { preferred_otp_channel: extras.preferredOtpChannel }
          : {}),
      },
      { onConflict: "id" }
    );

    if (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        if (isMissingColumnError(production.error) && isMissingColumnError(error)) {
          console.error("[supabase-account] upsert failed:", error.message);
        }
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
  const fromDb = await fetchAccountById(user.id);
  const authUser = fromDb ?? buildAuthUserFromMetadata(user);
  if (!fromDb) {
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
