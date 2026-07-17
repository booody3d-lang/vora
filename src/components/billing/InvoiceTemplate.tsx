import type { Invoice } from "@/types/billing";
import { formatSar } from "@/lib/billing/engine";

interface InvoiceTemplateProps {
  invoice: Invoice;
  printable?: boolean;
}

export function InvoiceTemplate({ invoice, printable = false }: InvoiceTemplateProps) {
  const isCorporate = Boolean(invoice.companyName);

  return (
    <div
      id="invoice-print"
      className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ${printable ? "print:shadow-none print:border-0" : ""}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">VORA</h1>
          <p className="text-xs text-slate-500">Billing & Compliance · Saudi Riyal (SR)</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#EA580C]">TAX INVOICE</p>
          <p className="text-sm font-mono text-slate-600">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-400">
            {new Date(invoice.issuedAt).toLocaleDateString("en-SA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Corporate fields */}
      {isCorporate && (
        <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-400">Bill To</p>
            <p className="font-semibold text-[#0F172A]">{invoice.companyName}</p>
            <p className="text-sm text-slate-600">{invoice.companyAddress}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-400">Tax Registration (VAT)</p>
            <p className="font-mono text-sm text-[#0F172A]">{invoice.companyTaxId}</p>
          </div>
        </div>
      )}

      {/* Line items */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="pb-2">Description</th>
            <th className="pb-2 text-center">Qty</th>
            <th className="pb-2 text-right">Unit Price</th>
            <th className="pb-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={i} className="border-b border-slate-50">
              <td className="py-3 text-[#0F172A]">{item.description}</td>
              <td className="py-3 text-center text-slate-600">{item.quantity}</td>
              <td className="py-3 text-right text-slate-600">{formatSar(item.unitPrice)}</td>
              <td className="py-3 text-right font-medium">{formatSar(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatSar(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">VAT (15%)</span>
              <span>{formatSar(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-[#EA580C]">{formatSar(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <p>Transaction ID: <span className="font-mono">{invoice.transactionId}</span></p>
        <p className="mt-1">Type: {invoice.type.replace(/_/g, " ")} · Currency: {invoice.currency}</p>
        <p className="mt-2">This is an official VORA financial document suitable for corporate accounting records.</p>
      </div>
    </div>
  );
}
