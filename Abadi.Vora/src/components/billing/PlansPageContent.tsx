"use client";

import { PlanSelector } from "@/components/billing/PlanSelector";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_SUBSCRIPTION } from "@/lib/billing/engine";

export function PlansPageContent() {
  const { t } = useTranslations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.plans.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.plans.subtitle")}</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">
          {t("billing.plans.individualSection")}
        </h2>
        <PlanSelector currentPlan={DEMO_SUBSCRIPTION.plan} target="individual" />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">
          {t("billing.plans.companySection")}
        </h2>
        <PlanSelector currentPlan="free" target="company" />
        <p className="mt-3 text-xs text-slate-400">{t("billing.plans.companyNote")}</p>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {t("billing.plans.freelancerNote")}
      </div>
    </div>
  );
}
