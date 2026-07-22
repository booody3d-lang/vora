import "server-only";

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

export function listActivePublicJobs(): PublicJobListing[] {
  return [];
}

export function listPublicJobSummaries() {
  return listActivePublicJobs().map(({ description: _description, ...job }) => job);
}

export function getPublicJobBySlug(slug: string): PublicJobListing | null {
  return listActivePublicJobs().find((job) => job.slug === slug) ?? null;
}
