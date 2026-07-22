"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PlanSelector } from "@/components/billing/PlanSelector";
import { useTranslations } from "@/i18n/use-translations";
import type { PlanDefinition } from "@/types/billing";

export function PlansPageContent() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [individualPlan, setIndividualPlan] = useState("free");
  const [companyPlan, setCompanyPlan] = useState("free");
  const [simulationMode, setSimulationMode] = useState(true);
  const [paymentProviderLabel, setPaymentProviderLabel] = useState("");
  const [hasBillingAccount, setHasBillingAccount] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successNotice, setSuccessNotice] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, userSubRes, companySubRes] = await Promise.all([
        fetch("/api/billing/plans", { credentials: "include" }),
        fetch("/api/subscription/me?audience=user", { credentials: "include" }),
        fetch("/api/subscription/me?audience=company", { credentials: "include" }),
      ]);

      const plansData = await plansRes.json();
      if (plansRes.ok) {
        setPlans(plansData.plans ?? []);
        setSimulationMode(Boolean(plansData.simulationMode));
        setPaymentProviderLabel(String(plansData.paymentProviderLabel ?? ""));
      }

      const userSubData = await userSubRes.json();
      if (userSubRes.ok && userSubData.authenticated) {
        setIndividualPlan(userSubData.currentPlanId ?? "free");
        setHasBillingAccount(Boolean(userSubData.hasBillingAccount));
      }

      const companySubData = await companySubRes.json();
      if (companySubRes.ok && companySubData.authenticated) {
        setCompanyPlan(companySubData.currentPlanId ?? "free");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessNotice(
        searchParams.get("simulated") === "true"
          ? t("billing.plans.simulationSuccess")
          : t("billing.plans.paymentSuccess")
      );
    }
  }, [searchParams, t]);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.simulated) {
        const shouldCancel = window.confirm(t("billing.plans.cancelSimulationConfirm"));
        if (!shouldCancel) return;

        const cancelRes = await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "cancel" }),
        });
        const cancelData = await cancelRes.json();
        if (cancelRes.ok) {
          setSuccessNotice(t("billing.plans.simulationCancelled"));
          await loadPlans();
        } else {
          alert(cancelData.error ?? t("billing.plans.paymentFailed"));
        }
        return;
      }

      alert(data.error ?? t("billing.plans.paymentFailed"));
    } catch {
      alert(t("billing.plans.paymentFailed"));
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.plans.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("billing.plans.subtitle")}</p>
        </div>
        {hasBillingAccount && (
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            disabled={portalLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {portalLoading ? t("billing.plans.processing") : t("billing.plans.manageSubscription")}
          </button>
        )}
      </div>

      {simulationMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("billing.plans.simulationBanner").replace("{provider}", paymentProviderLabel)}
        </div>
      )}

      {successNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {successNotice}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">
          {t("billing.plans.individualSection")}
        </h2>
        <PlanSelector
          plans={plans}
          currentPlan={individualPlan}
          target="individual"
          simulationMode={simulationMode}
          onSubscriptionChange={() => void loadPlans()}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">
          {t("billing.plans.companySection")}
        </h2>
        <PlanSelector
          plans={plans}
          currentPlan={companyPlan}
          target="company"
          simulationMode={simulationMode}
          onSubscriptionChange={() => void loadPlans()}
        />
        <p className="mt-3 text-xs text-slate-400">{t("billing.plans.companyNote")}</p>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {t("billing.plans.freelancerNote")}
      </div>
    </div>
  );
}
