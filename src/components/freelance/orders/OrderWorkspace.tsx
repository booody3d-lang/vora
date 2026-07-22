"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FreelanceOrder, OrderMessage, OrderStatus } from "@/types/freelance";
import { ReviewModal } from "@/components/freelance/orders/ReviewModal";
import { CommissionBreakdown } from "@/components/billing/CommissionBreakdown";
import { calculateCommission, formatSar } from "@/lib/billing/engine";
import { useNotificationTrigger } from "@/hooks/useNotificationTrigger";
import {
  disputeFiledAlert,
  orderDeliveredAlert,
  reviewPublishedAlert,
  revisionRequestedAlert,
} from "@/lib/notifications/triggers";
import { useLocale } from "@/providers/LocaleProvider";

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "Paid · Escrow Locked" },
  { status: "awaiting_requirements", label: "Requirements" },
  { status: "in_progress", label: "In Progress" },
  { status: "delivered", label: "Delivered" },
  { status: "completed", label: "Completed" },
];

interface OrderWorkspaceProps {
  initialOrder: FreelanceOrder;
  initialMessages: OrderMessage[];
  isBuyer?: boolean;
  viewerAccountId?: string;
  viewerName?: string;
}

export function OrderWorkspace({
  initialOrder,
  initialMessages,
  isBuyer = true,
  viewerAccountId,
  viewerName,
}: OrderWorkspaceProps) {
  const { t } = useLocale();
  const { fire } = useNotificationTrigger();
  const [order, setOrder] = useState(initialOrder);
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [requirements, setRequirements] = useState(order.requirementsText ?? "");
  const [showReview, setShowReview] = useState(false);
  const escrowSyncedRef = useRef(false);

  const persistOrder = useCallback(
    async (updates: Partial<FreelanceOrder>) => {
      setOrder((current) => ({ ...current, ...updates }));

      if (order.id === "ord-1" || order.id === "ord-new") return;

      try {
        const response = await fetch(`/api/freelance/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (response.ok) {
          const payload = (await response.json()) as { order?: FreelanceOrder };
          if (payload.order) setOrder(payload.order);
        }
      } catch {
        // Keep optimistic UI when persistence is unavailable.
      }
    },
    [order.id]
  );

  const persistMessage = useCallback(
    async (input: {
      content?: string;
      fileUrl?: string;
      fileName?: string;
      isSystem?: boolean;
      senderName?: string;
    }) => {
      const optimistic: OrderMessage = {
        id: `msg-${Date.now()}`,
        senderId: input.isSystem ? "system" : (viewerAccountId ?? (isBuyer ? "buyer" : "seller")),
        senderName:
          input.senderName ??
          (input.isSystem ? "VORA Escrow" : isBuyer ? "You (Buyer)" : "You (Seller)"),
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        isSystem: input.isSystem ?? false,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimistic]);

      if (order.id === "ord-1" || order.id === "ord-new") return;

      try {
        const response = await fetch(`/api/freelance/orders/${order.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (response.ok) {
          const payload = (await response.json()) as { message?: OrderMessage };
          if (payload.message) {
            setMessages((prev) => [...prev.filter((msg) => msg.id !== optimistic.id), payload.message!]);
          }
        }
      } catch {
        // Keep optimistic message.
      }
    },
    [isBuyer, order.id, viewerAccountId]
  );

  useEffect(() => {
    if (escrowSyncedRef.current) return;
    if (order.status !== "pending_payment" || order.escrowReleased) return;

    escrowSyncedRef.current = true;

    void (async () => {
      try {
        const response = await fetch(`/api/billing/orders/${order.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerId: order.sellerId,
            total: order.totalPrice,
            serviceTitle: order.service.title,
            orderNumber: order.orderNumber,
          }),
        });

        if (!response.ok) return;

        await persistOrder({ status: "awaiting_requirements" });
        await persistMessage({
          isSystem: true,
          content: `Payment of SAR ${order.totalPrice} received. Funds secured in escrow.`,
        });
      } catch {
        // Escrow sync is best-effort for demo/json orders.
      }
    })();
  }, [
    order.escrowReleased,
    order.id,
    order.orderNumber,
    order.sellerId,
    order.service.title,
    order.status,
    order.totalPrice,
    persistMessage,
    persistOrder,
  ]);

  function addMessage(content: string, isSystem = false) {
    void persistMessage({
      content,
      isSystem,
      senderName: isSystem
        ? "VORA Escrow"
        : isBuyer
          ? "You (Buyer)"
          : viewerName ?? "You (Seller)",
    });
  }

  function submitRequirements() {
    if (!requirements.trim()) return;
    void persistOrder({ status: "in_progress", requirementsText: requirements });
    addMessage("Requirements submitted. Seller can now start work.", true);
  }

  function deliverWork() {
    void persistOrder({
      status: "delivered",
      deliveryFiles: ["final-deliverables.zip"],
    });
    addMessage("Seller delivered the final work.", true);
    void fire(orderDeliveredAlert(order.orderNumber, order.id, order.service.storeName));
  }

  function acceptOrder() {
    setShowReview(true);
  }

  function handleReviewSubmit() {
    const split = calculateCommission(order.totalPrice);
    void persistOrder({ status: "completed", escrowReleased: true });
    setShowReview(false);
    addMessage(
      `Order completed. ${formatSar(split.freelancerNetEarnings)} deposited to seller wallet (${formatSar(split.platformCommission)} platform fee).`,
      true
    );
    fetch(`/api/billing/orders/${order.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId: order.sellerId,
        total: order.totalPrice,
        serviceTitle: order.service.title,
        buyerName: viewerName ?? (isBuyer ? "Buyer" : order.service.storeName),
      }),
    }).catch(() => {});
    void fire(reviewPublishedAlert(order.orderNumber, 5));
  }

  function requestRevision() {
    if (order.revisionsRemaining <= 0) return;
    const remaining = order.revisionsRemaining - 1;
    void persistOrder({
      status: "revision_requested",
      revisionsRemaining: remaining,
    });
    addMessage(`Revision requested. ${remaining} revisions remaining.`, true);
    void fire(revisionRequestedAlert(order.orderNumber, order.id, remaining));
    setTimeout(() => {
      void persistOrder({ status: "in_progress" });
    }, 500);
  }

  function initiateDispute() {
    void persistOrder({ status: "disputed" });
    addMessage("Dispute ticket opened. Admin will review within 48 hours.", true);
    void fire(disputeFiledAlert(order.orderNumber, order.id, order.totalPrice));
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">Order #{order.orderNumber}</p>
            <h1 className="text-xl font-bold text-[#0F172A]">{order.service.title}</h1>
            <p className="mt-1 text-sm text-[#EA580C] font-semibold">SAR {order.totalPrice} · {order.currency}</p>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase text-[#EA580C]">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto">
          {STATUS_STEPS.map((step, i) => (
            <div
              key={step.status}
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${
                i <= currentStepIndex ? "bg-[#EA580C] text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.label}
            </div>
          ))}
        </div>

        {!order.escrowReleased && order.status !== "pending_payment" && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            🔒 {t("order.escrow")} — SAR {order.totalPrice}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex h-[480px] flex-col rounded-2xl border border-orange-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-[#0F172A]">Order Chat</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <li key={msg.id} className={`${msg.isSystem ? "text-center" : ""}`}>
                    {msg.isSystem ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-500">{msg.content}</span>
                    ) : (
                      <div className={`flex ${msg.senderId === order.buyerId || msg.senderName.includes("Buyer") ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          msg.senderId === order.buyerId || msg.senderName.includes("Buyer")
                            ? "bg-[#EA580C] text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}>
                          <p className="text-[10px] opacity-70">{msg.senderName}</p>
                          {msg.content && <p>{msg.content}</p>}
                          {msg.fileName && <p className="mt-1 text-xs underline">📎 {msg.fileName}</p>}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-100 p-3">
              <div className="flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newMessage.trim()) {
                      addMessage(newMessage.trim());
                      setNewMessage("");
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newMessage.trim()) {
                      addMessage(newMessage.trim());
                      setNewMessage("");
                    }
                  }}
                  className="rounded-xl bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(order.status === "paid" || order.status === "awaiting_requirements") && isBuyer && (
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-[#0F172A]">{t("order.requirements")}</h3>
              <p className="mt-1 text-xs text-slate-400">Seller cannot start until you submit requirements.</p>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                placeholder="Describe your project requirements..."
                className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#EA580C]"
              />
              <button
                type="button"
                onClick={submitRequirements}
                disabled={!requirements.trim()}
                className="mt-2 w-full rounded-lg bg-[#EA580C] py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Submit Requirements
              </button>
            </div>
          )}

          {!isBuyer && order.status === "in_progress" && (
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-[#0F172A]">{t("order.deliver")}</h3>
              <div className="mt-3 rounded-lg border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                Upload final deliverables (zip/file)
              </div>
              <button
                type="button"
                onClick={deliverWork}
                className="mt-2 w-full rounded-lg bg-[#EA580C] py-2 text-sm font-semibold text-white"
              >
                {t("order.deliver")}
              </button>
            </div>
          )}

          {isBuyer && order.status === "delivered" && (
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <h3 className="font-semibold text-[#0F172A]">Review Delivery</h3>
              <p className="mt-1 text-xs text-slate-400">{order.revisionsRemaining} revisions remaining</p>
              <div className="mt-3 space-y-2">
                <button type="button" onClick={acceptOrder} className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white">
                  ✓ {t("order.accept")}
                </button>
                <button type="button" onClick={requestRevision} disabled={order.revisionsRemaining <= 0} className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium disabled:opacity-40">
                  ↩ {t("order.revision")}
                </button>
                <button type="button" onClick={initiateDispute} className="w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600">
                  ⚠ {t("order.dispute")}
                </button>
              </div>
            </div>
          )}

          {order.status === "completed" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-2xl">✓</p>
                <p className="mt-1 font-semibold text-emerald-800">Order Completed</p>
                <p className="text-xs text-emerald-600">Funds released to seller</p>
              </div>
              <CommissionBreakdown orderTotal={order.totalPrice} />
            </div>
          )}
        </div>
      </div>

      <ReviewModal open={showReview} onSubmit={handleReviewSubmit} />
    </div>
  );
}
