import Link from "next/link";

const NAV = [
  { href: "/billing/wallet", label: "Wallet" },
  { href: "/billing/plans", label: "Plans" },
  { href: "/billing/invoices", label: "Invoices" },
  { href: "/billing/withdraw", label: "Withdraw" },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <Link href="/" className="text-lg font-bold text-[#0F172A]">
              VORA <span className="text-[#EA580C]">Billing</span>
            </Link>
            <p className="text-xs text-slate-400">Saudi Riyal (SR) · Secure Financial Ledger</p>
          </div>
          <nav className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-[#EA580C]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
