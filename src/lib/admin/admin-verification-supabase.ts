import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { VerificationApplication, VerificationStatus } from "@/types/admin";

function mapCompanyToApplication(row: {
  id: string;
  name: string;
  created_at: string;
  website_url: string | null;
}): VerificationApplication {
  return {
    id: row.id,
    applicantName: row.name,
    applicantType: "company",
    documentType: "Commercial Registration (CR)",
    documentUrl: row.website_url ?? "#",
    submittedAt: row.created_at,
    status: "pending",
  };
}

function mapProfileToApplication(row: {
  id: string;
  full_name: string | null;
  resume_url: string | null;
  created_at: string;
  accounts?: { full_name?: string | null } | { full_name?: string | null }[] | null;
}): VerificationApplication {
  const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
  const applicantName =
    row.full_name?.trim() || account?.full_name?.trim() || "Professional applicant";

  return {
    id: row.id,
    applicantName,
    applicantType: "individual",
    documentType: "Professional identity document",
    documentUrl: row.resume_url ?? "#",
    submittedAt: row.created_at,
    status: "pending",
  };
}

export async function listVerificationCandidatesFromSupabase(): Promise<VerificationApplication[]> {
  const admin = createAdminClient();

  const [companiesRes, profilesRes] = await Promise.all([
    admin
      .from("companies")
      .select("id, name, created_at, website_url")
      .eq("is_verified", false)
      .order("created_at", { ascending: false }),
    admin
      .from("professional_profiles")
      .select("id, full_name, resume_url, created_at, accounts(full_name)")
      .eq("is_verified", false)
      .order("created_at", { ascending: false }),
  ]);

  if (companiesRes.error) throw companiesRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const applications = [
    ...(companiesRes.data ?? []).map((row) =>
      mapCompanyToApplication(row as Parameters<typeof mapCompanyToApplication>[0])
    ),
    ...(profilesRes.data ?? []).map((row) =>
      mapProfileToApplication(row as Parameters<typeof mapProfileToApplication>[0])
    ),
  ];

  return applications.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function approveVerificationInSupabase(
  applicationId: string,
  applicantType: VerificationApplication["applicantType"]
): Promise<void> {
  const admin = createAdminClient();

  if (applicantType === "company") {
    const { error } = await admin
      .from("companies")
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq("id", applicationId);
    if (error) throw error;
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("professional_profiles")
    .select("account_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("Verification application not found");

  const { error } = await admin
    .from("professional_profiles")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) throw error;

  await admin
    .from("freelancer_stores")
    .update({ is_verified: true, updated_at: new Date().toISOString() })
    .eq("account_id", profile.account_id as string);
}

export async function updateVerificationStatusInSupabase(
  applicationId: string,
  applicantType: VerificationApplication["applicantType"],
  status: VerificationStatus
): Promise<void> {
  if (status === "approved") {
    await approveVerificationInSupabase(applicationId, applicantType);
  }
}
