import "server-only";

import { listActivePublicJobListings } from "@/lib/company/jobs-store";

export interface PublicJobListing {
  id: string;
  slug: string;
  title: string;
  company: string;
  companySlug: string;
  location: string;
  employmentType: string;
  description: string;
}

export async function listActivePublicJobs(): Promise<PublicJobListing[]> {
  return listActivePublicJobListings();
}

export async function listPublicJobSummaries() {
  const jobs = await listActivePublicJobs();
  return jobs.map(({ description: _description, ...job }) => job);
}

export async function getPublicJobBySlug(slug: string): Promise<PublicJobListing | null> {
  const jobs = await listActivePublicJobs();
  return jobs.find((job) => job.slug === slug) ?? null;
}
