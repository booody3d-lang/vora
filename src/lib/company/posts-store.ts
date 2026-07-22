import "server-only";

import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import { getCompanyByAccountId } from "@/lib/company/company-store";
import {
  createPostInSupabase,
  deletePostInSupabase,
  listPostsByCompanyFromSupabase,
  type CreateCompanyPostInput,
} from "@/lib/company/posts-supabase";
import type { CompanyPost } from "@/types/company";

const DATA_FILE = "company-posts.json";

interface CompanyPostsFile {
  byCompany: Record<string, CompanyPost[]>;
}

let postsTableProbed = false;
let postsTableAvailable = false;

export async function isPostsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (postsTableProbed) return postsTableAvailable;

  postsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("company_posts").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("company_posts missing", error);
      }
      postsTableAvailable = false;
      return false;
    }
    postsTableAvailable = true;
    return true;
  } catch {
    postsTableAvailable = false;
    return false;
  }
}

function readPostsData(): CompanyPostsFile {
  const data = readJsonStore(DATA_FILE, () => ({
    byCompany: {} as Record<string, CompanyPost[]>,
  }));
  if (!data.byCompany) data.byCompany = {};
  return data;
}

function writePostsData(data: CompanyPostsFile) {
  writeJsonStore(DATA_FILE, data);
}

function listPostsFromJson(companyId: string): CompanyPost[] {
  return readPostsData().byCompany[companyId] ?? [];
}

function savePostToJson(companyId: string, post: CompanyPost) {
  const data = readPostsData();
  const posts = data.byCompany[companyId] ?? [];
  data.byCompany[companyId] = [post, ...posts.filter((entry) => entry.id !== post.id)];
  writePostsData(data);
}

function removePostFromJson(companyId: string, postId: string): boolean {
  const data = readPostsData();
  const posts = data.byCompany[companyId] ?? [];
  const next = posts.filter((post) => post.id !== postId);
  if (next.length === posts.length) return false;
  data.byCompany[companyId] = next;
  writePostsData(data);
  return true;
}

function buildJsonPost(companyId: string, input: CreateCompanyPostInput): CompanyPost {
  return {
    id: `cp-${Date.now().toString(36)}`,
    type: input.type ?? "text",
    content: input.content.trim(),
    mediaUrls: input.mediaUrls,
    jobTitle: input.jobTitle,
    createdAt: new Date().toISOString(),
  };
}

export async function listPostsForCompany(companyId: string): Promise<CompanyPost[]> {
  const jsonFallback = listPostsFromJson(companyId);

  if (!(await isPostsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listPostsForCompany",
    () => listPostsByCompanyFromSupabase(companyId),
    jsonFallback
  );
}

export async function listPostsForAccount(accountId: string): Promise<CompanyPost[]> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return [];
  return listPostsForCompany(company.id);
}

export async function createPostForAccount(
  accountId: string,
  input: CreateCompanyPostInput
): Promise<CompanyPost> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) {
    throw new Error("Company not found");
  }

  const jsonPost = buildJsonPost(company.id, input);
  savePostToJson(company.id, jsonPost);

  if (!(await isPostsSupabaseReady())) {
    return jsonPost;
  }

  const created = await runOptionalDbSync(
    "createPostForAccount",
    () => createPostInSupabase(company.id, input),
    jsonPost
  );

  if (created.id !== jsonPost.id) {
    const data = readPostsData();
    const posts = (data.byCompany[company.id] ?? []).filter((post) => post.id !== jsonPost.id);
    data.byCompany[company.id] = [created, ...posts];
    writePostsData(data);
  }

  return created;
}

export async function deletePostForAccount(
  accountId: string,
  postId: string
): Promise<boolean> {
  const company = await getCompanyByAccountId(accountId);
  if (!company) return false;

  const removed = removePostFromJson(company.id, postId);

  if (!(await isPostsSupabaseReady())) {
    return removed;
  }

  return runOptionalDbSync(
    "deletePostForAccount",
    () => deletePostInSupabase(postId, company.id),
    removed
  );
}

export async function createJobAnnouncementPost(
  accountId: string,
  input: { jobId: string; jobTitle: string; content?: string }
): Promise<CompanyPost | null> {
  try {
    return await createPostForAccount(accountId, {
      type: "job_announcement",
      content: input.content ?? `We're hiring: ${input.jobTitle}`,
      jobId: input.jobId,
      jobTitle: input.jobTitle,
    });
  } catch {
    return null;
  }
}
