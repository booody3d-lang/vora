"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { InvoiceTemplate } from "@/components/billing/InvoiceTemplate";
import { DEMO_INVOICES } from "@/lib/billing/engine";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const invoice = DEMO_INVOICES.find((inv) => inv.id === id);
  if (!invoice) notFound();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-[#0F172A]">Invoice {invoice.invoiceNumber}</h1>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Download PDF / Print
        </button>
      </div>
      <InvoiceTemplate invoice={invoice} printable />
    </div>
  );
}
