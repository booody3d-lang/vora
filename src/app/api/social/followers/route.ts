import { NextResponse } from "next/server";
import { getCompanyByAccountId, getCompanyById } from "@/lib/company/company-store";
import {
  getFollowerCount,
  listCompanyFollowersForOwner,
  listFollowersForOwner,
  type FollowTargetType,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedTargetId = searchParams.get("targetId")?.trim();
  const targetType = (searchParams.get("targetType") ?? "user") as FollowTargetType;

  if (targetType !== "user" && targetType !== "company") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (targetType === "user") {
    // Always use the authenticated session account — never trust a mismatched client id.
    const ownerAccountId = auth.user.id;
    if (requestedTargetId && requestedTargetId !== ownerAccountId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let followers: Awaited<ReturnType<typeof listFollowersForOwner>> = [];
    let followerCount = 0;
    let listError: string | null = null;

    try {
      [followers, followerCount] = await Promise.all([
        listFollowersForOwner(ownerAccountId),
        getFollowerCount(ownerAccountId, "user"),
      ]);
    } catch (error) {
      listError = error instanceof Error ? error.message : "Failed to load followers";
      console.error("[api/social/followers] user list failed:", listError);
      try {
        followerCount = await getFollowerCount(ownerAccountId, "user");
      } catch {
        followerCount = 0;
      }
    }

    // Keep count aligned with returned rows when resolution succeeds.
    if (!listError && followers.length > 0) {
      followerCount = Math.max(followerCount, followers.length);
    }

    return NextResponse.json({
      ownerAccountId,
      followers,
      followerCount,
      ...(listError ? { warning: listError } : {}),
    });
  }

  if (!requestedTargetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  const company = await getCompanyById(requestedTargetId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const ownerCompany = await getCompanyByAccountId(auth.user.id);
  if (!ownerCompany || ownerCompany.id !== requestedTargetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [followers, followerCount] = await Promise.all([
    listCompanyFollowersForOwner(requestedTargetId),
    getFollowerCount(requestedTargetId, "company"),
  ]);

  return NextResponse.json({
    ownerAccountId: auth.user.id,
    companyId: requestedTargetId,
    followers,
    followerCount,
  });
}
