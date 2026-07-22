"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ADMIN_MODERATION_COMPANIES,
  ADMIN_MODERATION_SERVICES,
  ADMIN_MODERATION_STORES,
} from "@/lib/admin/mock-data";
import { useTranslations } from "@/i18n/use-translations";
import { formatSar } from "@/lib/billing/engine";
import type { ModerationCompany, ModerationService, ModerationStore } from "@/types/admin";

type Tab = "stores" | "services" | "companies";

export default function AdminModerationPage() {
  const { t } = useTranslations();
  const [tab, setTab] = useState<Tab>("stores");
  const [stores, setStores] = useState(ADMIN_MODERATION_STORES);
  const [services, setServices] = useState(ADMIN_MODERATION_SERVICES);
  const [companies, setCompanies] = useState(ADMIN_MODERATION_COMPANIES);
  const [persistence, setPersistence] = useState<"supabase" | "demo" | "json" | "mixed">("demo");

  const loadModeration = useCallback(() => {
    fetch("/api/admin/moderation")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            stores?: ModerationStore[];
            services?: ModerationService[];
            companies?: ModerationCompany[];
            persistence?: "supabase" | "json" | "mixed";
          } | null
        ) => {
          if (data?.stores) setStores(data.stores);
          if (data?.services) setServices(data.services);
          if (data?.companies) setCompanies(data.companies);
          if (data?.persistence) setPersistence(data.persistence);
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadModeration();
  }, [loadModeration]);

  async function patchStore(id: string, body: { hidden?: boolean; remove?: boolean }) {
    const previous = stores;
    if (typeof body.hidden === "boolean") {
      setStores((prev) =>
        prev.map((store) => (store.id === id ? { ...store, isHidden: body.hidden! } : store))
      );
    } else if (body.remove) {
      setStores((prev) =>
        prev.map((store) => (store.id === id ? { ...store, isHidden: true } : store))
      );
    }

    const res = await fetch(`/api/admin/moderation/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setStores(previous);
      return;
    }

    const data = (await res.json()) as { store?: ModerationStore };
    if (data.store) {
      setStores((prev) => prev.map((store) => (store.id === id ? data.store! : store)));
    }
  }

  async function patchService(id: string, body: { hidden?: boolean; remove?: boolean }) {
    const previous = services;
    if (typeof body.hidden === "boolean") {
      setServices((prev) =>
        prev.map((service) =>
          service.id === id ? { ...service, isHidden: body.hidden! } : service
        )
      );
    } else if (body.remove) {
      setServices((prev) =>
        prev.map((service) => (service.id === id ? { ...service, isHidden: true } : service))
      );
    }

    const res = await fetch(`/api/admin/moderation/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      setServices(previous);
      return;
    }

    const data = (await res.json()) as { service?: ModerationService };
    if (data.service) {
      setServices((prev) => prev.map((service) => (service.id === id ? data.service! : service)));
    }
  }

  const tabs: { id: Tab; labelKey: string }[] = [
    { id: "stores", labelKey: "admin.moderation.stores" },
    { id: "services", labelKey: "admin.moderation.services" },
    { id: "companies", labelKey: "admin.moderation.companies" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.moderation.title")}</h1>
          <p className="text-sm text-slate-400">{t("admin.moderation.subtitle")}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {persistence === "supabase" ? "Supabase live" : "Demo fallback"}
        </span>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-900 p-1">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              tab === tabItem.id ? "bg-red-600/20 text-red-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {tab === "stores" && (
        <div className="space-y-3">
          {stores.map((store) => (
            <div
              key={store.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{store.storeName}</h3>
                  {store.isHidden && (
                    <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                      {t("admin.moderation.hidden")}
                    </span>
                  )}
                  {store.reportCount > 0 && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                      {t("admin.moderation.reports").replace("{count}", String(store.reportCount))}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {store.ownerName} · {store.servicesCount} services · ★ {store.rating}
                </p>
                {store.lastReportReason && (
                  <p className="mt-1 text-xs text-red-400/80">
                    {t("admin.moderation.reportLabel").replace("{reason}", store.lastReportReason ?? "")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void patchStore(store.id, { hidden: !store.isHidden })}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
                >
                  {store.isHidden ? t("admin.moderation.unhide") : t("admin.moderation.hide")}
                </button>
                <button
                  type="button"
                  onClick={() => void patchStore(store.id, { remove: true })}
                  className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs text-white"
                >
                  {t("admin.moderation.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "services" && (
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-[#111827]">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">{t("admin.moderation.colService")}</th>
                <th className="px-5 py-3">{t("admin.moderation.colStore")}</th>
                <th className="px-5 py-3">{t("admin.moderation.colPrice")}</th>
                <th className="px-5 py-3">{t("admin.moderation.colReports")}</th>
                <th className="px-5 py-3">{t("admin.users.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-b border-slate-800">
                  <td className="px-5 py-3 font-medium text-white">{svc.title}</td>
                  <td className="px-5 py-3 text-slate-400">{svc.storeName}</td>
                  <td className="px-5 py-3 text-emerald-400">{formatSar(svc.price)}</td>
                  <td className="px-5 py-3">
                    {svc.reportCount > 0 ? (
                      <span className="text-red-400">{svc.reportCount}</span>
                    ) : (
                      <span className="text-slate-600">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void patchService(svc.id, { hidden: !svc.isHidden })}
                        className="rounded-lg border border-slate-600 px-2 py-1 text-xs text-slate-300"
                      >
                        {svc.isHidden ? t("admin.moderation.unhide") : t("admin.moderation.hide")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchService(svc.id, { remove: true })}
                        className="rounded-lg bg-red-600/80 px-2 py-1 text-xs text-white"
                      >
                        {t("admin.moderation.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "companies" && (
        <div className="space-y-3">
          {companies.map((co) => (
            <div
              key={co.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/50 bg-[#111827] p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{co.name}</h3>
                  {!co.licenseVerified && (
                    <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                      {t("admin.moderation.licenseUnverified")}
                    </span>
                  )}
                  {co.reportCount > 0 && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                      {co.reportCount} reports
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {t("admin.moderation.activeJobsSub")
                    .replace("{count}", String(co.activeJobs))
                    .replace("{status}", co.subscriptionStatus)}
                </p>
              </div>
              <Link
                href={`/network/company/${co.slug}`}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              >
                {t("admin.moderation.auditPage")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
