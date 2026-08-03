import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByAccountId } from "@/lib/profile/profile-store";
import {
  isSupabasePersistenceEnabled,
  loadProfileForAccount,
} from "@/lib/supabase/profile-persistence";
import { isMissingRelationError } from "@/lib/supabase/safe-db";
import type { FollowListEntry, FollowStatus } from "@/lib/network/social-store";

async function fetchProfileSlugFromDb(accountId: string): Promise<string | null> {
  if (!isSupabasePersistenceEnabled()) return null;

  const admin = createAdminClient();
  const lookups: Array<{ table: string; column: string }> = [
    { table: "professional_profiles", column: "account_id" },
    { table: "profiles", column: "id" },
    { table: "profiles", column: "account_id" },
  ];

  for (const { table, column } of lookups) {
    const { data, error } = await admin
      .from(table)
      .select("slug")
      .eq(column, accountId)
      .maybeSingle();

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error(`[follow-list-resolve] slug lookup ${table}:`, error.message);
      }
      continue;
    }

    const slug = (data as { slug?: string } | null)?.slug;
    if (slug) return slug;
  }

  return null;
}

async function fetchAccountDisplayName(accountId: string): Promise<string | null> {
  if (!isSupabasePersistenceEnabled()) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounts")
    .select("full_name, email")
    .eq("id", accountId)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("[follow-list-resolve] account lookup:", error.message);
    }
    return null;
  }

  return (data?.full_name as string | undefined) ?? (data?.email as string | undefined) ?? null;
}

export async function resolveFollowListEntryForAccount(
  accountId: string,
  status: FollowStatus,
  since: string
): Promise<FollowListEntry> {
  const cached = getProfileByAccountId(accountId);
  if (cached) {
    return {
      accountId,
      fullName: cached.fullName,
      headline: cached.headline ?? "",
      profileSlug: cached.slug,
      status,
      since,
    };
  }

  const loaded = await loadProfileForAccount(accountId);
  if (loaded) {
    return {
      accountId,
      fullName: loaded.fullName,
      headline: loaded.headline ?? "",
      profileSlug: loaded.slug,
      status,
      since,
    };
  }

  const [accountName, profileSlug] = await Promise.all([
    fetchAccountDisplayName(accountId),
    fetchProfileSlugFromDb(accountId),
  ]);

  return {
    accountId,
    fullName: accountName ?? "User",
    headline: "",
    profileSlug: profileSlug ?? undefined,
    status,
    since,
  };
}
