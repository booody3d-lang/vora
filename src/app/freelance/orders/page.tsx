import Link from "next/link";
import { redirect } from "next/navigation";
import { listOrdersForAccount } from "@/lib/freelance/orders-store";
import { getOrderUrl } from "@/lib/freelance/mock-data";
import { getAuthenticatedUser } from "@/lib/security/session";

export default async function FreelanceOrdersPage() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    redirect("/login");
  }

  const orders = await listOrdersForAccount(auth.user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">Orders</h1>
      <p className="mt-2 text-sm text-slate-600">
        Track buyer orders, escrow status, and delivery milestones from your freelance store.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="font-medium text-[#0F172A]">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Browse the marketplace to place your first order with VORA Escrow protection.
          </p>
          <Link
            href="/freelance"
            className="mt-4 inline-block rounded-xl bg-[#EA580C] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Browse services
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => {
            const role = order.buyerId === auth.user.id ? "Buyer" : "Seller";
            return (
              <li key={order.id}>
                <Link
                  href={getOrderUrl(order.id)}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-[#EA580C]/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-400">#{order.orderNumber}</p>
                      <p className="font-semibold text-[#0F172A]">{order.service.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {role} · SAR {order.totalPrice}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-bold uppercase text-[#EA580C]">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/freelance/dashboard"
          className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-[#EA580C]/30"
        >
          <p className="font-semibold text-[#0F172A]">Seller dashboard</p>
          <p className="mt-1 text-sm text-slate-500">View active orders and revenue analytics.</p>
        </Link>
        <Link
          href="/freelance/messages"
          className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-[#EA580C]/30"
        >
          <p className="font-semibold text-[#0F172A]">Order messages</p>
          <p className="mt-1 text-sm text-slate-500">Communicate with buyers about open orders.</p>
        </Link>
      </div>
    </div>
  );
}
