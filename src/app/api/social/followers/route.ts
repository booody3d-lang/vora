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
  const targetType = (searchParams.get("targetType") ?? "user") as FollowTargetType;
  const targetId = searchParams.get("targetId")?.trim() || auth.user.id;

  if (targetType !== "user" && targetType !== "company") {
    return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
  }

  if (targetType === "user") {
    if (auth.user.id !== targetId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [followers, followerCount] = await Promise.all([
      listFollowersForOwner(targetId),
      getFollowerCount(targetId, "user"),
    ]);

    return NextResponse.json({
      targetId,
      followerCount,
      followers,
    });
  }

  const company = await getCompanyById(targetId);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const ownerCompany = await getCompanyByAccountId(auth.user.id);
  if (!ownerCompany || ownerCompany.id !== targetId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [followers, followerCount] = await Promise.all([
    listCompanyFollowersForOwner(targetId),
    getFollowerCount(targetId, "company"),
  ]);

  return NextResponse.json({
    targetId,
    followerCount,
    followers,
  });
}
