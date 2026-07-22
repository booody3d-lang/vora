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
  getApplicationByIdFromSupabase,
  insertNoteInSupabase,
  listApplicationsByJobFromSupabase,
  listNotesFromSupabase,
  updateApplicationRatingInSupabase,
  updateApplicationStageInSupabase,
} from "@/lib/company/applications-supabase";
import { getJobByIdForAccount } from "@/lib/company/jobs-store";
import type { ApplicantCard, AtsStage, InternalNote } from "@/types/company";

const DATA_FILE = "company-applications.json";

interface CompanyApplicationsFile {
  byJob: Record<string, ApplicantCard[]>;
  notes: Record<string, InternalNote[]>;
}

let applicationsTableProbed = false;
let applicationsTableAvailable = false;

export async function isApplicationsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (applicationsTableProbed) return applicationsTableAvailable;

  applicationsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("job_applications").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("job_applications missing", error);
      }
      applicationsTableAvailable = false;
      return false;
    }
    applicationsTableAvailable = true;
    return true;
  } catch {
    applicationsTableAvailable = false;
    return false;
  }
}

function readApplicationsData(): CompanyApplicationsFile {
  const data = readJsonStore(DATA_FILE, () => ({
    byJob: {} as Record<string, ApplicantCard[]>,
    notes: {} as Record<string, InternalNote[]>,
  }));
  if (!data.byJob) data.byJob = {};
  if (!data.notes) data.notes = {};
  return data;
}

function writeApplicationsData(data: CompanyApplicationsFile) {
  writeJsonStore(DATA_FILE, data);
}

function listApplicantsFromJson(jobId: string): ApplicantCard[] {
  return readApplicationsData().byJob[jobId] ?? [];
}

function getApplicantFromJson(jobId: string, applicationId: string): ApplicantCard | null {
  return listApplicantsFromJson(jobId).find((applicant) => applicant.applicationId === applicationId) ?? null;
}

function saveApplicantToJson(jobId: string, applicant: ApplicantCard) {
  const data = readApplicationsData();
  const applicants = data.byJob[jobId] ?? [];
  const index = applicants.findIndex((entry) => entry.applicationId === applicant.applicationId);
  if (index >= 0) {
    applicants[index] = applicant;
  } else {
    applicants.push(applicant);
  }
  data.byJob[jobId] = applicants;
  writeApplicationsData(data);
}

function listNotesFromJson(applicationId: string): InternalNote[] {
  return readApplicationsData().notes[applicationId] ?? [];
}

function saveNoteToJson(applicationId: string, note: InternalNote) {
  const data = readApplicationsData();
  const notes = data.notes[applicationId] ?? [];
  notes.push(note);
  data.notes[applicationId] = notes;
  writeApplicationsData(data);
}

async function assertJobAccess(accountId: string, jobId: string) {
  const job = await getJobByIdForAccount(accountId, jobId);
  if (!job) {
    throw new Error("Job not found");
  }
  return job;
}

export async function listApplicantsForJob(
  accountId: string,
  jobId: string
): Promise<ApplicantCard[]> {
  await assertJobAccess(accountId, jobId);

  const jsonFallback = listApplicantsFromJson(jobId);
  if (!(await isApplicationsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listApplicantsForJob",
    () => listApplicationsByJobFromSupabase(jobId),
    jsonFallback
  );
}

export async function getApplicantForJob(
  accountId: string,
  jobId: string,
  applicationId: string
): Promise<ApplicantCard | null> {
  await assertJobAccess(accountId, jobId);

  const jsonFallback = getApplicantFromJson(jobId, applicationId);
  if (!(await isApplicationsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getApplicantForJob",
    () => getApplicationByIdFromSupabase(applicationId, jobId),
    jsonFallback
  );
}

export async function updateApplicantStage(
  accountId: string,
  jobId: string,
  applicationId: string,
  stage: AtsStage,
  sortOrder: number
): Promise<ApplicantCard | null> {
  await assertJobAccess(accountId, jobId);

  const jsonExisting = getApplicantFromJson(jobId, applicationId);
  const jsonUpdated = jsonExisting ? { ...jsonExisting, stage, sortOrder } : null;

  if (jsonUpdated) {
    saveApplicantToJson(jobId, jsonUpdated);
  }

  if (!(await isApplicationsSupabaseReady())) {
    return jsonUpdated;
  }

  const updated = await runOptionalDbSync(
    "updateApplicantStage",
    () => updateApplicationStageInSupabase(applicationId, jobId, { stage, sortOrder }),
    jsonUpdated
  );

  if (updated) {
    saveApplicantToJson(jobId, updated);
  }

  return updated;
}

export async function updateApplicantRating(
  accountId: string,
  jobId: string,
  applicationId: string,
  hrRating: number
): Promise<ApplicantCard | null> {
  await assertJobAccess(accountId, jobId);

  const jsonExisting = getApplicantFromJson(jobId, applicationId);
  const jsonUpdated = jsonExisting ? { ...jsonExisting, hrRating } : null;

  if (jsonUpdated) {
    saveApplicantToJson(jobId, jsonUpdated);
  }

  if (!(await isApplicationsSupabaseReady())) {
    return jsonUpdated;
  }

  const updated = await runOptionalDbSync(
    "updateApplicantRating",
    () => updateApplicationRatingInSupabase(applicationId, jobId, hrRating),
    jsonUpdated
  );

  if (updated) {
    saveApplicantToJson(jobId, updated);
  }

  return updated;
}

export async function listInternalNotes(
  accountId: string,
  jobId: string,
  applicationId: string
): Promise<InternalNote[]> {
  const applicant = await getApplicantForJob(accountId, jobId, applicationId);
  if (!applicant) return [];

  const jsonFallback = listNotesFromJson(applicationId);
  if (!(await isApplicationsSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listInternalNotes",
    () => listNotesFromSupabase(applicationId),
    jsonFallback
  );
}

export async function addInternalNote(
  accountId: string,
  jobId: string,
  applicationId: string,
  content: string,
  authorName = "HR Team"
): Promise<InternalNote | null> {
  const applicant = await getApplicantForJob(accountId, jobId, applicationId);
  if (!applicant) return null;

  const jsonNote: InternalNote = {
    id: `n-${Date.now().toString(36)}`,
    authorName,
    content,
    createdAt: new Date().toISOString(),
  };
  saveNoteToJson(applicationId, jsonNote);

  if (!(await isApplicationsSupabaseReady())) {
    return jsonNote;
  }

  return runOptionalDbSync(
    "addInternalNote",
    () => insertNoteInSupabase(applicationId, accountId, content),
    jsonNote
  );
}
