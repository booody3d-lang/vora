"use client";

import { OwnerAIForecast } from "@/components/ai/admin/OwnerAIForecast";
import { useTranslations } from "@/i18n/use-translations";

export default function AdminAIPage() {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t("admin.ai.title")}</h1>
        <p className="text-sm text-slate-400">{t("admin.ai.subtitle")}</p>
      </div>
      <OwnerAIForecast />
    </div>
  );
}
