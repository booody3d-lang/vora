"use client";

import { useState } from "react";
import Link from "next/link";
import { FollowButton } from "@/components/network/connections/FollowButton";
import { useTranslations } from "@/i18n/use-translations";
import type { CompanyProfile, CompanyTab } from "@/types/company";
import type { CompanyPost, JobPosting } from "@/types/company";
import { cn } from "@/lib/utils";

const TAB_IDS: CompanyTab[] = ["home", "about", "posts", "jobs"];

const TAB_LABEL_KEYS: Record<CompanyTab, string> = {
  home: "company.page.tabHome",
  about: "company.page.tabAbout",
  posts: "company.page.tabPosts",
  jobs: "company.page.tabJobs",
};

interface CompanyPageViewProps {
  company: CompanyProfile;
  posts: CompanyPost[];
  jobs: JobPosting[];
  initiallyFollowing?: boolean;
}

export function CompanyPageView({
  company,
  posts,
  jobs,
  initiallyFollowing = false,
}: CompanyPageViewProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<CompanyTab>("home");

  return (
    <div className="mx-auto max-w-[900px] px-4 py-4 md:px-6 md:py-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-44 bg-gradient-to-r from-[#0F172A] to-[#3B5998] md:h-52">
          {company.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="relative px-5 pb-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="-mt-10 h-20 w-20 rounded-xl border-4 border-white bg-white object-cover md:-mt-12 md:h-24 md:w-24"
                />
              ) : (
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-xl border-4 border-white bg-slate-100 text-2xl md:-mt-12 md:h-24 md:w-24">
                  🏢
                </div>
              )}
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-[#0F172A] md:text-2xl">{company.name}</h1>
                  {company.isVerified && (
                    <span className="rounded-full bg-[#3B5998]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#3B5998]">
                      ✓ {t("company.page.verified")}
                    </span>
                  )}
                </div>
                {company.tagline && (
                  <p className="mt-1 text-sm text-slate-600">{company.tagline}</p>
                )}
              </div>
            </div>
            <FollowButton
              targetUserId={company.id}
              targetType="company"
              initiallyFollowing={initiallyFollowing}
              initiallyAccepted={initiallyFollowing}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
            {company.websiteUrl && (
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B5998] hover:underline"
              >
                🌐 {company.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
            {company.industry && <span>🏭 {company.industry}</span>}
            {company.sizeRange && <span>👥 {company.sizeRange}</span>}
            {company.headquarters && (
              <span>
                📍 {t("company.page.hq")} {company.headquarters}
              </span>
            )}
            {company.branches.length > 0 && (
              <span>🌍 {company.branches.map((b) => b.city).join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex overflow-x-auto border-b border-slate-100">
          {TAB_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={cn(
                "shrink-0 px-5 py-3 text-sm font-medium transition-colors",
                activeTab === tabId
                  ? "border-b-2 border-[#3B5998] text-[#3B5998]"
                  : "text-slate-500 hover:text-[#0F172A]"
              )}
            >
              {t(TAB_LABEL_KEYS[tabId])}
            </button>
          ))}
        </nav>
        <div className="p-5">
          {activeTab === "home" && <HomeTab company={company} t={t} />}
          {activeTab === "about" && <AboutTab about={company.about ?? ""} />}
          {activeTab === "posts" && <PostsTab posts={posts} t={t} />}
          {activeTab === "jobs" && <JobsTab jobs={jobs} t={t} />}
        </div>
      </div>
    </div>
  );
}

function HomeTab({
  company,
  t,
}: {
  company: CompanyProfile;
  t: (key: string) => string;
}) {
  const preview = company.about
    ? company.about.length > 300
      ? `${company.about.slice(0, 300)}...`
      : company.about
    : "";

  return (
    <div className="space-y-4">
      {company.announcement && (
        <div className="rounded-lg border border-[#3B5998]/20 bg-[#3B5998]/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#3B5998]">
            {t("company.page.announcement")}
          </p>
          <p className="mt-1 text-sm text-[#0F172A]">{company.announcement}</p>
        </div>
      )}
      {preview && <p className="text-sm leading-relaxed text-slate-600">{preview}</p>}
      {company.currentEmployees && company.currentEmployees.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">
            {t("company.page.currentEmployees")}
          </h3>
          <ul className="mt-3 space-y-2">
            {company.currentEmployees.map((employee) => (
              <li key={employee.accountId}>
                <Link
                  href={`/network/profile/${employee.profileSlug}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={employee.profilePhotoUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{employee.fullName}</p>
                    <p className="text-xs text-slate-500">{employee.currentRole}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={t("company.page.employees")} value={company.employeeCount.toLocaleString()} />
        <StatCard label={t("company.page.followers")} value={company.followerCount.toLocaleString()} />
        <StatCard label={t("company.page.offices")} value={String(company.branches.length + 1)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
      <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function AboutTab({ about }: { about: string }) {
  return <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{about}</p>;
}

function PostsTab({
  posts,
  t,
}: {
  posts: CompanyPost[];
  t: (key: string) => string;
}) {
  if (posts.length === 0) {
    return <p className="text-sm text-slate-400">{t("company.page.noPosts")}</p>;
  }

  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.id} className="rounded-lg border border-slate-100 p-4">
          {post.type === "job_announcement" && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {t("company.page.jobOpening")}
            </span>
          )}
          <p className="mt-2 text-sm text-slate-700">{post.content}</p>
          {post.mediaUrls?.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="mt-3 w-full rounded-lg object-cover" style={{ maxHeight: 240 }} />
          ))}
          <p className="mt-2 text-[10px] text-slate-400">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}

function JobsTab({
  jobs,
  t,
}: {
  jobs: JobPosting[];
  t: (key: string) => string;
}) {
  const active = jobs.filter((j) => j.status === "active");
  return (
    <ul className="space-y-3">
      {active.length === 0 && (
        <p className="text-sm text-slate-400">{t("company.page.noVacancies")}</p>
      )}
      {active.map((job) => (
        <li key={job.id}>
          <Link
            href={`/network/jobs/${job.slug}`}
            className="block rounded-lg border border-slate-100 p-4 transition-colors hover:border-[#3B5998]/30 hover:bg-slate-50"
          >
            <h3 className="font-semibold text-[#0F172A]">{job.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {job.location} · {job.workLocation} · {job.employmentType.replace("_", " ")}
            </p>
            {job.showSalary && job.salaryMin && (
              <p className="mt-1 text-xs font-medium text-[#3B5998]">
                SAR {job.salaryMin.toLocaleString()} – {job.salaryMax?.toLocaleString()}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
