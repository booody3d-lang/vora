import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyPost, CompanyPostType } from "@/types/company";

interface DbPostRow {
  id: string;
  company_id: string;
  content: string;
  media_urls: string[] | null;
  post_type: string;
  job_id: string | null;
  created_at: string;
}

export interface CreateCompanyPostInput {
  content: string;
  type?: CompanyPostType;
  mediaUrls?: string[];
  jobId?: string;
  jobTitle?: string;
}

export function mapPostRow(row: DbPostRow, jobTitle?: string): CompanyPost {
  return {
    id: row.id,
    type: (row.post_type as CompanyPostType) || "text",
    content: row.content,
    mediaUrls: row.media_urls?.length ? row.media_urls : undefined,
    jobTitle: jobTitle ?? undefined,
    createdAt: row.created_at,
  };
}

function mapPostToInsertRow(
  companyId: string,
  input: CreateCompanyPostInput
): Record<string, unknown> {
  return {
    company_id: companyId,
    content: input.content.trim(),
    post_type: input.type ?? "text",
    media_urls: input.mediaUrls ?? [],
    job_id: input.jobId ?? null,
  };
}

export async function listPostsByCompanyFromSupabase(companyId: string): Promise<CompanyPost[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_posts")
    .select("*, jobs(title)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const job = row.jobs as { title?: string } | null;
    return mapPostRow(row as DbPostRow, job?.title);
  });
}

export async function createPostInSupabase(
  companyId: string,
  input: CreateCompanyPostInput
): Promise<CompanyPost> {
  const admin = createAdminClient();
  const row = mapPostToInsertRow(companyId, input);

  const { data, error } = await admin.from("company_posts").insert(row).select("*").single();
  if (error) throw error;

  let jobTitle = input.jobTitle;
  if (input.jobId && !jobTitle) {
    const { data: job } = await admin.from("jobs").select("title").eq("id", input.jobId).maybeSingle();
    jobTitle = job?.title ?? undefined;
  }

  return mapPostRow(data as DbPostRow, jobTitle);
}

export async function deletePostInSupabase(postId: string, companyId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error, count } = await admin
    .from("company_posts")
    .delete({ count: "exact" })
    .eq("id", postId)
    .eq("company_id", companyId);

  if (error) throw error;
  return (count ?? 0) > 0;
}
