import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { getCompanyById } from "@/lib/company/company-store";
import { findAccountById } from "@/lib/security/demo-store";
import {
  getAccountIdByProfileSlug,
  getProfileByAccountId,
} from "@/lib/profile/profile-store";

const DATA_FILE = "social-data.json";

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

function readData(): SocialDataFile {
  const data = readJsonStore(DATA_FILE, () => ({ follows: [] as FollowRelationship[] }));
  if (!data.follows) data.follows = [];
  return data;
}

function writeData(data: SocialDataFile) {
  writeJsonStore(DATA_FILE, data);
}

function edgeId(followerId: string, targetId: string, targetType: FollowTargetType): string {
  return `${followerId}:${targetType}:${targetId}`;
}

function isCompanyAccount(accountId: string): boolean {
  return findAccountById(accountId)?.role === "company";
}

export function isKnownCompanyId(companyId: string): boolean {
  return getCompanyById(companyId) !== null;
}

export function requestFollow(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): { ok: true; relationship: FollowRelationship } | { ok: false; error: string } {
  if (input.followerAccountId === input.targetId) {
    return { ok: false, error: "Cannot follow yourself" };
  }

  if (isCompanyAccount(input.followerAccountId)) {
    return { ok: false, error: "Company accounts cannot follow users" };
  }

  const targetType = input.targetType ?? "user";
  if (targetType === "user" && !getProfileByAccountId(input.targetId)) {
    return { ok: false, error: "User not found" };
  }
  if (targetType === "company" && !isKnownCompanyId(input.targetId)) {
    return { ok: false, error: "Company not found" };
  }

  const data = readData();
  const id = edgeId(input.followerAccountId, input.targetId, targetType);
  const existing = data.follows.find((f) => f.id === id);

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

export function acceptFollow(input: {
  targetAccountId: string;
  followerAccountId: string;
}): { ok: true; relationship: FollowRelationship } | { ok: false; error: string } {
  const data = readData();
  const id = edgeId(input.followerAccountId, input.targetAccountId, "user");
  const relationship = data.follows.find((f) => f.id === id);

  if (!relationship || relationship.targetType !== "user") {
    return { ok: false, error: "Follow request not found" };
  }

  relationship.status = "accepted";
  relationship.acceptedAt = new Date().toISOString();
  writeData(data);
  return { ok: true, relationship };
}

export function unfollow(input: {
  followerAccountId: string;
  targetId: string;
  targetType?: FollowTargetType;
}): boolean {
  const data = readData();
  const targetType = input.targetType ?? "user";
  const id = edgeId(input.followerAccountId, input.targetId, targetType);
  const before = data.follows.length;
  data.follows = data.follows.filter((f) => f.id !== id);
  if (data.follows.length === before) return false;
  writeData(data);
  return true;
}

export function getFollowerCount(targetId: string, targetType: FollowTargetType = "user"): number {
  const data = readData();
  return data.follows.filter(
    (f) =>
      f.targetId === targetId &&
      f.targetType === targetType &&
      f.status !== "declined"
  ).length;
}

export function getFollowingCount(accountId: string): number {
  const data = readData();
  return data.follows.filter(
    (f) => f.followerAccountId === accountId && f.status !== "declined"
  ).length;
}

export function getRelationship(
  followerAccountId: string,
  targetId: string,
  targetType: FollowTargetType = "user"
): FollowRelationship | null {
  const data = readData();
  const id = edgeId(followerAccountId, targetId, targetType);
  return data.follows.find((f) => f.id === id) ?? null;
}

export function canInitiateMessage(fromAccountId: string, toAccountId: string): boolean {
  if (fromAccountId === toAccountId) return false;

  const outbound = getRelationship(fromAccountId, toAccountId, "user");
  const inbound = getRelationship(toAccountId, fromAccountId, "user");

  return outbound?.status === "accepted" || inbound?.status === "accepted";
}

export function getSocialProfileContext(
  viewerAccountId: string | null,
  targetAccountId: string
): SocialProfileContext {
  const followerCount = getFollowerCount(targetAccountId, "user");
  const followingCount = getFollowingCount(targetAccountId);

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

  const outbound = getRelationship(viewerAccountId, targetAccountId, "user");
  const inbound = getRelationship(targetAccountId, viewerAccountId, "user");

  return {
    followerCount,
    followingCount,
    isFollowing: Boolean(outbound && outbound.status !== "declined"),
    isFollower: Boolean(inbound && inbound.status !== "declined"),
    isAccepted: outbound?.status === "accepted" || inbound?.status === "accepted",
    followStatus: outbound?.status ?? null,
    canMessage: canInitiateMessage(viewerAccountId, targetAccountId),
  };
}

export function getCompanySocialContext(
  viewerAccountId: string | null,
  companyId: string
): SocialProfileContext {
  const followerCount = getFollowerCount(companyId, "company");

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

  const outbound = getRelationship(viewerAccountId, companyId, "company");

  return {
    followerCount,
    followingCount: getFollowingCount(viewerAccountId),
    isFollowing: outbound?.status === "accepted",
    isFollower: false,
    isAccepted: outbound?.status === "accepted",
    followStatus: outbound?.status ?? null,
    canMessage: false,
  };
}

export function listFollowersForOwner(ownerAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter(
      (f) => f.targetId === ownerAccountId && f.targetType === "user" && f.status !== "declined"
    )
    .map((f) => {
      const profile = getProfileByAccountId(f.followerAccountId);
      return {
        accountId: f.followerAccountId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: f.status,
        since: f.acceptedAt ?? f.createdAt,
      };
    });
}

export function listFollowingForOwner(ownerAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter((f) => f.followerAccountId === ownerAccountId && f.status !== "declined")
    .map((f) => {
      if (f.targetType === "company") {
        const company = getCompanyById(f.targetId);
        return {
          accountId: f.targetId,
          fullName: company?.name ?? "Company",
          headline: company?.tagline ?? "",
          status: f.status,
          since: f.acceptedAt ?? f.createdAt,
        };
      }
      const profile = getProfileByAccountId(f.targetId);
      return {
        accountId: f.targetId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: f.status,
        since: f.acceptedAt ?? f.createdAt,
      };
    });
}

export function getAccountIdForProfileSlug(slug: string): string | null {
  return getAccountIdByProfileSlug(slug);
}

export function getIncomingPendingFollows(targetAccountId: string): FollowListEntry[] {
  const data = readData();
  return data.follows
    .filter(
      (f) =>
        f.targetId === targetAccountId &&
        f.targetType === "user" &&
        f.status === "pending"
    )
    .map((f) => {
      const profile = getProfileByAccountId(f.followerAccountId);
      return {
        accountId: f.followerAccountId,
        fullName: profile?.fullName ?? "User",
        headline: profile?.headline ?? "",
        profileSlug: profile?.slug,
        status: f.status,
        since: f.createdAt,
      };
    });
}
