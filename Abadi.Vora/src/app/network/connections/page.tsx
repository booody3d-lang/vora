"use client";

import Link from "next/link";
import { useTranslations } from "@/i18n/use-translations";

export default function NetworkConnectionsPage() {
  const { t } = useTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">{t("sidebar.network.connections")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("network.connections.subtitle")}</p>
      <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">{t("network.connections.emptyBody")}</p>
        <Link
          href="/network/search"
          className="inline-block rounded-lg bg-[#3B5998] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d4373]"
        >
          {t("network.connections.discover")}
        </Link>
      </div>
    </div>
  );
}
