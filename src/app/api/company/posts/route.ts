import { NextResponse } from "next/server";
import { createPostForAccount, listPostsForAccount } from "@/lib/company/posts-store";
import { requireAuthenticatedApiUser } from "@/lib/security/require-api-auth";
import type { CompanyPostType } from "@/types/company";

function parseCreatePostBody(body: unknown): {
  content: string;
  type?: CompanyPostType;
  mediaUrls?: string[];
  jobId?: string;
  jobTitle?: string;
} | null {
  if (!body || typeof body !== "object") return null;

  const input = body as Record<string, unknown>;
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content) return null;

  const type = input.type;

  return {
    content,
    type:
      type === "text" || type === "image" || type === "job_announcement"
        ? type
        : "text",
    mediaUrls: Array.isArray(input.mediaUrls)
      ? input.mediaUrls.filter((url): url is string => typeof url === "string")
      : undefined,
    jobId: typeof input.jobId === "string" ? input.jobId : undefined,
    jobTitle: typeof input.jobTitle === "string" ? input.jobTitle : undefined,
  };
}

export async function GET() {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  const posts = await listPostsForAccount(authResult.auth.user.id);
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedApiUser();
  if ("response" in authResult) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = parseCreatePostBody(body);
  if (!input) {
    return NextResponse.json({ error: "Post content is required" }, { status: 400 });
  }

  try {
    const post = await createPostForAccount(authResult.auth.user.id, input);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
