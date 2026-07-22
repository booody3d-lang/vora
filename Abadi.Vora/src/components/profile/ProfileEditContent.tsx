"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import { AddItemButton } from "@/components/profile/AddItemButton";
import {
  SAVE_ITEM_BUTTON_CLASS,
} from "@/components/profile/profile-edit-styles";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProfessionalScoreRing } from "@/components/professional/ProfessionalScoreRing";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import {
  ONBOARDING_STEPS,
  getFirstIncompleteOnboardingStep,
  getPostAuthDestination,
  isOnboardingComplete,
  isOnboardingStepComplete,
  type OnboardingStep,
} from "@/lib/profile/onboarding";
import { useTranslations } from "@/i18n/use-translations";
import { usePermissions } from "@/providers/VoraProviders";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  FullProfessionalProfile,
  LanguageItem,
  ProjectItem,
  SkillItem,
} from "@/types/network";
import { cn } from "@/lib/utils";

const SECTIONS = [
  "photo",
  "cover",
  "about",
  "video",
  "experience",
  "education",
  "skills",
  "certifications",
  "languages",
  "projects",
  "resume",
  "preferences",
] as const;

type EditSection = (typeof SECTIONS)[number];

interface ProfileEditContentProps {
  mode?: "edit" | "onboarding";
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ProfileEditContent({ mode = "edit" }: ProfileEditContentProps) {
  const isOnboarding = mode === "onboarding";
  const { t } = useTranslations();
  const router = useRouter();
  const { user } = usePermissions();
  const { patchProfile, applyProfile } = useCurrentProfile();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as EditSection) || "about";
  const [activeSection, setActiveSection] = useState<EditSection>(
    SECTIONS.includes(initialSection) ? initialSection : "about"
  );
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("photo");
  const [profile, setProfile] = useState<FullProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        if (isOnboarding && data.profile) {
          setOnboardingStep(getFirstIncompleteOnboardingStep(data.profile));
        }
      } else if (res.status === 401) {
        router.replace("/auth/login");
      }
    } finally {
      setLoading(false);
    }
  }, [isOnboarding, router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (updates: Partial<FullProfessionalProfile>) => {
      if (!profile) return;
      setSaving(true);
      setMessage("");
      try {
        const updated = await patchProfile(updates);
        if (!updated) throw new Error(t("profileEdit.saveFailed"));
        setProfile(updated);
        applyProfile(updated);
        setMessage(t("profileEdit.saved"));
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : t("profileEdit.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [profile, patchProfile, applyProfile, router, t]
  );

  const finishOnboarding = useCallback(async () => {
    if (!profile || !user) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("profileEdit.saveFailed"));
      router.push(getPostAuthDestination(user.role));
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("profileEdit.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [profile, router, t, user]);

  const currentSection = isOnboarding ? onboardingStep : activeSection;
  const onboardingProgress = profile ? ONBOARDING_STEPS.filter((step) => isOnboardingStepComplete(step, profile)).length : 0;
  const onboardingDone = profile ? isOnboardingComplete(profile) : false;
  const currentStepIndex = ONBOARDING_STEPS.indexOf(onboardingStep);

  function goToNextOnboardingStep() {
    if (!profile) return;
    const next = ONBOARDING_STEPS[currentStepIndex + 1];
    if (next) setOnboardingStep(next);
  }

  function goToPreviousOnboardingStep() {
    const prev = ONBOARDING_STEPS[currentStepIndex - 1];
    if (prev) setOnboardingStep(prev);
  }

  const avatarSrc = useMemo(
    () =>
      resolveAvatarUrl({
        photoUrl: profile?.profilePhotoUrl,
        gender: profile?.gender,
      }),
    [profile]
  );

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {isOnboarding ? t("onboarding.title") : t("profileEdit.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isOnboarding ? t("onboarding.subtitle") : t("profileEdit.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProfessionalScoreRing score={profile.professionalScore} size={64} strokeWidth={4} showBadge />
          {!isOnboarding && (
            <Link
              href={`/network/profile/${profile.slug}`}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("profileEdit.viewProfile")}
            </Link>
          )}
        </div>
      </div>

      {isOnboarding && (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto">
            {ONBOARDING_STEPS.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setOnboardingStep(step)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-center text-xs font-semibold",
                  index === currentStepIndex
                    ? "bg-[#3B5998] text-white"
                    : isOnboardingStepComplete(step, profile)
                      ? "bg-[#3B5998]/20 text-[#3B5998]"
                      : "bg-slate-100 text-slate-400"
                )}
              >
                {t(`profileEdit.sections.${step}`)}
              </button>
            ))}
          </div>
          <p className="mb-4 text-sm text-slate-500">
            {t("onboarding.progress", {
              completed: onboardingProgress,
              total: ONBOARDING_STEPS.length,
            })}
          </p>
        </>
      )}

      {message && (
        <p className={cn("mb-4 rounded-lg px-4 py-2 text-sm", message.includes("fail") || message.includes("فشل") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700")}>
          {message}
        </p>
      )}

      {!isOnboarding && profile.hasFreelancerStore && (
        <div className="mb-4 rounded-lg border border-[#3B5998]/20 bg-[#3B5998]/5 px-4 py-3 text-sm text-slate-700">
          <span>{t("profileEdit.preferencesHint")} </span>
          <button
            type="button"
            onClick={() => setActiveSection("preferences")}
            className="font-semibold text-[#3B5998] hover:underline"
          >
            {t("profileEdit.sections.preferences")} →
          </button>
        </div>
      )}

      <div className={cn(isOnboarding ? "space-y-4" : "grid gap-6 lg:grid-cols-[220px_1fr]")}>
        {!isOnboarding && (
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {SECTIONS.filter((section) => section !== "preferences" || profile.hasFreelancerStore).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={cn(
                "shrink-0 rounded-lg px-4 py-2.5 text-start text-sm font-medium transition-colors",
                activeSection === section
                  ? "bg-[#3B5998] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {t(`profileEdit.sections.${section}`)}
            </button>
          ))}
        </nav>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {currentSection === "photo" && (
            <div className="space-y-4">
              <UserAvatar photoUrl={profile.profilePhotoUrl} gender={profile.gender} name={profile.fullName} className="h-28 w-28 border-4 border-white shadow" />
              <ImageUploadField
                label={t("profileEdit.photoLabel")}
                hint={t("profileEdit.photoHint")}
                previewUrl={avatarSrc}
                previewClassName="h-28 w-28 rounded-full"
                uploadKind="photo"
                enableCrop
                onUploaded={async (url) => {
                  await saveProfile({ profilePhotoUrl: url });
                }}
              />
            </div>
          )}

          {currentSection === "cover" && (
            <ImageUploadField
              label={t("profileEdit.coverLabel")}
              hint={t("profileEdit.coverHint")}
              previewUrl={profile.coverImageUrl || undefined}
              previewClassName="h-40 w-full"
              uploadKind="cover"
              onUploaded={async (url) => {
                await saveProfile({ coverImageUrl: url });
              }}
            />
          )}

          {currentSection === "about" && (
            <AboutEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {currentSection === "video" && (
            <VideoEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {currentSection === "experience" && (
            <ExperienceEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {currentSection === "education" && (
            <EducationEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {currentSection === "skills" && (
            <SkillsEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {!isOnboarding && currentSection === "certifications" && (
            <CertificationsEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {!isOnboarding && currentSection === "languages" && (
            <LanguagesEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {currentSection === "projects" && (
            <ProjectsEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
          )}

          {!isOnboarding && currentSection === "preferences" && profile.hasFreelancerStore && (
            <div data-testid="profile-visit-store-toggle">
              <PreferencesEditor profile={profile} saving={saving} onSave={saveProfile} t={t} />
            </div>
          )}

          {currentSection === "resume" && (
            <div className="space-y-4">
              {profile.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#3B5998] hover:underline">
                  {t("profileEdit.viewResume")}
                </a>
              )}
              <ImageUploadField
                label={t("profileEdit.resumeLabel")}
                hint={t("profileEdit.resumeHint")}
                accept="application/pdf"
                compress={false}
                uploadKind="resume"
                onUploaded={async (url) => {
                  await saveProfile({ resumeUrl: url });
                }}
              />
            </div>
          )}

          {isOnboarding && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={goToPreviousOnboardingStep}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                {t("onboarding.back")}
              </button>
              {onboardingDone ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void finishOnboarding()}
                  className="rounded-lg bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("onboarding.enterPlatform")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isOnboardingStepComplete(onboardingStep, profile)}
                  onClick={goToNextOnboardingStep}
                  className="rounded-lg bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("onboarding.continue")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fieldClassName() {
  return "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#3B5998] focus:outline-none";
}

function AboutEditor({
  profile,
  saving,
  onSave,
  t,
}: {
  profile: FullProfessionalProfile;
  saving: boolean;
  onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>;
  t: (key: string) => string;
}) {
  const [headline, setHeadline] = useState(profile.headline);
  const [fullName, setFullName] = useState(profile.fullName);
  const [about, setAbout] = useState(profile.about);
  const [location, setLocation] = useState(profile.location);
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [contactEmail, setContactEmail] = useState(profile.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(profile.contactPhone ?? "");
  const [currentRole, setCurrentRole] = useState(profile.currentRole ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ fullName, headline, about, location, websiteUrl, contactEmail, contactPhone, currentRole });
      }}
    >
      <Field label={t("profileEdit.fullName")} value={fullName} onChange={setFullName} />
      <Field label={t("profileEdit.headline")} value={headline} onChange={setHeadline} />
      <div>
        <label className="text-sm font-medium text-slate-700">{t("profileEdit.about")}</label>
        <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className={fieldClassName()} />
      </div>
      <Field label={t("profileEdit.location")} value={location} onChange={setLocation} />
      <Field label={t("profileEdit.currentRole")} value={currentRole} onChange={setCurrentRole} />
      <Field label={t("profileEdit.website")} value={websiteUrl} onChange={setWebsiteUrl} />
      <Field label={t("profileEdit.contactEmail")} value={contactEmail} onChange={setContactEmail} />
      <Field label={t("profileEdit.contactPhone")} value={contactPhone} onChange={setContactPhone} />
      <SaveButton saving={saving} label={t("common.save")} />
    </form>
  );
}

function VideoEditor({
  profile,
  saving,
  onSave,
  t,
}: {
  profile: FullProfessionalProfile;
  saving: boolean;
  onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>;
  t: (key: string) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [videoIntroUrl, setVideoIntroUrl] = useState(profile.videoIntroUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleVideoFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const { uploadMediaFile } = await import("@/lib/media/upload-client");
      const uploaded = await uploadMediaFile(file, "video-intro");
      setVideoIntroUrl(uploaded.url);
      await onSave({ videoIntroUrl: uploaded.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profileEdit.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700">{t("profileEdit.videoUpload")}</label>
        <p className="mt-1 text-xs text-slate-500">{t("profileEdit.videoUploadHint")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={uploading || saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleVideoFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading || saving}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? t("profileEdit.uploading") : t("profileEdit.chooseFile")}
          </button>
        </div>
      </div>
      {videoIntroUrl && (
        <video src={videoIntroUrl} controls className="max-h-64 w-full rounded-xl bg-black" />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ExperienceEditor({
  profile,
  saving,
  onSave,
  t,
}: {
  profile: FullProfessionalProfile;
  saving: boolean;
  onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>;
  t: (key: string) => string;
}) {
  const [items, setItems] = useState<ExperienceItem[]>(profile.experiences);

  function addItem() {
    setItems([
      ...items,
      {
        id: newId("exp"),
        title: "",
        companyName: "",
        startDate: "",
        isCurrent: false,
        isVerified: true,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="rounded-lg border border-slate-100 p-4 space-y-2">
          <input value={item.title} onChange={(e) => { const next = [...items]; next[index] = { ...item, title: e.target.value }; setItems(next); }} placeholder={t("profileEdit.jobTitle")} className={fieldClassName()} />
          <input value={item.companyName} onChange={(e) => { const next = [...items]; next[index] = { ...item, companyName: e.target.value }; setItems(next); }} placeholder={t("profileEdit.company")} className={fieldClassName()} />
          <input value={item.location ?? ""} onChange={(e) => { const next = [...items]; next[index] = { ...item, location: e.target.value }; setItems(next); }} placeholder={t("profileEdit.location")} className={fieldClassName()} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={item.startDate} onChange={(e) => { const next = [...items]; next[index] = { ...item, startDate: e.target.value }; setItems(next); }} placeholder={t("profileEdit.startDate")} className={fieldClassName()} />
            <input value={item.endDate ?? ""} onChange={(e) => { const next = [...items]; next[index] = { ...item, endDate: e.target.value }; setItems(next); }} placeholder={t("profileEdit.endDate")} disabled={item.isCurrent} className={fieldClassName()} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={item.isCurrent}
              onChange={(e) => {
                const next = [...items];
                next[index] = {
                  ...item,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? undefined : item.endDate,
                };
                setItems(next);
              }}
            />
            {t("profileEdit.currentlyWorking")}
          </label>
          <textarea value={item.description ?? ""} onChange={(e) => { const next = [...items]; next[index] = { ...item, description: e.target.value }; setItems(next); }} placeholder={t("profileEdit.description")} className={fieldClassName()} rows={2} />
        </div>
      ))}
      <div className="flex gap-2">
        <AddItemButton onClick={addItem} />
        <button type="button" disabled={saving} onClick={() => void onSave({ experiences: items })} className={SAVE_ITEM_BUTTON_CLASS}>{t("common.save")}</button>
      </div>
    </div>
  );
}

function EducationEditor({ profile, saving, onSave, t }: { profile: FullProfessionalProfile; saving: boolean; onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>; t: (key: string) => string }) {
  const [items, setItems] = useState<EducationItem[]>(profile.education);
  return (
    <ArrayEditor
      items={items}
      setItems={setItems}
      saving={saving}
      onSave={() => onSave({ education: items })}
      t={t}
      renderItem={(item, index, setItem) => (
        <>
          <input value={item.institution} onChange={(e) => setItem(index, { ...item, institution: e.target.value })} placeholder={t("profileEdit.institution")} className={fieldClassName()} />
          <input value={item.country ?? ""} onChange={(e) => setItem(index, { ...item, country: e.target.value })} placeholder={t("profileEdit.country")} className={fieldClassName()} />
          <input value={item.degree} onChange={(e) => setItem(index, { ...item, degree: e.target.value })} placeholder={t("profileEdit.degree")} className={fieldClassName()} />
          <input value={item.fieldOfStudy ?? ""} onChange={(e) => setItem(index, { ...item, fieldOfStudy: e.target.value })} placeholder={t("profileEdit.major")} className={fieldClassName()} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={item.startDate ?? ""} onChange={(e) => setItem(index, { ...item, startDate: e.target.value })} placeholder={t("profileEdit.startDate")} className={fieldClassName()} />
            <input value={item.endDate ?? ""} onChange={(e) => setItem(index, { ...item, endDate: e.target.value })} placeholder={t("profileEdit.endDate")} className={fieldClassName()} />
          </div>
        </>
      )}
      newItem={() => ({ id: newId("edu"), institution: "", degree: "", country: "", fieldOfStudy: "", startDate: "", endDate: "", isVerified: true })}
    />
  );
}

function SkillsEditor({ profile, saving, onSave, t }: { profile: FullProfessionalProfile; saving: boolean; onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>; t: (key: string) => string }) {
  const [items, setItems] = useState<SkillItem[]>(profile.skills);
  return (
    <ArrayEditor
      items={items}
      setItems={setItems}
      saving={saving}
      onSave={() => onSave({ skills: items })}
      t={t}
      renderItem={(item, index, setItem) => (
        <input value={item.name} onChange={(e) => setItem(index, { ...item, name: e.target.value, endorsementCount: item.endorsementCount ?? 0, videoVerified: item.videoVerified ?? false })} placeholder={t("profileEdit.skillName")} className={fieldClassName()} />
      )}
      newItem={() => ({ id: newId("sk"), name: "", endorsementCount: 0, videoVerified: false })}
    />
  );
}

function CertificationsEditor({ profile, saving, onSave, t }: { profile: FullProfessionalProfile; saving: boolean; onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>; t: (key: string) => string }) {
  const [items, setItems] = useState<CertificationItem[]>(profile.certifications);
  return (
    <ArrayEditor
      items={items}
      setItems={setItems}
      saving={saving}
      onSave={() => onSave({ certifications: items })}
      t={t}
      renderItem={(item, index, setItem) => (
        <>
          <input value={item.name} onChange={(e) => setItem(index, { ...item, name: e.target.value })} placeholder={t("profileEdit.certName")} className={fieldClassName()} />
          <input value={item.issuingOrganization} onChange={(e) => setItem(index, { ...item, issuingOrganization: e.target.value })} placeholder={t("profileEdit.issuer")} className={fieldClassName()} />
          <input value={item.issueDate ?? ""} onChange={(e) => setItem(index, { ...item, issueDate: e.target.value })} placeholder={t("profileEdit.issueDate")} className={fieldClassName()} />
          <input value={item.credentialUrl ?? ""} onChange={(e) => setItem(index, { ...item, credentialUrl: e.target.value })} placeholder={t("profileEdit.credentialUrl")} className={fieldClassName()} />
        </>
      )}
      newItem={() => ({ id: newId("cert"), name: "", issuingOrganization: "", issueDate: "", credentialUrl: "" })}
    />
  );
}

function LanguagesEditor({ profile, saving, onSave, t }: { profile: FullProfessionalProfile; saving: boolean; onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>; t: (key: string) => string }) {
  const [items, setItems] = useState<LanguageItem[]>(profile.languages);
  return (
    <ArrayEditor
      items={items}
      setItems={setItems}
      saving={saving}
      onSave={() => onSave({ languages: items })}
      t={t}
      renderItem={(item, index, setItem) => (
        <>
          <input value={item.language} onChange={(e) => setItem(index, { ...item, language: e.target.value })} placeholder={t("profileEdit.language")} className={fieldClassName()} />
          <select value={item.proficiency} onChange={(e) => setItem(index, { ...item, proficiency: e.target.value as LanguageItem["proficiency"] })} className={fieldClassName()}>
            <option value="elementary">{t("profile.proficiency.elementary")}</option>
            <option value="professional">{t("profile.proficiency.professional")}</option>
            <option value="native">{t("profile.proficiency.native")}</option>
          </select>
        </>
      )}
      newItem={() => ({ id: newId("lang"), language: "", proficiency: "professional" as const })}
    />
  );
}

function ProjectsEditor({ profile, saving, onSave, t }: { profile: FullProfessionalProfile; saving: boolean; onSave: (u: Partial<FullProfessionalProfile>) => Promise<void>; t: (key: string) => string }) {
  const [items, setItems] = useState<ProjectItem[]>(profile.projects);
  return (
    <ArrayEditor
      items={items}
      setItems={setItems}
      saving={saving}
      onSave={() => onSave({ projects: items })}
      t={t}
      renderItem={(item, index, setItem) => (
        <>
          <input value={item.title} onChange={(e) => setItem(index, { ...item, title: e.target.value })} placeholder={t("profileEdit.projectTitle")} className={fieldClassName()} />
          <textarea value={item.description ?? ""} onChange={(e) => setItem(index, { ...item, description: e.target.value })} placeholder={t("profileEdit.description")} className={fieldClassName()} rows={2} />
          <input value={item.projectUrl ?? ""} onChange={(e) => setItem(index, { ...item, projectUrl: e.target.value })} placeholder={t("profileEdit.projectUrl")} className={fieldClassName()} />
        </>
      )}
      newItem={() => ({ id: newId("proj"), title: "", description: "", projectUrl: "" })}
    />
  );
}

function ArrayEditor<T extends { id: string }>({
  items,
  setItems,
  saving,
  onSave,
  t,
  renderItem,
  newItem,
}: {
  items: T[];
  setItems: (items: T[]) => void;
  saving: boolean;
  onSave: () => Promise<void>;
  t: (key: string) => string;
  renderItem: (item: T, index: number, setItem: (index: number, item: T) => void) => ReactNode;
  newItem: () => T;
}) {
  function setItem(index: number, item: T) {
    const next = [...items];
    next[index] = item;
    setItems(next);
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-lg border border-slate-100 p-4">
          {renderItem(item, index, setItem)}
        </div>
      ))}
      <div className="flex gap-2">
        <AddItemButton onClick={() => setItems([...items, newItem()])} />
        <button type="button" disabled={saving} onClick={() => void onSave()} className={SAVE_ITEM_BUTTON_CLASS}>{t("common.save")}</button>
      </div>
    </div>
  );
}

function PreferencesEditor({
  profile,
  saving,
  onSave,
  t,
}: {
  profile: FullProfessionalProfile;
  saving: boolean;
  onSave: (updates: Partial<FullProfessionalProfile>) => Promise<void>;
  t: (key: string) => string;
}) {
  const [showVisitStoreOnProfile, setShowVisitStoreOnProfile] = useState(
    profile.showVisitStoreOnProfile !== false
  );

  useEffect(() => {
    setShowVisitStoreOnProfile(profile.showVisitStoreOnProfile !== false);
  }, [profile.showVisitStoreOnProfile]);

  return (
    <form
      className="space-y-4"
      data-testid="visit-store-toggle-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ showVisitStoreOnProfile });
      }}
    >
      <p className="text-sm text-slate-600">{t("profileEdit.preferencesHint")}</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
        <input
          type="checkbox"
          id="showVisitStoreOnProfile"
          name="showVisitStoreOnProfile"
          checked={showVisitStoreOnProfile}
          onChange={(e) => setShowVisitStoreOnProfile(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3B5998]"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">
            {t("profileEdit.showVisitStoreOnProfile")}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {t("profileEdit.showVisitStoreOnProfileHint")}
          </span>
        </span>
      </label>
      <SaveButton saving={saving} label={t("common.save")} />
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClassName()} />
    </div>
  );
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button type="submit" disabled={saving} className="rounded-lg bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
      {saving ? "..." : label}
    </button>
  );
}
