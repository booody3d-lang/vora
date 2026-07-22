"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { useTranslations } from "@/i18n/use-translations";
import type { FreelancerStore } from "@/types/freelance";

export function StoreEditContent() {
  const { t } = useTranslations();
  const router = useRouter();
  const [store, setStore] = useState<FreelancerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [storeName, setStoreName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [videoIntroUrl, setVideoIntroUrl] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/store", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setStore(data.store);
        setStoreName(data.store.storeName);
        setTagline(data.store.tagline ?? "");
        setDescription(data.store.description);
        setVideoIntroUrl(data.store.videoIntroUrl ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const saveStore = useCallback(
    async (updates: Partial<FreelancerStore>) => {
      setSaving(true);
      setMessage("");
      try {
        const res = await fetch("/api/store", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("profileEdit.saveFailed"));
        setStore(data.store);
        setMessage(t("profileEdit.saved"));
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : t("profileEdit.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [router, t]
  );

  if (loading) {
    return <div className="py-10 text-center text-slate-500">{t("common.loading")}</div>;
  }

  if (!store) {
    return <div className="py-10 text-center text-slate-500">{t("storeEdit.notFound")}</div>;
  }

  const logoSrc = resolveAvatarUrl({ photoUrl: store.logoUrl });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{t("storeEdit.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("storeEdit.subtitle")}</p>
        </div>
        <Link
          href={`/freelance/store/${store.slug}/manage`}
          className="rounded-lg border border-[#EA580C] px-4 py-2 text-sm font-semibold text-[#EA580C] hover:bg-orange-50"
        >
          {t("storeManage.manageStore")}
        </Link>
        <Link
          href={`/freelance/store/${store.slug}`}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("storeEdit.viewStore")}
        </Link>
      </div>

      {message && <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p>}

      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <UserAvatar photoUrl={store.logoUrl} className="h-20 w-20 rounded-2xl" />
        <ImageUploadField
          label={t("storeEdit.logoLabel")}
          hint={t("storeEdit.logoHint")}
          previewUrl={logoSrc}
          previewClassName="h-20 w-20 rounded-2xl"
          uploadKind="store-logo"
          enableCrop
          onUploaded={async (url) => {
            await saveStore({ logoUrl: url });
          }}
        />
        <ImageUploadField
          label={t("storeEdit.coverLabel")}
          hint={t("storeEdit.coverHint")}
          previewUrl={store.coverImageUrl}
          previewClassName="h-40 w-full"
          uploadKind="store-cover"
          onUploaded={async (url) => {
            await saveStore({ coverImageUrl: url });
          }}
        />

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveStore({ storeName, tagline, description, videoIntroUrl });
          }}
        >
          <div>
            <label className="text-sm font-medium text-slate-700">{t("storeEdit.storeName")}</label>
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{t("storeEdit.tagline")}</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{t("storeEdit.description")}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">{t("storeEdit.bioHint")}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{t("storeEdit.videoUrl")}</label>
            <input value={videoIntroUrl} onChange={(e) => setVideoIntroUrl(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {t("common.save")}
          </button>
        </form>
      </div>
    </div>
  );
}
