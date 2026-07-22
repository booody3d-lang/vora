import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  acceptFollowInSupabase,
  canInitiateMessageInSupabase,
  getFollowerCountFromSupabase,
  getFollowingUserCountFromSupabase,
  getIncomingPendingFollowsFromSupabase,
  getRelationshipFromSupabase,
  listFollowersForOwnerFromSupabase,
  listFollowingUsersFromSupabase,
  migrateJsonSocialToSupabase,
  requestFollowInSupabase,
  unfollowInSupabase,
} from "@/lib/network/social-supabase";
import { getCompanyByIdSync, isKnownCompanyId } from "@/lib/company/company-store";
import { findAccountById } from "@/lib/security/demo-store";
import {
  getAccountIdByProfileSlug,
  getProfileByAccountId,
} from "@/lib/profile/profile-store";

const DATA_FILE = "social-data.json";
const MIGRATION_FLAG = "social-supabase-migrated.json";

export type FollowTargetType = "user" | "company";
export type FollowStatus = "pending" | "accepted" | "declined";

export interface FollowRelationship {
  id: string;
  followerAccountId: string;
  targetId: string;
  targetType: FollowTargetType;
  status: FollowStatus;
  createdAt: string;
  acceptedAt?: string;
}

export interface FollowListEntry {
  accountId: string;
  fullName: string;
  headline: string;
  profileSlug?: string;
  status: FollowStatus;
  since: string;
}

export interface SocialProfileContext {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollower: boolean;
  isAccepted: boolean;
  followStatus: FollowStatus | null;
  canMessage: boolean;
}

interface SocialDataFile {
  follows: FollowRelationship[];
}

let socialTableProbed = false;
let socialTableAvailable = false;

async function isSocialSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (socialTableProbed) return socialTableAvailable;

  socialTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("connections").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("connections missing", error);
      }
      socialTableAvailable = false;
      return false;
    }
    socialTableAvailable = true;
    return true;
  } catch {
    socialTableAvailable = false;
    return false;
  }
}

function readData(): SocialDataFile {
  const data = readJsonStore(DATA_FILE, () => ({ follows: [] as FollowRelationship[] }));
  if (!data.follows) data.follows = [];
  return data;
}

function writeData(data: SocialDataFile) {
  writeJsonStore(DATA_FILE, data);
}

function companyFollows(data: SocialDataFile): FollowRelationship[] {
  return data.follows.filter((follow) => follow.targetType === "company");
}

function edgeId(followerId: string, targetId: string, targetType: FollowTargetType): string {
  return `${followerId}:${targetType}:${targetId}`;
}

function isCompanyAccount(accountId: string): boolean {
  return findAccountById(accountId)?.role === "company";
}


async function maybeMigrateJsonToSupabase(): Promise<void> {
  if (!(await isSocialSupabaseReady())) return;

  const flag = readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean }));
  if (flag.done) return;

  const data = readData();
  const userFollows = data.follows.filter((follow) => follow.targetType === "user");

  await runOptionalDbSync("social-json-migration", async () => {
    const migrated = await migrateJsonSocialToSupabase(userFollows);
    writeJsonStore(MIGRATION_FLAG, {
      done: true,
      migratedAt: new Date().toISOString(),
      migratedConnections: migrated,
    });
    return migrated;
  }, 0);

  if (!readJsonStore(MIGRATION_FLAG, () => ({ done: false as boolean })).done) {
    writeJsonStore(MIGRATION_FLAG, { done: true, skipped: true });
  }
}

export async function requestFollow(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): Promise<{ ok: true; relationship: FollowRelationship } | { ok: false; error: string }> {
  if (input.followerAccountId === input.targetId) {
    return { ok: false, error: "Cannot follow yourself" };
  }

  if (isCompanyAccount(input.followerAccountId)) {
    return { ok: false, error: "Company accounts cannot follow users" };
  }

  const targetType = input.targetType ?? "user";

  if (targetType === "company") {
    return requestFollowJson(input);
  }

  if (!getProfileByAccountId(input.targetId)) {
    return { ok: false, error: "User not found" };
  }

  if (await isSocialSupabaseReady()) {
    await maybeMigrateJsonToSupabase();
    return runOptionalDbSync(
      "requestFollow",
      () => requestFollowInSupabase(input),
      requestFollowJson(input)
    );
  }

  return requestFollowJson(input);
}

function requestFollowJson(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): { ok: true; relationship: FollowRelationship } | { ok: false; error: string } {
  const targetType = input.targetType ?? "user";
  if (targetType === "user" && !getProfileByAccountId(input.targetId)) {
    return { ok: false, error: "User not found" };
  }
  if (targetType === "company" && !isKnownCompanyId(input.targetId)) {
    return { ok: false, error: "Company not found" };
  }

  const data = readData();
  const id = edgeId(input.followerAccountId, input.targetId, targetType);
  const existing = data.follows.find((follow) => follow.id === id);

  if (existing) {
    if (existing.status === "declined") {
      existing.status = targetType === "company" ? "accepted" : "pending";
      existing.createdAt = new Date().toISOString();
      existing.acceptedAt = targetType === "company" ? new Date().toISOString() : undefined;
      writeData(data);
    }
    return { ok: true, relationship: existing };
  }

  const relationship: FollowRelationship = {
    id,
    followerAccountId: input.followerAccountId,
    targetId: input.targetId,
    targetType,
    status: targetType === "company" ? "accepted" : "pending",
    createdAt: new Date().toISOString(),
    acceptedAt: targetType === "company" ? new Date().toISOString() : undefined,
  };

  data.follows.push(relationship);
  writeData(data);
  return { ok: true, relationship };
}

export async function acceptFollow(input: {
  targetAccountId: string;
  followerAccountId: string;
}): Promise<{ ok: true; relationship: FollowRelationship } | { ok: false; error: string }> {
  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "acceptFollow",
      () => acceptFollowInSupabase(input),
      acceptFollowJson(input)
    );
  }
  return acceptFollowJson(input);
}

function acceptFollowJson(input: {
  targetAccountId: string;
  followerAccountId: string;
}): { ok: true; relationship: FollowRelationship } | { ok: false; error: string } {
  const data = readData();
  const id = edgeId(input.followerAccountId, input.targetAccountId, "user");
  const relationship = data.follows.find((follow) => follow.id === id);

  if (!relationship || relationship.targetType !== "user") {
    return { ok: false, error: "Follow request not found" };
  }

  relationship.status = "accepted";
  relationship.acceptedAt = new Date().toISOString();
  writeData(data);
  return { ok: true, relationship };
}

export async function unfollow(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): Promise<boolean> {
  const targetType = input.targetType ?? "user";

  if (targetType === "company") {
    return unfollowJson(input);
  }

  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "unfollow",
      () => unfollowInSupabase(input),
      unfollowJson(input)
    );
  }

  return unfollowJson(input);
}

function unfollowJson(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): boolean {
  const data = readData();
  const targetType = input.targetType ?? "user";
  const id = edgeId(input.followerAccountId, input.targetId, targetType);
  const before = data.follows.length;
  data.follows = data.follows.filter((follow) => follow.id !== id);
  if (data.follows.length === before) return false;
  writeData(data);
  return true;
}

export async function getFollowerCount(
  targetId: string,
  targetType: FollowTargetType = "user"
): Promise<number> {
  if (targetType === "company") {
    return getFollowerCountJson(targetId, targetType);
  }

  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "getFollowerCount",
      () => getFollowerCountFromSupabase(targetId),
      getFollowerCountJson(targetId, targetType)
    );
  }

  return getFollowerCountJson(targetId, targetType);
}

function getFollowerCountJson(targetId: string, targetType: FollowTargetType = "user"): number {
  const data = readData();
  return data.follows.filter(
    (follow) =>
      follow.targetId === targetId &&
      follow.targetType === targetType &&
      follow.status !== "declined"
  ).length;
}

export async function getFollowingCount(accountId: string): Promise<number> {
  const companyCount = readData().follows.filter(
    (follow) => follow.followerAccountId === accountId && follow.targetType === "company"
  ).length;

  if (await isSocialSupabaseReady()) {
    const userCount = await runOptionalDbSync(
      "getFollowingCount",
      () => getFollowingUserCountFromSupabase(accountId),
      readData().follows.filter(
        (follow) => follow.followerAccountId === accountId && follow.status !== "declined"
      ).length
    );
    return userCount + companyCount;
  }

  return getFollowingCountJson(accountId);
}

function getFollowingCountJson(accountId: string): number {
  const data = readData();
  return data.follows.filter(
    (follow) => follow.followerAccountId === accountId && follow.status !== "declined"
  ).length;
}

export async function getRelationship(
  followerAccountId: string,
  targetId: string,
  targetType: FollowTargetType = "user"
): Promise<FollowRelationship | null> {
  if (targetType === "company") {
    return getRelationshipJson(followerAccountId, targetId, targetType);
  }

  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "getRelationship",
      () => getRelationshipFromSupabase(followerAccountId, targetId),
      getRelationshipJson(followerAccountId, targetId, targetType)
    );
  }

  return getRelationshipJson(followerAccountId, targetId, targetType);
}

function getRelationshipJson(
  followerAccountId: string,
  targetId: string,
  targetType: FollowTargetType = "user"
): FollowRelationship | null {
  const data = readData();
  const id = edgeId(followerAccountId, targetId, targetType);
  return data.follows.find((follow) => follow.id === id) ?? null;
}

export async function canInitiateMessage(
  fromAccountId: string,
  toAccountId: string
): Promise<boolean> {
  if (fromAccountId === toAccountId) return false;

  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "canInitiateMessage",
      () => canInitiateMessageInSupabase(fromAccountId, toAccountId),
      canInitiateMessageJson(fromAccountId, toAccountId)
    );
  }

  return canInitiateMessageJson(fromAccountId, toAccountId);
}

function canInitiateMessageJson(fromAccountId: string, toAccountId: string): boolean {
  const data = readData();
  const outbound = data.follows.find(
    (follow) =>
      follow.followerAccountId === fromAccountId &&
      follow.targetId === toAccountId &&
      follow.targetType === "user"
  );
  const inbound = data.follows.find(
    (follow) =>
      follow.followerAccountId === toAccountId &&
      follow.targetId === fromAccountId &&
      follow.targetType === "user"
  );

  return outbound?.status === "accepted" || inbound?.status === "accepted";
}

export async function getSocialProfileContext(
  viewerAccountId: string | null,
  targetAccountId: string
): Promise<SocialProfileContext> {
  const followerCount = await getFollowerCount(targetAccountId, "user");
  const followingCount = await getFollowingCount(targetAccountId);

  if (!viewerAccountId || viewerAccountId === targetAccountId) {
    return {
      followerCount,
      followingCount,
      isFollowing: false,
      isFollower: false,
      isAccepted: false,
      followStatus: null,
      canMessage: false,
    };
  }

  const outbound = await getRelationship(viewerAccountId, targetAccountId, "user");
  const inbound = await getRelationship(targetAccountId, viewerAccountId, "user");

  return {
    followerCount,
    followingCount,
    isFollowing: Boolean(outbound && outbound.status !== "declined"),
    isFollower: Boolean(inbound && inbound.status !== "declined"),
    isAccepted: outbound?.status === "accepted" || inbound?.status === "accepted",
    followStatus: outbound?.status ?? null,
    canMessage: await canInitiateMessage(viewerAccountId, targetAccountId),
  };
}

export async function getCompanySocialContext(
  viewerAccountId: string | null,
  companyId: string
): Promise<SocialProfileContext> {
  const followerCount = await getFollowerCount(companyId, "company");

  if (!viewerAccountId) {
    return {
      followerCount,
      followingCount: 0,
      isFollowing: false,
      isFollower: false,
      isAccepted: false,
      followStatus: null,
      canMessage: false,
    };
  }

  const outbound = await getRelationship(viewerAccountId, companyId, "company");

  return {
    followerCount,
    followingCount: await getFollowingCount(viewerAccountId),
    isFollowing: outbound?.status === "accepted",
    isFollower: false,
    isAccepted: outbound?.status === "accepted",
    followStatus: outbound?.status ?? null,
    canMessage: false,
  };
}

export async function listFollowersForOwner(ownerAccountId: string): Promise<FollowListEntry[]> {
  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "listFollowersForOwner",
      () => listFollowersForOwnerFromSupabase(ownerAccountId),
      listFollowersForOwnerJson(ownerAccountId)
    );
  }
  return listFollowersForOwnerJson(ownerAccountId);
}

function listFollowersForOwnerJson(ownerAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter(
      (follow) =>
        follow.targetId === ownerAccountId &&
        follow.targetType === "user" &&
        follow.status !== "declined"
    )
    .map((follow) => {
      const profile = getProfileByAccountId(follow.followerAccountId);
      return {
        accountId: follow.followerAccountId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: follow.status,
        since: follow.acceptedAt ?? follow.createdAt,
      };
    });
}

export async function listFollowingForOwner(ownerAccountId: string): Promise<FollowListEntry[]> {
  const companyEntries = listFollowingCompaniesJson(ownerAccountId);

  if (await isSocialSupabaseReady()) {
    const userEntries = await runOptionalDbSync(
      "listFollowingForOwner",
      () => listFollowingUsersFromSupabase(ownerAccountId),
      listFollowingUsersJson(ownerAccountId)
    );
    return [...userEntries, ...companyEntries];
  }

  return [...listFollowingUsersJson(ownerAccountId), ...companyEntries];
}

function listFollowingUsersJson(ownerAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter(
      (follow) =>
        follow.followerAccountId === ownerAccountId &&
        follow.targetType === "user" &&
        follow.status !== "declined"
    )
    .map((follow) => {
      const profile = getProfileByAccountId(follow.targetId);
      return {
        accountId: follow.targetId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: follow.status,
        since: follow.acceptedAt ?? follow.createdAt,
      };
    });
}

function listFollowingCompaniesJson(ownerAccountId: string): FollowListEntry[] {
  const data = readData();
  return companyFollows(data)
    .filter((follow) => follow.followerAccountId === ownerAccountId)
    .map((follow) => {
      const company = getCompanyByIdSync(follow.targetId);
      return {
        accountId: follow.targetId,
        fullName: company?.name ?? "Company",
        headline: company?.tagline ?? "",
        status: follow.status,
        since: follow.acceptedAt ?? follow.createdAt,
      };
    });
}

export function getAccountIdForProfileSlug(slug: string): string | null {
  return getAccountIdByProfileSlug(slug);
}

export async function getIncomingPendingFollows(
  targetAccountId: string
): Promise<FollowListEntry[]> {
  if (await isSocialSupabaseReady()) {
    return runOptionalDbSync(
      "getIncomingPendingFollows",
      () => getIncomingPendingFollowsFromSupabase(targetAccountId),
      getIncomingPendingFollowsJson(targetAccountId)
    );
  }
  return getIncomingPendingFollowsJson(targetAccountId);
}

function getIncomingPendingFollowsJson(targetAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter(
      (follow) =>
        follow.targetId === targetAccountId &&
        follow.targetType === "user" &&
        follow.status === "pending"
    )
    .map((follow) => {
      const profile = getProfileByAccountId(follow.followerAccountId);
      return {
        accountId: follow.followerAccountId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: follow.status,
        since: follow.createdAt,
      };
    });
}
