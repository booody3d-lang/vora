"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import { useCurrentCompany } from "@/hooks/use-current-company";
import { useTranslations } from "@/i18n/use-translations";
import type { CompanyProfile } from "@/types/company";
import { cn } from "@/lib/utils";

function fieldClassName() {
  return "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B5998] focus:outline-none";
}

export function CompanySettingsPanel() {
  const { t } = useTranslations();
  const router = useRouter();
  const { company, companySlug, patchCompany, applyCompany, loading } = useCurrentCompany();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeRange, setSizeRange] = useState("");
  const [headquarters, setHeadquarters] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTagline(company.tagline ?? "");
    setAbout(company.about ?? "");
    setIndustry(company.industry ?? "");
    setSizeRange(company.sizeRange ?? "");
    setHeadquarters(company.headquarters ?? "");
    setWebsiteUrl(company.websiteUrl ?? "");
    setAnnouncement(company.announcement ?? "");
  }, [company]);

  const saveCompany = useCallback(
    async (updates: Partial<CompanyProfile>) => {
      setSaving(true);
      setMessage("");
      try {
        const updated = await patchCompany(updates);
        if (!updated) throw new Error(t("company.settings.saveFailed"));
        applyCompany(updated);
        setMessage(t("company.settings.saved"));
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : t("company.settings.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [applyCompany, patchCompany, router, t]
  );

  if (loading) {
    return <div className="py-10 text-center text-slate-500">{t("common.loading")}</div>;
  }

  if (!company || !companySlug) {
    return <div className="py-10 text-center text-slate-500">{t("company.settings.notFound")}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{t("company.settings.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("company.settings.subtitle")}</p>
        </div>
        <Link
          href={`/network/company/${companySlug}`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("company.nav.publicPage")}
        </Link>
      </div>

      {message && (
        <p
          className={cn(
            "mb-4 rounded-lg px-4 py-2 text-sm",
            message.includes("fail") || message.includes("فشل")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-700"
          )}
        >
          {message}
        </p>
      )}

      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className="relative h-36 bg-cover bg-center md:h-44"
            style={
              company.coverImageUrl
                ? { backgroundImage: `url(${company.coverImageUrl})` }
                : { background: "linear-gradient(135deg, #0F172A 0%, #3B5998 100%)" }
            }
          />
          <div className="relative px-5 pb-5 pt-0">
            <div className="flex items-end gap-4">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="-mt-10 h-20 w-20 rounded-xl border-4 border-white bg-white object-cover shadow"
                />
              ) : (
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-xl border-4 border-white bg-slate-100 text-2xl shadow">
                  🏢
                </div>
              )}
              <div className="pb-1">
                <p className="text-lg font-bold text-[#0F172A]">{company.name}</p>
                {company.tagline && <p className="text-sm text-slate-500">{company.tagline}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#0F172A]">{t("company.settings.branding")}</h2>
          <div className="mt-4 space-y-5">
            <ImageUploadField
              label={t("company.settings.logoLabel")}
              hint={t("company.settings.logoHint")}
              previewUrl={company.logoUrl}
              previewClassName="h-20 w-20 rounded-xl"
              uploadKind="company-logo"
              enableCrop
              cropAspect={1}
              cropShape="rect"
              cropOutputWidth={512}
              cropOutputHeight={512}
              cropTitleKey="company.settings.cropLogoTitle"
              cropHintKey="company.settings.cropLogoHint"
              onUploaded={async (url) => {
                await saveCompany({ logoUrl: url });
              }}
            />
            <ImageUploadField
              label={t("company.settings.coverLabel")}
              hint={t("company.settings.coverHint")}
              previewUrl={company.coverImageUrl}
              previewClassName="h-32 w-full"
              uploadKind="company-cover"
              enableCrop
              cropAspect={4}
              cropShape="rect"
              cropOutputWidth={1200}
              cropOutputHeight={300}
              cropTitleKey="company.settings.cropCoverTitle"
              cropHintKey="company.settings.cropCoverHint"
              onUploaded={async (url) => {
                await saveCompany({ coverImageUrl: url });
              }}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#0F172A]">{t("company.settings.details")}</h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void saveCompany({
                name,
                tagline,
                about,
                industry,
                sizeRange,
                headquarters,
                websiteUrl,
                announcement,
              });
            }}
          >
            <Field label={t("company.settings.name")} value={name} onChange={setName} />
            <Field label={t("company.settings.tagline")} value={tagline} onChange={setTagline} />
            <div>
              <label className="text-sm font-medium text-slate-700">{t("company.settings.about")}</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={6}
                className={fieldClassName()}
              />
            </div>
            <Field label={t("company.settings.industry")} value={industry} onChange={setIndustry} />
            <Field label={t("company.settings.size")} value={sizeRange} onChange={setSizeRange} />
            <Field
              label={t("company.settings.headquarters")}
              value={headquarters}
              onChange={setHeadquarters}
            />
            <Field label={t("company.settings.website")} value={websiteUrl} onChange={setWebsiteUrl} />
            <Field
              label={t("company.settings.announcement")}
              value={announcement}
              onChange={setAnnouncement}
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#3B5998] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldClassName()} />
    </div>
  );
}
