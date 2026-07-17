"use client";

import { useState } from "react";
import type { ServiceOptimizeResult, PricingRecommendResult } from "@/types/ai";
import { AILoadingSpinner, AIPanelShell, AISourceBadge, useAI } from "@/components/ai/AIPanelShell";
import { useLocale } from "@/providers/LocaleProvider";
import { formatSar } from "@/lib/billing/engine";

export function ServiceOptimizationWizard() {
  const { locale } = useLocale();
  const { invoke, loading, error, source } = useAI<ServiceOptimizeResult>();
  const pricingAI = useAI<PricingRecommendResult>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Design");
  const [deliveryDays, setDeliveryDays] = useState(5);
  const [seoResult, setSeoResult] = useState<ServiceOptimizeResult | null>(null);
  const [priceResult, setPriceResult] = useState<PricingRecommendResult | null>(null);

  async function optimize() {
    const [seo, price] = await Promise.all([
      invoke("service-optimize", { title, description, category, deliveryDays, locale }),
      pricingAI.invoke("pricing-recommend", { title, category, deliveryDays, scope: description }),
    ]);
    if (seo) setSeoResult(seo);
    if (price) setPriceResult(price);
  }

  return (
    <AIPanelShell
      title="AI Service & Store Optimization"
      titleAr="تحسين الخدمة والمتجر بالذكاء الاصطناعي"
      description="SEO tags, title improvements & SAR pricing recommendations"
      descriptionAr="وسوم SEO وتحسين العناوين وتوصيات التسعير بالريال"
      locale={locale}
      isPremium={true}
      badge="Freelance AI"
    >
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={locale === "ar" ? "عنوان الخدمة" : "Service Title"} className="ai-input" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={locale === "ar" ? "الوصف" : "Description"} rows={3} className="ai-input" />
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="ai-input flex-1">
            <option>Design</option>
            <option>Development</option>
            <option>Marketing</option>
            <option>Writing</option>
          </select>
          <input type="number" value={deliveryDays} onChange={(e) => setDeliveryDays(Number(e.target.value))} className="ai-input w-24" min={1} />
        </div>
      </div>
      <button type="button" onClick={optimize} disabled={loading || !title} className="ai-btn mt-3">
        {locale === "ar" ? "تحسين واقتراح السعر" : "Optimize & Price"}
      </button>
      {(loading || pricingAI.loading) && <AILoadingSpinner />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {seoResult && (
        <div className="mt-4 space-y-3">
          <AISourceBadge source={source} />
          <p className="text-sm"><strong>EN:</strong> {seoResult.improvedTitle.en}</p>
          <p className="text-sm" dir="rtl"><strong>AR:</strong> {seoResult.improvedTitle.ar}</p>
          <div className="flex flex-wrap gap-1">
            {(locale === "ar" ? seoResult.seoTags.ar : seoResult.seoTags.en).map((t) => (
              <span key={t} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-[#EA580C]">#{t}</span>
            ))}
          </div>
        </div>
      )}
      {priceResult && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-lg font-bold text-emerald-700">{formatSar(priceResult.recommendedPriceSar)}</p>
          <p className="text-xs text-slate-500">{priceResult.marketComparison}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {priceResult.tiers.map((t) => (
              <div key={t.label} className="rounded-lg bg-white p-2 text-center text-xs">
                <p className="font-bold">{t.label}</p>
                <p className="text-[#EA580C]">{formatSar(t.priceSar)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AIPanelShell>
  );
}
