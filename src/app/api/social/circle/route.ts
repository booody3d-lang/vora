import { NextResponse } from "next/server";
import {
  getIncomingPendingFollows,
  listFollowersForOwner,
  listFollowingForOwner,
  requestFollow,
  unfollow,
} from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";
import type { FollowTargetType } from "@/lib/network/social-store";

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [followers, following, pendingIncoming] = await Promise.all([
    listFollowersForOwner(auth.user.id),
    listFollowingForOwner(auth.user.id),
    getIncomingPendingFollows(auth.user.id),
  ]);

  return NextResponse.json({
    followers,
    following,
    pendingIncoming,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      targetId?: string;
      targetType?: FollowTargetType;
    };

    if (!body.targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    const result = await requestFollow({
      followerAccountId: auth.user.id,
      targetId: body.targetId,
      targetType: body.targetType ?? "user",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      relationship: result.relationship,
      isFollowing: true,
      isAccepted: result.relationship.status === "accepted",
      followStatus: result.relationship.status,
    });
  } catch {
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      targetId?: string;
      targetType?: FollowTargetType;
    };

    if (!body.targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    await unfollow({
      followerAccountId: auth.user.id,
      targetId: body.targetId,
      targetType: body.targetType ?? "user",
    });

    return NextResponse.json({ ok: true, isFollowing: false, isAccepted: false });
  } catch {
    return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
  }
}
