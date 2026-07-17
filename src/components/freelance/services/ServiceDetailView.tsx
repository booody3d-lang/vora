"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketplaceService } from "@/types/freelance";
import { getStoreUrl, getOrderUrl } from "@/lib/freelance/mock-data";
import { useLocale } from "@/providers/LocaleProvider";

interface ServiceDetailViewProps {
  service: MarketplaceService;
}

export function ServiceDetailView({ service }: ServiceDetailViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const images = [service.thumbnailUrl, ...service.galleryUrls];
  const addonsTotal = service.addons
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const extraDays = service.addons
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.extraDays, 0);
  const totalPrice = service.price + addonsTotal;
  const deliveryDays = Math.max(1, service.deliveryDays + extraDays);

  function toggleAddon(id: string) {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function handleBuyNow() {
    router.push(getOrderUrl("ord-new"));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: Media & Description */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            <img
              src={images[activeImage]}
              alt={service.title}
              className="aspect-video w-full object-cover"
            />
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeImage === i ? "border-[#EA580C]" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {service.videoUrl && (
              <div className="border-t border-slate-100 p-4">
                <p className="mb-2 text-sm font-semibold text-[#0F172A]">Service Demo</p>
                <video src={service.videoUrl} controls className="w-full rounded-lg" />
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#0F172A]">About This Service</h2>
            <div className="prose prose-sm mt-4 max-w-none text-slate-600">
              {service.description.split("\n").map((line, i) => (
                <p key={i} className={line.startsWith("##") ? "mt-4 font-bold text-[#0F172A]" : ""}>
                  {line.replace(/^##\s*/, "").replace(/^-\s*/, "• ")}
                </p>
              ))}
            </div>
          </div>

          {service.faq.length > 0 && (
            <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#0F172A]">FAQ</h2>
              <div className="mt-4 space-y-2">
                {service.faq.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#0F172A]"
                    >
                      {item.question}
                      <span>{openFaq === i ? "−" : "+"}</span>
                    </button>
                    {openFaq === i && (
                      <p className="border-t border-slate-50 px-4 py-3 text-sm text-slate-600">{item.answer}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Purchase Box */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-orange-100 bg-white p-6 shadow-lg">
            <Link href={getStoreUrl(service.storeSlug)} className="flex items-center gap-2">
              <img src={service.sellerAvatar} alt="" className="h-8 w-8 rounded-full" />
              <span className="text-sm font-medium text-slate-600 hover:text-[#EA580C]">{service.storeName}</span>
            </Link>
            <h1 className="mt-3 text-xl font-bold text-[#0F172A]">{service.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-amber-500">★ {service.rating}</span>
              <span className="text-xs text-slate-400">({service.reviewCount} reviews · {service.salesCount} sales)</span>
            </div>

            <div className="mt-4 rounded-xl bg-orange-50 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Base Price</p>
              <p className="text-3xl font-bold text-[#EA580C]">SAR {service.price}</p>
            </div>

            {service.addons.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-[#0F172A]">Add-on Extras</p>
                <ul className="mt-2 space-y-2">
                  {service.addons.map((addon) => (
                    <li key={addon.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-orange-50/50">
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(addon.id)}
                          onChange={() => toggleAddon(addon.id)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0F172A]">{addon.title}</p>
                          {addon.description && <p className="text-xs text-slate-400">{addon.description}</p>}
                        </div>
                        <span className="text-sm font-semibold text-[#EA580C]">+SAR {addon.price}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex justify-between">
                <span>{t("deliveryTime")}</span>
                <strong>{deliveryDays} days</strong>
              </li>
              <li className="flex justify-between">
                <span>{t("revisions")}</span>
                <strong>{service.revisionsIncluded} included</strong>
              </li>
            </ul>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-[#EA580C]">SAR {totalPrice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuyNow}
              className="mt-4 w-full rounded-xl bg-[#EA580C] py-3.5 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
            >
              {t("buyNow")}
            </button>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              🔒 Protected by VORA Escrow · Fixed price · No bidding
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
