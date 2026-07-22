import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileByAccountId } from "@/lib/profile/profile-store";
import type {
  FollowListEntry,
  FollowRelationship,
  FollowStatus,
} from "@/lib/network/social-store";

interface DbConnectionRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FollowStatus;
  created_at: string;
  updated_at: string;
}

function edgeId(followerId: string, targetId: string): string {
  return `${followerId}:user:${targetId}`;
}

function mapRowToRelationship(row: DbConnectionRow): FollowRelationship {
  return {
    id: edgeId(row.requester_id, row.recipient_id),
    followerAccountId: row.requester_id,
    targetId: row.recipient_id,
    targetType: "user",
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.status === "accepted" ? row.updated_at : undefined,
  };
}

export async function requestFollowInSupabase(input: {
  followerAccountId: string;
  targetId: string;
}): Promise<{ ok: true; relationship: FollowRelationship } | { ok: false; error: string }> {
  if (!getProfileByAccountId(input.targetId)) {
    return { ok: false, error: "User not found" };
  }

  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("connections")
    .select("*")
    .eq("requester_id", input.followerAccountId)
    .eq("recipient_id", input.targetId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    if (existing.status === "declined") {
      const { data: updated, error } = await admin
        .from("connections")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return { ok: true, relationship: mapRowToRelationship(updated as DbConnectionRow) };
    }
    return { ok: true, relationship: mapRowToRelationship(existing as DbConnectionRow) };
  }

  const { data: inserted, error } = await admin
    .from("connections")
    .insert({
      requester_id: input.followerAccountId,
      recipient_id: input.targetId,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return { ok: true, relationship: mapRowToRelationship(inserted as DbConnectionRow) };
}

export async function acceptFollowInSupabase(input: {
  targetAccountId: string;
  followerAccountId: string;
}): Promise<{ ok: true; relationship: FollowRelationship } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from("connections")
    .select("*")
    .eq("requester_id", input.followerAccountId)
    .eq("recipient_id", input.targetAccountId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return { ok: false, error: "Follow request not found" };

  const { data: updated, error } = await admin
    .from("connections")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error) throw error;
  return { ok: true, relationship: mapRowToRelationship(updated as DbConnectionRow) };
}

export async function unfollowInSupabase(input: {
  followerAccountId: string;
  targetId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { error, count } = await admin
    .from("connections")
    .delete({ count: "exact" })
    .eq("requester_id", input.followerAccountId)
    .eq("recipient_id", input.targetId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getRelationshipFromSupabase(
  followerAccountId: string,
  targetId: string
): Promise<FollowRelationship | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("requester_id", followerAccountId)
    .eq("recipient_id", targetId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToRelationship(data as DbConnectionRow);
}

export async function getFollowerCountFromSupabase(targetId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("connections")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", targetId)
    .neq("status", "declined");

  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingUserCountFromSupabase(accountId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("connections")
    .select("*", { count: "exact", head: true })
    .eq("requester_id", accountId)
    .neq("status", "declined");

  if (error) throw error;
  return count ?? 0;
}

function mapConnectionToFollowListEntry(
  row: DbConnectionRow,
  accountIdKey: "requester_id" | "recipient_id"
): FollowListEntry | null {
  const accountId = row[accountIdKey];
  const profile = getProfileByAccountId(accountId);
  if (!profile) return null;

  return {
    accountId,
    fullName: profile.fullName,
    headline: profile.headline,
    profileSlug: profile.slug,
    status: row.status,
    since: row.status === "accepted" ? row.updated_at : row.created_at,
  };
}

export async function listFollowersForOwnerFromSupabase(
  ownerAccountId: string
): Promise<FollowListEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("recipient_id", ownerAccountId)
    .neq("status", "declined")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as DbConnectionRow[])
    .map((row) => mapConnectionToFollowListEntry(row, "requester_id"))
    .filter((entry): entry is FollowListEntry => entry !== null);
}

export async function listFollowingUsersFromSupabase(
  ownerAccountId: string
): Promise<FollowListEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("requester_id", ownerAccountId)
    .neq("status", "declined")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as DbConnectionRow[])
    .map((row) => mapConnectionToFollowListEntry(row, "recipient_id"))
    .filter((entry): entry is FollowListEntry => entry !== null);
}

export async function getIncomingPendingFollowsFromSupabase(
  targetAccountId: string
): Promise<FollowListEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("*")
    .eq("recipient_id", targetAccountId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as DbConnectionRow[])
    .map((row) => mapConnectionToFollowListEntry(row, "requester_id"))
    .filter((entry): entry is FollowListEntry => entry !== null);
}

export async function countConnectionsInSupabase(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("connections")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function migrateJsonSocialToSupabase(
  userFollows: FollowRelationship[]
): Promise<number> {
  const admin = createAdminClient();
  const existingCount = await countConnectionsInSupabase();
  if (existingCount > 0) return 0;

  let migrated = 0;
  for (const follow of userFollows) {
    if (follow.targetType !== "user") continue;

    const { error } = await admin.from("connections").upsert(
      {
        requester_id: follow.followerAccountId,
        recipient_id: follow.targetId,
        status: follow.status,
        created_at: follow.createdAt,
        updated_at: follow.acceptedAt ?? follow.createdAt,
      },
      { onConflict: "requester_id,recipient_id" }
    );

    if (!error) migrated += 1;
  }

  return migrated;
}

export async function canInitiateMessageInSupabase(
  fromAccountId: string,
  toAccountId: string
): Promise<boolean> {
  if (fromAccountId === toAccountId) return false;

  const outbound = await getRelationshipFromSupabase(fromAccountId, toAccountId);
  const inbound = await getRelationshipFromSupabase(toAccountId, fromAccountId);

  return outbound?.status === "accepted" || inbound?.status === "accepted";
}
