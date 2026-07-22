import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
} from "@/lib/supabase/safe-db";
import type { FollowRelationship } from "@/lib/network/social-store";

let companyFollowersTableProbed = false;
let companyFollowersTableAvailable = false;

export async function isCompanyFollowersSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (companyFollowersTableProbed) return companyFollowersTableAvailable;

  companyFollowersTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("company_followers").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("company_followers missing", error);
      }
      companyFollowersTableAvailable = false;
      return false;
    }
    companyFollowersTableAvailable = true;
    return true;
  } catch {
    companyFollowersTableAvailable = false;
    return false;
  }
}

export async function followCompanyInSupabase(
  followerId: string,
  companyId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("company_followers").upsert(
    {
      company_id: companyId,
      follower_id: followerId,
    },
    { onConflict: "company_id,follower_id", ignoreDuplicates: true }
  );

  if (error) throw error;
  return true;
}

export async function unfollowCompanyInSupabase(
  followerId: string,
  companyId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { error, count } = await admin
    .from("company_followers")
    .delete({ count: "exact" })
    .eq("company_id", companyId)
    .eq("follower_id", followerId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getCompanyFollowerCountFromSupabase(companyId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("company_followers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) throw error;
  return count ?? 0;
}

export async function isFollowingCompanyInSupabase(
  followerId: string,
  companyId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_followers")
    .select("id")
    .eq("company_id", companyId)
    .eq("follower_id", followerId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function migrateJsonCompanyFollowsToSupabase(
  companyFollows: FollowRelationship[]
): Promise<number> {
  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("company_followers")
    .select("*", { count: "exact", head: true });

  if (countError) throw countError;
  if ((count ?? 0) > 0) return 0;

  let migrated = 0;
  for (const follow of companyFollows) {
    if (follow.targetType !== "company" || follow.status !== "accepted") continue;

    const { error } = await admin.from("company_followers").upsert(
      {
        company_id: follow.targetId,
        follower_id: follow.followerAccountId,
        created_at: follow.createdAt,
      },
      { onConflict: "company_id,follower_id", ignoreDuplicates: true }
    );

    if (!error) migrated += 1;
  }

  return migrated;
}
