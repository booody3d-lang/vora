"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import { AddItemButton } from "@/components/profile/AddItemButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { resolveAvatarUrl } from "@/lib/profile/avatar";
import { useTranslations } from "@/i18n/use-translations";
import type { FreelancerStore, MarketplaceService } from "@/types/freelance";
import { slugifyName } from "@/lib/profile/slugify";

function newServiceId() {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyService(storeSlug: string, storeName: string): MarketplaceService {
  return {
    id: newServiceId(),
    slug: slugifyName(`service-${Date.now()}`),
    storeId: storeSlug,
    storeSlug,
    storeName,
    sellerAvatar: "",
    title: "",
    shortDescription: "",
    category: "design",
    thumbnailUrl: "",
    galleryUrls: [],
    price: null,
    deliveryDays: 5,
    revisionsIncluded: 2,
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    isFeatured: false,
    isSponsored: false,
    isNew: true,
    description: "",
    faq: [],
    addons: [],
  };
}

interface ManageStoreContentProps {
  storeSlug: string;
}

export function ManageStoreContent({ storeSlug }: ManageStoreContentProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const activeView = section === "services" || section === "products" ? "services" : "identity";

  const [store, setStore] = useState<FreelancerStore | null>(null);
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [servicesRes, storeRes] = await Promise.all([
        fetch("/api/store/services", { credentials: "include" }),
        fetch("/api/store", { credentials: "include" }),
      ]);
      const servicesData = await servicesRes.json();
      const storeData = await storeRes.json();
      if (servicesRes.ok) {
        setServices(servicesData.services ?? []);
        setActiveId(servicesData.services?.[0]?.id ?? null);
      }
      if (storeRes.ok) {
        setStore(storeData.store);
        setStoreName(storeData.store.storeName);
        setDescription(storeData.store.description ?? "");
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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? t("profileEdit.saveFailed"));
        setStore(data.store);
        setStoreName(data.store.storeName);
        setDescription(data.store.description ?? "");
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

  const saveServices = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/store/services", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("storeManage.saveFailed"));
      setServices(data.services);
      setMessage(t("profileEdit.saved"));
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("storeManage.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [router, services, t]);

  const activeService = services.find((service) => service.id === activeId) ?? null;

  function updateActive(updates: Partial<MarketplaceService>) {
    if (!activeService) return;
    setServices((current) =>
      current.map((service) => (service.id === activeService.id ? { ...service, ...updates } : service))
    );
  }

  function addService() {
    const service = emptyService(storeSlug, storeName);
    setServices((current) => [...current, service]);
    setActiveId(service.id);
  }

  function removeActive() {
    if (!activeService) return;
    const next = services.filter((service) => service.id !== activeService.id);
    setServices(next);
    setActiveId(next[0]?.id ?? null);
  }

  if (loading) {
    return <div className="py-10 text-center text-slate-500">{t("common.loading")}</div>;
  }

  if (!store) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center" data-testid="manage-store-missing">
        <h1 className="text-xl font-bold text-[#0F172A]">{t("sidebar.freelance.createManageStore")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("storeEdit.notFound")}</p>
        <Link
          href="/freelance/dashboard"
          className="mt-4 inline-block rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("sidebar.freelance.dashboard")}
        </Link>
      </div>
    );
  }

  const logoSrc = resolveAvatarUrl({ photoUrl: store.logoUrl });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6" data-testid="manage-store-content">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            {activeView === "services" ? t("storeManage.servicesTitle") : t("sidebar.freelance.createManageStore")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeView === "services" ? t("storeManage.servicesSubtitle") : t("storeManage.identitySubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/freelance/store/${storeSlug}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("storeEdit.viewStore")}
          </Link>
          <Link
            href={`/freelance/store/${storeSlug}/edit`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t("storeEdit.title")}
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/freelance/store/${storeSlug}/manage`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeView === "identity"
              ? "bg-[#EA580C] text-white"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {t("storeManage.identityTitle")}
        </Link>
        <Link
          href={`/freelance/store/${storeSlug}/manage?section=services`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeView === "services"
              ? "bg-[#EA580C] text-white"
              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          {t("storeManage.servicesTitle")}
        </Link>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{message}</p>
      )}

      {activeView === "identity" ? (
        <div className="space-y-6 rounded-xl border border-orange-100 bg-white p-5 shadow-sm" data-testid="store-identity-panel">
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
            className="space-y-4 border-t border-slate-100 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void saveStore({ description });
            }}
          >
            <div>
              <label className="text-sm font-medium text-slate-700">{t("storeEdit.description")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">{t("storeEdit.bioHint")}</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]" data-testid="store-services-panel">
          <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">{t("storeManage.listings")}</h2>
              <AddItemButton onClick={addService} />
            </div>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(service.id)}
                    className={`w-full rounded-lg px-3 py-2 text-start text-sm ${
                      activeId === service.id
                        ? "bg-[#EA580C] text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-orange-50"
                    }`}
                  >
                    {service.title || t("storeManage.untitledService")}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-orange-100 bg-white p-5 shadow-sm">
            {!activeService ? (
              <p className="text-sm text-slate-500">{t("storeManage.selectOrAdd")}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("storeManage.serviceTitle")}</label>
                  <input
                    value={activeService.title}
                    onChange={(e) => updateActive({ title: e.target.value, slug: slugifyName(e.target.value || activeService.id) })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("storeManage.fullDescription")}</label>
                  <textarea
                    value={activeService.description}
                    onChange={(e) => updateActive({ description: e.target.value })}
                    rows={6}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t("storeManage.priceOptional")}</label>
                  <input
                    type="number"
                    min={0}
                    value={activeService.price ?? ""}
                    onChange={(e) =>
                      updateActive({
                        price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder={t("storeManage.pricePlaceholder")}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <ImageUploadField
                  label={t("storeManage.thumbnail")}
                  hint={t("storeManage.thumbnailHint")}
                  previewUrl={activeService.thumbnailUrl || undefined}
                  previewClassName="h-40 w-full"
                  uploadKind="service-thumbnail"
                  onUploaded={async (url) => updateActive({ thumbnailUrl: url })}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-slate-700">{t("storeManage.gallery")}</label>
                    <AddItemButton
                      onClick={() => updateActive({ galleryUrls: [...activeService.galleryUrls, ""] })}
                    />
                  </div>
                  {activeService.galleryUrls.map((url, index) => (
                    <div key={`${activeService.id}-gallery-${index}`} className="rounded-lg border border-slate-100 p-3">
                      <ImageUploadField
                        label={`${t("storeManage.gallery")} ${index + 1}`}
                        previewUrl={url || undefined}
                        previewClassName="h-32 w-full"
                        uploadKind="service-gallery"
                        onUploaded={async (uploadedUrl) => {
                          const galleryUrls = [...activeService.galleryUrls];
                          galleryUrls[index] = uploadedUrl;
                          updateActive({ galleryUrls });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => void saveServices()} disabled={saving} className="rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    onClick={removeActive}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    {t("storeManage.deleteListing")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
