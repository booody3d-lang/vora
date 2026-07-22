import "server-only";

import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import {
  listVerificationCandidatesFromSupabase,
  updateVerificationStatusInSupabase,
} from "@/lib/admin/admin-verification-supabase";
import { ADMIN_VERIFICATION_QUEUE } from "@/lib/admin/mock-data";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
  runOptionalDbSyncVoid,
} from "@/lib/supabase/safe-db";
import type { VerificationApplication, VerificationStatus } from "@/types/admin";

const VERIFICATION_FILE = "admin-verification.json";

interface VerificationDataFile {
  applications: VerificationApplication[];
}

let verificationTableProbed = false;
let verificationTableAvailable = false;

export async function isAdminVerificationSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (verificationTableProbed) return verificationTableAvailable;

  verificationTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("companies").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("companies missing", error);
      }
      verificationTableAvailable = false;
      return false;
    }
    verificationTableAvailable = true;
    return true;
  } catch {
    verificationTableAvailable = false;
    return false;
  }
}

function readVerificationData(): VerificationDataFile {
  return readJsonStore(VERIFICATION_FILE, () => ({
    applications: ADMIN_VERIFICATION_QUEUE,
  }));
}

function writeVerificationData(data: VerificationDataFile) {
  writeJsonStore(VERIFICATION_FILE, data);
}

function mergeVerificationQueues(
  jsonQueue: VerificationApplication[],
  liveCandidates: VerificationApplication[]
): VerificationApplication[] {
  const byId = new Map<string, VerificationApplication>();

  for (const item of jsonQueue) {
    byId.set(item.id, item);
  }

  for (const candidate of liveCandidates) {
    const existing = byId.get(candidate.id);
    if (!existing) {
      byId.set(candidate.id, candidate);
    } else if (existing.status === "pending") {
      byId.set(candidate.id, { ...candidate, status: "pending" });
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function listVerificationQueueForAdmin(): Promise<VerificationApplication[]> {
  const jsonQueue = readVerificationData().applications;

  if (!(await isAdminVerificationSupabaseReady())) {
    return jsonQueue;
  }

  const liveCandidates = await runOptionalDbSync(
    "listVerificationCandidatesFromSupabase",
    () => listVerificationCandidatesFromSupabase(),
    []
  );

  return mergeVerificationQueues(jsonQueue, liveCandidates);
}

export async function updateVerificationStatusForAdmin(
  applicationId: string,
  status: VerificationStatus
): Promise<VerificationApplication | null> {
  const data = readVerificationData();
  let index = data.applications.findIndex((app) => app.id === applicationId);
  let applicantType: VerificationApplication["applicantType"] = "individual";

  if (index >= 0) {
    applicantType = data.applications[index].applicantType;
    data.applications[index] = { ...data.applications[index], status };
    writeVerificationData(data);
  } else if (await isAdminVerificationSupabaseReady()) {
    const candidates = await listVerificationCandidatesFromSupabase();
    const candidate = candidates.find((app) => app.id === applicationId);
    if (!candidate) return null;
    applicantType = candidate.applicantType;
    const updated = { ...candidate, status };
    data.applications.unshift(updated);
    writeVerificationData(data);
    index = 0;
  } else {
    return null;
  }

  if (
    (await isAdminVerificationSupabaseReady()) &&
    isValidBillingUuid(applicationId) &&
    status === "approved"
  ) {
    await runOptionalDbSyncVoid("updateVerificationStatusForAdmin", () =>
      updateVerificationStatusInSupabase(applicationId, applicantType, status)
    );
  }

  return index >= 0 ? data.applications[index] : null;
}

export async function enqueueVerificationApplication(
  application: Omit<VerificationApplication, "id" | "submittedAt" | "status"> & {
    id?: string;
    submittedAt?: string;
    status?: VerificationStatus;
  }
): Promise<VerificationApplication> {
  const data = readVerificationData();
  const entry: VerificationApplication = {
    id: application.id ?? randomUUID(),
    applicantName: application.applicantName,
    applicantType: application.applicantType,
    documentType: application.documentType,
    documentUrl: application.documentUrl,
    submittedAt: application.submittedAt ?? new Date().toISOString(),
    status: application.status ?? "pending",
  };
  data.applications.unshift(entry);
  writeVerificationData(data);
  return entry;
}

export function isAdminVerificationPersistenceActive(): boolean {
  return verificationTableAvailable;
}
