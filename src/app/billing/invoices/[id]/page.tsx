"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { InvoiceTemplate } from "@/components/billing/InvoiceTemplate";
import { useTranslations } from "@/i18n/use-translations";
import { DEMO_INVOICES } from "@/lib/billing/engine";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useTranslations();
  const { id } = use(params);
  const invoice = DEMO_INVOICES.find((inv) => inv.id === id);
  if (!invoice) notFound();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-[#0F172A]">
          {t("billing.invoices.detailTitle").replace("{number}", invoice.invoiceNumber)}
        </h1>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("billing.invoices.downloadPrint")}
        </button>
      </div>
      <InvoiceTemplate invoice={invoice} printable />
    </div>
  );
}
