"use client";

import { useState } from "react";
import type { PlanDefinition } from "@/types/billing";
import { PLANS } from "@/types/billing";
import { formatSar } from "@/lib/billing/engine";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "@/i18n/use-translations";
import { cn } from "@/lib/utils";

interface PlanSelectorProps {
  currentPlan?: string;
  target?: "individual" | "company";
}

export function PlanSelector({ currentPlan = "free", target = "individual" }: PlanSelectorProps) {
  const { locale } = useLocale();
  const { t } = useTranslations();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = PLANS.filter(
    (p) => p.target === target || (target === "individual" && p.id === "free")
  ).filter((p) => target === "company" ? p.target === "company" : p.target === "individual");

  async function handleSubscribe(plan: PlanDefinition) {
    if (plan.priceSar === 0) return;
    setLoading(plan.id);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan.id,
          accountId: "demo-user-1",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (!isStripeConfigured()) {
        alert(
          t("billing.plans.stripeDemo").replace(
            "{plan}",
            locale === "ar" ? plan.nameAr : plan.nameEn
          )
        );
      }
    } catch {
      alert(t("billing.plans.paymentFailed"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.id;
        const features = locale === "ar" ? plan.featuresAr : plan.features;

        return (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl border bg-white p-6 shadow-sm",
              plan.id.includes("premium") && "border-[#EA580C]/30 ring-1 ring-[#EA580C]/20",
              plan.id === "company_annual" && "border-[#3B5998]/30",
              isCurrent && "ring-2 ring-emerald-500"
            )}
          >
            {plan.id === "premium_yearly" && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#EA580C] px-3 py-0.5 text-[10px] font-bold text-white">
                {t("billing.plans.bestValue")}
              </span>
            )}
            <h3 className="text-lg font-bold text-[#0F172A]">
              {locale === "ar" ? plan.nameAr : plan.nameEn}
            </h3>
            <p className="mt-2">
              <span className="text-3xl font-bold text-[#0F172A]">
                {plan.priceSar === 0 ? t("billing.plans.free") : formatSar(plan.priceSar)}
              </span>
              {plan.interval !== "none" && (
                <span className="text-sm text-slate-400">
                  /
                  {plan.interval === "month"
                    ? t("billing.plans.intervalMonth")
                    : t("billing.plans.intervalYear")}
                </span>
              )}
            </p>
            <ul className="mt-4 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(plan)}
              disabled={isCurrent || plan.priceSar === 0 || loading === plan.id}
              className={cn(
                "mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-opacity",
                isCurrent
                  ? "bg-emerald-100 text-emerald-700"
                  : plan.priceSar === 0
                    ? "bg-slate-100 text-slate-400"
                    : "bg-[#EA580C] text-white hover:opacity-90 disabled:opacity-50"
              )}
            >
              {loading === plan.id
                ? t("billing.plans.processing")
                : isCurrent
                  ? t("billing.plans.currentPlan")
                  : plan.priceSar === 0
                    ? t("billing.plans.active")
                    : t("billing.plans.subscribe")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
