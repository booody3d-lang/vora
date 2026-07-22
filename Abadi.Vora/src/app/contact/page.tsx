"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/use-translations";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function ContactPage() {
  const { t } = useTranslations();
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold text-[#0F172A]">{t("legal.contact.title")}</h1>
        <p className="mt-2 text-slate-600">{t("legal.contact.subtitle")}</p>
        <p className="mt-4 text-sm text-slate-500">
          {t("legal.contact.office")} · {t("legal.contact.supportEmail")}
        </p>

        {sent ? (
          <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {t("legal.contact.success")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("legal.contact.name")}
              </label>
              <input required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#3B5998]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("legal.contact.email")}
              </label>
              <input type="email" required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#3B5998]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("legal.contact.subject")}
              </label>
              <input required className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#3B5998]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("legal.contact.message")}
              </label>
              <textarea required rows={5} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#3B5998]" />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#3B5998] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("legal.contact.send")}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
