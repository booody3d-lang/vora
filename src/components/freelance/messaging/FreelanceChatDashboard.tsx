"use client";

import { useState } from "react";
import type { FreelanceChatSession, FreelanceInquiry } from "@/types/notifications";
import { DEMO_FREELANCE_CHATS, DEMO_INQUIRIES } from "@/lib/notifications/mock-data";
import { MessageInput } from "@/components/network/messaging/MessageInput";
import { useLocale } from "@/providers/LocaleProvider";
import { useNotificationTrigger } from "@/hooks/useNotificationTrigger";
import { buildTriggerNotification } from "@/lib/notifications/triggers";
import { cn } from "@/lib/utils";

interface FreelanceChatDashboardProps {
  initialChats?: FreelanceChatSession[];
  initialInquiries?: FreelanceInquiry[];
  isSeller?: boolean;
  viewerAccountId?: string;
}

export function FreelanceChatDashboard({
  initialChats = DEMO_FREELANCE_CHATS,
  initialInquiries = DEMO_INQUIRIES,
  isSeller = true,
  viewerAccountId,
}: FreelanceChatDashboardProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { fire } = useNotificationTrigger();
  const [chats, setChats] = useState(initialChats);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [activeId, setActiveId] = useState(chats.find((c) => c.isUnlocked)?.id ?? chats[0]?.id ?? "");
  const [messages, setMessages] = useState<{ id: string; senderId: string; content: string; createdAt: string }[]>([
    { id: "m1", senderId: "buyer", content: "Hi! I've submitted the requirements.", createdAt: "2026-07-15T14:00:00Z" },
    { id: "m2", senderId: "seller", content: "Got it! Starting work now.", createdAt: "2026-07-15T14:30:00Z" },
  ]);

  const active = chats.find((c) => c.id === activeId);

  function acceptInquiry(id: string) {
    const inq = inquiries.find((i) => i.id === id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: "accepted" as const } : i)));
    setChats((prev) =>
      prev.map((c) =>
        c.id === "fc2" ? { ...c, isUnlocked: true, unlockReason: "inquiry_accepted" as const } : c
      )
    );

    void fetch(`/api/freelance/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted" }),
    }).catch(() => {});

    if (inq) {
      void fire(
        buildTriggerNotification({
          trigger: "new_order",
          title: "Inquiry accepted — chat unlocked",
          titleAr: "تم قبول الاستفسار — فُتحت المحادثة",
          body: `${inq.buyerName} can now message you about "${inq.serviceTitle}".`,
          bodyAr: `${inq.buyerName} يمكنه مراسلتك بخصوص "${inq.serviceTitle}".`,
          href: "/freelance/messages",
        })
      );
    }
  }

  function sendMessage(content: string) {
    if (!active?.isUnlocked) return;
    const senderId = viewerAccountId ?? (isSeller ? "seller" : "buyer");
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, senderId, content, createdAt: new Date().toISOString() },
    ]);

    if (viewerAccountId && !active.id.startsWith("fc")) {
      void fetch(`/api/freelance/chat/${active.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).catch(() => {});
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#0F172A]">
          {isAr ? "محادثات Freelance" : "Freelance Messages"}
        </h1>
        <p className="text-sm text-slate-500">
          {isAr
            ? "مقفلة حتى الدفع (Escrow) أو قبول الاستفسار"
            : "Locked until Escrow payment or inquiry acceptance"}
        </p>
      </div>

      {isSeller && inquiries.filter((i) => i.status === "pending").length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-bold text-amber-800">
            {isAr ? "طلبات استفسار أولية" : "Initial Inquiry Requests"}
          </h3>
          {inquiries.filter((i) => i.status === "pending").map((inq) => (
            <div key={inq.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
              <div>
                <p className="text-sm font-medium">{inq.buyerName} — {inq.serviceTitle}</p>
                <p className="text-xs text-slate-500">{inq.message}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => acceptInquiry(inq.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {isAr ? "قبول وفتح المحادثة" : "Accept & Unlock Chat"}
                </button>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                  {isAr ? "رفض" : "Decline"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
        <div className="w-full border-r border-slate-100 md:w-80">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-[#0F172A]">{isAr ? "المحادثات" : "Conversations"}</p>
          </div>
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-orange-50/50",
                    activeId === chat.id && "bg-orange-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{chat.buyerName}</p>
                    <p className="truncate text-xs text-slate-400">{chat.lastMessage || (isAr ? "لا رسائل" : "No messages")}</p>
                  </div>
                  {!chat.isUnlocked && (
                    <span className="shrink-0 text-sm">🔒</span>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="rounded-full bg-[#EA580C] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden flex-1 flex-col md:flex">
          {active ? (
            <>
              {active.orderNumber && active.isUnlocked && (
                <OrderProgressWidget
                  orderNumber={active.orderNumber}
                  status={active.orderStatus ?? "paid"}
                  locale={locale}
                />
              )}
              {!active.isUnlocked ? (
                <ChatLockedState locale={locale} />
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <ul className="space-y-3">
                      {messages.map((msg) => (
                        <li key={msg.id} className={`flex ${msg.senderId === (isSeller ? "seller" : "buyer") ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            msg.senderId === (isSeller ? "seller" : "buyer") ? "bg-[#EA580C] text-white" : "bg-slate-100"
                          }`}>
                            {msg.content}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <MessageInput onSend={sendMessage} />
                </>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              {isAr ? "اختر محادثة" : "Select a conversation"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderProgressWidget({
  orderNumber,
  status,
  locale,
}: {
  orderNumber: string;
  status: string;
  locale: string;
}) {
  const isAr = locale === "ar";
  const steps = [
    { key: "paid", label: isAr ? "مدفوع" : "Paid" },
    { key: "in_progress", label: isAr ? "قيد التنفيذ" : "Executing" },
    { key: "delivered", label: isAr ? "مُسلّم" : "Delivered" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status) >= 0
    ? steps.findIndex((s) => s.key === status)
    : status === "awaiting_requirements" ? 0 : 1;

  return (
    <div className="border-b border-orange-100 bg-orange-50/50 px-4 py-3">
      <p className="text-[10px] font-bold uppercase text-[#EA580C]">
        {isAr ? "تقدم الطلب" : "Order Progress"} · {orderNumber}
      </p>
      <div className="mt-2 flex gap-2">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={cn(
              "flex-1 rounded-full py-1 text-center text-[10px] font-medium",
              i <= currentIdx ? "bg-[#EA580C] text-white" : "bg-slate-200 text-slate-400"
            )}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatLockedState({ locale }: { locale: string }) {
  const isAr = locale === "ar";
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="text-4xl">🔒</span>
      <h3 className="mt-3 font-bold text-[#0F172A]">
        {isAr ? "المحادثة مقفلة" : "Chat Locked"}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isAr
          ? "يتم فتح المحادثة بعد دفع Escrow (ريال سعودي) أو عند قبول طلب الاستفسار الأولي"
          : "Chat unlocks after Escrow payment (SR) or when you accept an Initial Inquiry Request"}
      </p>
    </div>
  );
}
