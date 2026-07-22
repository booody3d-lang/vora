import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ApplicantCard, AtsStage, InternalNote } from "@/types/company";

interface DbApplicationRow {
  id: string;
  job_id: string;
  applicant_account_id: string;
  professional_score_at_apply: number;
  resume_url: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
  ats_stage: AtsStage;
  video_pitch_url: string | null;
  hr_rating: number | null;
  sort_order: number;
  moved_at: string;
}

interface DbProfileRow {
  account_id: string;
  full_name: string | null;
  headline: string | null;
  profile_photo_url: string | null;
  professional_score: number;
  resume_url: string | null;
}

interface DbAccountRow {
  id: string;
  full_name: string | null;
}

interface DbNoteRow {
  id: string;
  application_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

function fallbackPhoto(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function mapApplicationRow(
  row: DbApplicationRow,
  profile?: DbProfileRow | null,
  account?: DbAccountRow | null
): ApplicantCard {
  const fullName =
    profile?.full_name?.trim() ||
    account?.full_name?.trim() ||
    "Applicant";

  return {
    id: row.id,
    applicationId: row.id,
    accountId: row.applicant_account_id,
    fullName,
    headline: profile?.headline?.trim() || "Professional",
    profilePhotoUrl: profile?.profile_photo_url || fallbackPhoto(fullName),
    professionalScore: profile?.professional_score ?? row.professional_score_at_apply,
    resumeUrl: row.resume_url || profile?.resume_url || "/sample-resume.pdf",
    videoPitchUrl: row.video_pitch_url ?? undefined,
    stage: row.ats_stage,
    sortOrder: row.sort_order,
    appliedAt: row.created_at,
    hrRating: row.hr_rating ?? undefined,
  };
}

export function mapNoteRow(row: DbNoteRow, authorName: string): InternalNote {
  return {
    id: row.id,
    authorName,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function loadProfilesForAccounts(accountIds: string[]): Promise<Map<string, DbProfileRow>> {
  if (accountIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("professional_profiles")
    .select("account_id, full_name, headline, profile_photo_url, professional_score, resume_url")
    .in("account_id", accountIds);

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.account_id as string, row as DbProfileRow]));
}

async function loadAccountsForIds(accountIds: string[]): Promise<Map<string, DbAccountRow>> {
  if (accountIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounts")
    .select("id, full_name")
    .in("id", accountIds);

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id as string, row as DbAccountRow]));
}

async function loadAuthorNames(authorIds: string[]): Promise<Map<string, string>> {
  const accounts = await loadAccountsForIds(authorIds);
  const names = new Map<string, string>();
  for (const [id, account] of accounts) {
    names.set(id, account.full_name?.trim() || "HR Team");
  }
  return names;
}

export async function listApplicationsByJobFromSupabase(jobId: string): Promise<ApplicantCard[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as DbApplicationRow[];
  const accountIds = rows.map((row) => row.applicant_account_id);
  const [profiles, accounts] = await Promise.all([
    loadProfilesForAccounts(accountIds),
    loadAccountsForIds(accountIds),
  ]);

  return rows.map((row) =>
    mapApplicationRow(
      row,
      profiles.get(row.applicant_account_id),
      accounts.get(row.applicant_account_id)
    )
  );
}

export async function getApplicationByIdFromSupabase(
  applicationId: string,
  jobId?: string
): Promise<ApplicantCard | null> {
  const admin = createAdminClient();
  let query = admin.from("job_applications").select("*").eq("id", applicationId);
  if (jobId) query = query.eq("job_id", jobId);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as DbApplicationRow;
  const [profiles, accounts] = await Promise.all([
    loadProfilesForAccounts([row.applicant_account_id]),
    loadAccountsForIds([row.applicant_account_id]),
  ]);

  return mapApplicationRow(
    row,
    profiles.get(row.applicant_account_id),
    accounts.get(row.applicant_account_id)
  );
}

export async function updateApplicationStageInSupabase(
  applicationId: string,
  jobId: string,
  input: { stage: AtsStage; sortOrder: number }
): Promise<ApplicantCard | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_applications")
    .update({
      ats_stage: input.stage,
      sort_order: input.sortOrder,
      moved_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("job_id", jobId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbApplicationRow;
  const [profiles, accounts] = await Promise.all([
    loadProfilesForAccounts([row.applicant_account_id]),
    loadAccountsForIds([row.applicant_account_id]),
  ]);

  return mapApplicationRow(
    row,
    profiles.get(row.applicant_account_id),
    accounts.get(row.applicant_account_id)
  );
}

export async function updateApplicationRatingInSupabase(
  applicationId: string,
  jobId: string,
  hrRating: number
): Promise<ApplicantCard | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_applications")
    .update({ hr_rating: hrRating })
    .eq("id", applicationId)
    .eq("job_id", jobId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbApplicationRow;
  const [profiles, accounts] = await Promise.all([
    loadProfilesForAccounts([row.applicant_account_id]),
    loadAccountsForIds([row.applicant_account_id]),
  ]);

  return mapApplicationRow(
    row,
    profiles.get(row.applicant_account_id),
    accounts.get(row.applicant_account_id)
  );
}

export async function listNotesFromSupabase(applicationId: string): Promise<InternalNote[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("application_internal_notes")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as DbNoteRow[];
  const authorIds = rows.map((row) => row.author_id);
  const authorNames = await loadAuthorNames(authorIds);

  return rows.map((row) => mapNoteRow(row, authorNames.get(row.author_id) ?? "HR Team"));
}

export async function insertNoteInSupabase(
  applicationId: string,
  authorId: string,
  content: string
): Promise<InternalNote> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("application_internal_notes")
    .insert({
      application_id: applicationId,
      author_id: authorId,
      content,
    })
    .select("*")
    .single();

  if (error) throw error;

  const row = data as DbNoteRow;
  const authorNames = await loadAuthorNames([authorId]);
  return mapNoteRow(row, authorNames.get(authorId) ?? "HR Team");
}
