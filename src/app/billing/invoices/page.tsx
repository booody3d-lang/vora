import Link from "next/link";
import { DEMO_INVOICES, formatSar } from "@/lib/billing/engine";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Downloadable PDF invoices for subscriptions, purchases, and commission deductions
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3">Invoice #</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {DEMO_INVOICES.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                <td className="px-5 py-3 capitalize">{inv.type.replace(/_/g, " ")}</td>
                <td className="px-5 py-3 text-slate-500">
                  {new Date(inv.issuedAt).toLocaleDateString("en-SA")}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{formatSar(inv.total)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/billing/invoices/${inv.id}`}
                    className="text-[#EA580C] hover:underline"
                  >
                    View / Download
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
