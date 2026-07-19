"use client";

import { useCallback, useEffect, useState } from "react";
import type { SubscriptionFeature, SubscriptionTier } from "@/types/subscription";
import { useTranslations } from "@/i18n/use-translations";

export function AdminSubscriptionManager() {
  const { t } = useTranslations();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [overrideAccountId, setOverrideAccountId] = useState("");
  const [overrideTierId, setOverrideTierId] = useState("premium-user");
  const [overrideReason, setOverrideReason] = useState("Lifetime premium grant");
  const [draft, setDraft] = useState<Partial<SubscriptionTier> | null>(null);

  const loadTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscription/tiers", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setTiers(data.tiers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTiers();
  }, [loadTiers]);

  async function saveTier(tier: Partial<SubscriptionTier> & { id?: string }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/subscription/tiers", {
        method: tier.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(tier),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setDraft(null);
      await loadTiers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTier(id: string) {
    if (!window.confirm(t("admin.subscriptions.confirmDelete"))) return;
    await fetch(`/api/admin/subscription/tiers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await loadTiers();
  }

  async function grantOverride() {
    if (!overrideAccountId.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/subscription/overrides/${encodeURIComponent(overrideAccountId.trim())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            tierId: overrideTierId,
            reason: overrideReason,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Override failed");
      setOverrideAccountId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setSaving(false);
    }
  }

  async function reindexSearch() {
    await fetch("/api/admin/search/reindex", { method: "POST", credentials: "include" });
  }

  function parseFeatures(text: string): SubscriptionFeature[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, labelEn, labelAr] = line.split("|").map((part) => part.trim());
        return {
          key: key || `feature_${Math.random().toString(36).slice(2, 6)}`,
          labelEn: labelEn || key,
          labelAr: labelAr || labelEn || key,
        };
      });
  }

  if (loading) {
    return <p className="text-sm text-slate-400">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("admin.subscriptions.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("admin.subscriptions.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reindexSearch()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
          >
            {t("admin.subscriptions.reindexSearch")}
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft({
                nameEn: "New Tier",
                nameAr: "باقة جديدة",
                audience: "user",
                priceSar: 0,
                billingCycle: "monthly",
                features: [],
                isActive: true,
              })
            }
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("admin.subscriptions.createTier")}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}

      <section className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {t("admin.subscriptions.manualOverride")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={overrideAccountId}
            onChange={(e) => setOverrideAccountId(e.target.value)}
            placeholder={t("admin.subscriptions.accountIdPlaceholder")}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <select
            value={overrideTierId}
            onChange={(e) => setOverrideTierId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.nameEn}
              </option>
            ))}
          </select>
          <input
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder={t("admin.subscriptions.reasonPlaceholder")}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void grantOverride()}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("admin.subscriptions.grantLifetime")}
        </button>
      </section>

      {draft && (
        <section className="rounded-2xl border border-red-900/30 bg-[#0F172A] p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {draft.id ? t("admin.subscriptions.editTier") : t("admin.subscriptions.createTier")}
          </h2>
          <TierEditor
            tier={draft}
            onChange={setDraft}
            onSave={() => void saveTier(draft)}
            onCancel={() => setDraft(null)}
            saving={saving}
            parseFeatures={parseFeatures}
          />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {tiers.map((tier) => (
          <article key={tier.id} className="rounded-2xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {tier.iconSvg && (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 [&>svg]:h-6 [&>svg]:w-6"
                    dangerouslySetInnerHTML={{ __html: tier.iconSvg }}
                  />
                )}
                <div>
                  <h3 className="font-semibold text-white">
                    {tier.nameEn} / {tier.nameAr}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {tier.audience} · {tier.billingCycle} · {tier.priceSar} SAR
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(tier)}
                  className="text-xs text-slate-300 hover:text-white"
                >
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTier(tier.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-xs text-slate-400">
              {tier.features.map((feature) => (
                <li key={feature.key}>
                  {feature.labelEn} ({feature.key})
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function TierEditor({
  tier,
  onChange,
  onSave,
  onCancel,
  saving,
  parseFeatures,
}: {
  tier: Partial<SubscriptionTier>;
  onChange: (tier: Partial<SubscriptionTier>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  parseFeatures: (text: string) => SubscriptionFeature[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input
        value={tier.nameEn ?? ""}
        onChange={(e) => onChange({ ...tier, nameEn: e.target.value })}
        placeholder="Name (EN)"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <input
        value={tier.nameAr ?? ""}
        onChange={(e) => onChange({ ...tier, nameAr: e.target.value })}
        placeholder="Name (AR)"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <select
        value={tier.audience ?? "user"}
        onChange={(e) =>
          onChange({ ...tier, audience: e.target.value as SubscriptionTier["audience"] })
        }
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      >
        <option value="user">User</option>
        <option value="company">Company</option>
      </select>
      <select
        value={tier.billingCycle ?? "monthly"}
        onChange={(e) =>
          onChange({ ...tier, billingCycle: e.target.value as SubscriptionTier["billingCycle"] })
        }
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      >
        <option value="none">None</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="lifetime">Lifetime</option>
      </select>
      <input
        type="number"
        value={tier.priceSar ?? 0}
        onChange={(e) => onChange({ ...tier, priceSar: Number(e.target.value) })}
        placeholder="Price SAR"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <textarea
        value={tier.iconSvg ?? ""}
        onChange={(e) => onChange({ ...tier, iconSvg: e.target.value })}
        placeholder="Inline SVG icon"
        rows={3}
        className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <textarea
        defaultValue={tier.features?.map((f) => `${f.key}|${f.labelEn}|${f.labelAr}`).join("\n")}
        onChange={(e) => onChange({ ...tier, features: parseFeatures(e.target.value) })}
        placeholder="feature_key|Label EN|Label AR"
        rows={5}
        className="md:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
      />
      <div className="md:col-span-2 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
