import Link from "next/link";

export default function FreelanceOrdersPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">Orders</h1>
      <p className="mt-2 text-sm text-slate-600">
        Track buyer orders, escrow status, and delivery milestones from your freelance store.
      </p>
      <ul className="mt-6 space-y-3">
        <li>
          <Link
            href="/freelance/dashboard"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-[#EA580C]/30"
          >
            <p className="font-semibold text-[#0F172A]">Seller dashboard</p>
            <p className="mt-1 text-sm text-slate-500">View active orders and revenue analytics.</p>
          </Link>
        </li>
        <li>
          <Link
            href="/freelance/messages"
            className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-[#EA580C]/30"
          >
            <p className="font-semibold text-[#0F172A]">Order messages</p>
            <p className="mt-1 text-sm text-slate-500">Communicate with buyers about open orders.</p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
