"use client";

import type { Invoice, InvoiceType } from "@/types/billing";
import { formatSar } from "@/lib/billing/engine";
import { useLocale } from "@/providers/LocaleProvider";
import { useTranslations } from "@/i18n/use-translations";

interface InvoiceTemplateProps {
  invoice: Invoice;
  printable?: boolean;
}

const INVOICE_TYPE_KEYS: Record<InvoiceType, string> = {
  subscription: "billing.invoices.typeSubscription",
  marketplace_purchase: "billing.invoices.typeMarketplacePurchase",
  commission: "billing.invoices.typeCommission",
  withdrawal: "billing.invoices.typeWithdrawal",
};

export function InvoiceTemplate({ invoice, printable = false }: InvoiceTemplateProps) {
  const { t } = useTranslations();
  const { locale } = useLocale();
  const isCorporate = Boolean(invoice.companyName);

  return (
    <div
      id="invoice-print"
      className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ${printable ? "print:shadow-none print:border-0" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">VORA</h1>
          <p className="text-xs text-slate-500">{t("billing.invoiceTemplate.billingCompliance")}</p>
        </div>
        <div className="text-end">
          <p className="text-lg font-bold text-[#EA580C]">{t("billing.invoiceTemplate.taxInvoice")}</p>
          <p className="text-sm font-mono text-slate-600">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-400">
            {new Date(invoice.issuedAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {isCorporate && (
        <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-400">
              {t("billing.invoiceTemplate.billTo")}
            </p>
            <p className="font-semibold text-[#0F172A]">{invoice.companyName}</p>
            <p className="text-sm text-slate-600">{invoice.companyAddress}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-400">
              {t("billing.invoiceTemplate.taxRegistration")}
            </p>
            <p className="font-mono text-sm text-[#0F172A]">{invoice.companyTaxId}</p>
          </div>
        </div>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-start text-xs uppercase text-slate-400">
            <th className="pb-2">{t("billing.invoiceTemplate.description")}</th>
            <th className="pb-2 text-center">{t("billing.invoiceTemplate.qty")}</th>
            <th className="pb-2 text-end">{t("billing.invoiceTemplate.unitPrice")}</th>
            <th className="pb-2 text-end">{t("billing.invoiceTemplate.total")}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={i} className="border-b border-slate-50">
              <td className="py-3 text-[#0F172A]">
                {locale === "ar" && item.descriptionAr ? item.descriptionAr : item.description}
              </td>
              <td className="py-3 text-center text-slate-600">{item.quantity}</td>
              <td className="py-3 text-end text-slate-600">{formatSar(item.unitPrice)}</td>
              <td className="py-3 text-end font-medium">{formatSar(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">{t("billing.invoiceTemplate.subtotal")}</span>
            <span>{formatSar(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">{t("billing.invoiceTemplate.vat")}</span>
              <span>{formatSar(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>{t("billing.invoiceTemplate.total")}</span>
            <span className="text-[#EA580C]">{formatSar(invoice.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <p>
          {t("billing.invoiceTemplate.transactionId")}:{" "}
          <span className="font-mono">{invoice.transactionId}</span>
        </p>
        <p className="mt-1">
          {t("billing.invoiceTemplate.typeLabel")}: {t(INVOICE_TYPE_KEYS[invoice.type])} ·{" "}
          {t("billing.invoiceTemplate.currencyLabel")}: {invoice.currency}
        </p>
        <p className="mt-2">{t("billing.invoiceTemplate.footerNote")}</p>
      </div>
    </div>
  );
}
