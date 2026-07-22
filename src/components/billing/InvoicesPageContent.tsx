"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_INVOICES, formatSar } from "@/lib/billing/engine";
import type { Invoice, InvoiceType } from "@/types/billing";

const INVOICE_TYPE_KEYS: Record<InvoiceType, string> = {
  subscription: "billing.invoices.typeSubscription",
  marketplace_purchase: "billing.invoices.typeMarketplacePurchase",
  commission: "billing.invoices.typeCommission",
  withdrawal: "billing.invoices.typeWithdrawal",
};

export function InvoicesPageContent() {
  const { t } = useTranslations();
  const { locale } = useLocale();
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES);

  useEffect(() => {
    fetch("/api/billing/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { invoices?: Invoice[] } | null) => {
        if (data?.invoices) setInvoices(data.invoices);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{t("billing.invoices.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("billing.invoices.subtitle")}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-start text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3">{t("billing.invoices.colNumber")}</th>
              <th className="px-5 py-3">{t("billing.invoices.colType")}</th>
              <th className="px-5 py-3">{t("billing.invoices.colDate")}</th>
              <th className="px-5 py-3 text-end">{t("billing.invoices.colTotal")}</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                <td className="px-5 py-3">{t(INVOICE_TYPE_KEYS[inv.type])}</td>
                <td className="px-5 py-3 text-slate-500">
                  {new Date(inv.issuedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA")}
                </td>
                <td className="px-5 py-3 text-end font-semibold">{formatSar(inv.total)}</td>
                <td className="px-5 py-3 text-end">
                  <Link
                    href={`/billing/invoices/${inv.id}`}
                    className="text-[#EA580C] hover:underline"
                  >
                    {t("billing.invoices.viewDownload")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
