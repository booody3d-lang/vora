"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfileTab } from "@/types/network";
import type { FullProfessionalProfile } from "@/types/network";
import { AboutSection } from "@/components/network/profile/sections/AboutSection";
import { VideoPitchSection } from "@/components/network/profile/sections/VideoPitchSection";
import { ExperienceSection } from "@/components/network/profile/sections/ExperienceSection";
import { EducationSection } from "@/components/network/profile/sections/EducationSection";
import { CertificationsSection } from "@/components/network/profile/sections/CertificationsSection";
import { SkillsSection } from "@/components/network/profile/sections/SkillsSection";
import { LanguagesSection } from "@/components/network/profile/sections/LanguagesSection";
import { ProjectsSection } from "@/components/network/profile/sections/ProjectsSection";
import { ResumeSection } from "@/components/network/profile/sections/ResumeSection";
import { ProfileAnalyticsPanel } from "@/components/network/profile/ProfileAnalyticsPanel";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

const TAB_IDS: ProfileTab[] = [
  "about",
  "video",
  "experience",
  "education",
  "certifications",
  "skills",
  "languages",
  "projects",
  "resume",
];

interface ProfileTabsProps {
  profile: FullProfessionalProfile;
  isOwnProfile?: boolean;
}

export function ProfileTabs({ profile, isOwnProfile }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const { t } = useLocale();

  return (
    <div className="mt-4 space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex min-w-max border-b border-slate-100">
          {TAB_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tabId
                  ? "border-b-2 border-[#3B5998] text-[#3B5998]"
                  : "text-slate-500 hover:text-[#0F172A]"
              )}
            >
              {t(`profile.tabs.${tabId}`)}
            </button>
          ))}
        </nav>
        <div className="p-5">
          {isOwnProfile && (
            <div className="mb-4 flex justify-end">
              <Link
                href={`/network/profile/edit?section=${activeTab === "video" ? "video" : activeTab === "about" ? "about" : activeTab}`}
                className="text-sm font-semibold text-[#3B5998] hover:underline"
              >
                {t("profile.header.editSection")} →
              </Link>
            </div>
          )}
          {activeTab === "about" && <AboutSection about={profile.about} />}
          {activeTab === "video" && <VideoPitchSection videoUrl={profile.videoIntroUrl} />}
          {activeTab === "experience" && <ExperienceSection items={profile.experiences} />}
          {activeTab === "education" && <EducationSection items={profile.education} />}
          {activeTab === "certifications" && (
            <CertificationsSection items={profile.certifications} />
          )}
          {activeTab === "skills" && <SkillsSection items={profile.skills} />}
          {activeTab === "languages" && <LanguagesSection items={profile.languages} />}
          {activeTab === "projects" && <ProjectsSection items={profile.projects} />}
          {activeTab === "resume" && <ResumeSection resumeUrl={profile.resumeUrl} />}
        </div>
      </div>

      <ProfileAnalyticsPanel isPremium={profile.isPremium} />

      <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#0F172A]">{t("profile.aiHub.title")}</h3>
            <p className="text-sm text-slate-500">{t("profile.aiHub.subtitle")}</p>
          </div>
          <Link
            href="/network/ai"
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("profile.aiHub.cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
