import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicJobBySlug } from "@/lib/jobs/listings";
import { buildJobMetadata } from "@/lib/seo/metadata";
import { jobPostingJsonLd } from "@/lib/seo/json-ld";
import { JobApplyButton } from "@/components/professional/JobApplyButton";

interface JobPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = getPublicJobBySlug(slug);
  if (!job) return {};
  return buildJobMetadata(job);
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { slug } = await params;
  const job = getPublicJobBySlug(slug);
  if (!job) notFound();

  const jsonLd = jobPostingJsonLd({
    ...job,
    description: job.description || `Join ${job.company} as ${job.title}. ${job.location} · ${job.employmentType}`,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/network/jobs" className="text-sm text-[#3B5998] hover:underline">
        ← Back to Jobs
      </Link>
      <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0F172A]">{job.title}</h1>
        <p className="mt-1 text-lg text-[#3B5998]">{job.company}</p>
        <p className="mt-2 text-sm text-slate-500">
          {job.location} · {job.employmentType}
        </p>
        <div className="mt-6 prose prose-sm max-w-none text-slate-600">
          <p>{job.description}</p>
        </div>
        <div className="mt-6">
          <JobApplyButton jobId={job.id} jobTitle={job.title} profile={{ resumeUrl: "/resume.pdf", headline: "Designer", skillCount: 5 }} />
        </div>
      </article>
    </div>
  );
}
