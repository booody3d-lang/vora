import { NextResponse } from "next/server";
import { acceptFollow, requestFollow } from "@/lib/network/social-store";
import { getAuthenticatedUser } from "@/lib/security/session";

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      followerAccountId?: string;
      action?: "accept" | "request";
      targetId?: string;
    };

    if (body.action === "accept") {
      if (!body.followerAccountId) {
        return NextResponse.json({ error: "followerAccountId is required" }, { status: 400 });
      }
      const result = acceptFollow({
        targetAccountId: auth.user.id,
        followerAccountId: body.followerAccountId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        isAccepted: true,
        relationship: result.relationship,
      });
    }

    if (!body.targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    const result = requestFollow({
      followerAccountId: auth.user.id,
      targetId: body.targetId,
      targetType: "user",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      relationship: result.relationship,
      followStatus: result.relationship.status,
    });
  } catch {
    return NextResponse.json({ error: "Connection action failed" }, { status: 500 });
  }
}
