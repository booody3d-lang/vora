import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import type { FreelanceChatSession, FreelanceInquiry } from "@/types/notifications";

interface DbChatSessionRow {
  id: string;
  order_id: string | null;
  buyer_id: string;
  seller_id: string;
  is_unlocked: boolean;
  unlock_reason: string | null;
  last_message_at: string;
  created_at: string;
}

interface DbMessageRow {
  id: string;
  session_id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

interface DbInquiryRow {
  id: string;
  service_id: string | null;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

async function resolveAccountName(accountId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select("full_name, email")
    .eq("id", accountId)
    .maybeSingle();
  if (!data) return "User";
  return (data.full_name as string | null) ?? (data.email as string) ?? "User";
}

function mapUnlockReason(value: string | null, isUnlocked: boolean): FreelanceChatSession["unlockReason"] {
  if (!isUnlocked) return "locked";
  if (value === "inquiry_accepted") return "inquiry_accepted";
  return "escrow_paid";
}

export async function listChatSessionsForAccountFromSupabase(
  accountId: string
): Promise<FreelanceChatSession[]> {
  if (!isValidBillingUuid(accountId)) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_chat_sessions")
    .select("*")
    .or(`buyer_id.eq.${accountId},seller_id.eq.${accountId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;

  const sessions: FreelanceChatSession[] = [];
  for (const row of (data ?? []) as DbChatSessionRow[]) {
    const [buyerName, sellerName] = await Promise.all([
      resolveAccountName(row.buyer_id),
      resolveAccountName(row.seller_id),
    ]);

    let orderNumber: string | undefined;
    let orderStatus: string | undefined;
    if (row.order_id && isValidBillingUuid(row.order_id)) {
      const { data: order } = await admin
        .from("freelance_orders")
        .select("order_number, status")
        .eq("id", row.order_id)
        .maybeSingle();
      orderNumber = order?.order_number as string | undefined;
      orderStatus = order?.status as string | undefined;
    }

    const { data: lastMessage } = await admin
      .from("freelance_messages")
      .select("content")
      .eq("session_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    sessions.push({
      id: row.id,
      orderId: row.order_id ?? undefined,
      orderNumber,
      orderStatus,
      buyerName,
      sellerName,
      isUnlocked: row.is_unlocked,
      unlockReason: mapUnlockReason(row.unlock_reason, row.is_unlocked),
      lastMessage: (lastMessage?.content as string | null) ?? "",
      lastMessageAt: row.last_message_at,
      unreadCount: 0,
    });
  }

  return sessions;
}

export async function ensureChatSessionForOrderInSupabase(orderId: string): Promise<string | null> {
  if (!isValidBillingUuid(orderId)) return null;

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("freelance_orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return null;

  const { data: existing } = await admin
    .from("freelance_chat_sessions")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const unlocked = !["pending_payment", "cancelled"].includes(order.status as string);
  const { data, error } = await admin
    .from("freelance_chat_sessions")
    .insert({
      order_id: orderId,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      is_unlocked: unlocked,
      unlock_reason: unlocked ? "escrow_paid" : "locked",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listMessagesForSessionFromSupabase(
  sessionId: string,
  accountId: string
): Promise<Array<{ id: string; senderId: string; content: string; createdAt: string }>> {
  if (!isValidBillingUuid(sessionId) || !isValidBillingUuid(accountId)) return [];

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("freelance_chat_sessions")
    .select("buyer_id, seller_id, is_unlocked")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return [];
  if (session.buyer_id !== accountId && session.seller_id !== accountId) return [];
  if (!session.is_unlocked) return [];

  const { data, error } = await admin
    .from("freelance_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as DbMessageRow[]).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    content: row.content ?? "",
    createdAt: row.created_at,
  }));
}

export async function insertChatMessageInSupabase(
  sessionId: string,
  senderId: string,
  content: string
): Promise<{ id: string; senderId: string; content: string; createdAt: string }> {
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("freelance_chat_sessions")
    .select("buyer_id, seller_id, is_unlocked")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("Session not found");
  if (session.buyer_id !== senderId && session.seller_id !== senderId) {
    throw new Error("Forbidden");
  }
  if (!session.is_unlocked) throw new Error("Chat is locked");

  const { data, error } = await admin
    .from("freelance_messages")
    .insert({
      session_id: sessionId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) throw error;

  await admin
    .from("freelance_chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", sessionId);

  const row = data as DbMessageRow;
  return {
    id: row.id,
    senderId: row.sender_id,
    content: row.content ?? "",
    createdAt: row.created_at,
  };
}

export async function listInquiriesForSellerFromSupabase(sellerId: string): Promise<FreelanceInquiry[]> {
  if (!isValidBillingUuid(sellerId)) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_inquiries")
    .select("*, freelance_services(title)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const inquiries: FreelanceInquiry[] = [];
  for (const row of (data ?? []) as Array<DbInquiryRow & { freelance_services: { title: string } | null }>) {
    inquiries.push({
      id: row.id,
      buyerName: await resolveAccountName(row.buyer_id),
      serviceTitle: row.freelance_services?.title ?? "Service",
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    });
  }
  return inquiries;
}

export async function updateInquiryStatusInSupabase(
  inquiryId: string,
  sellerId: string,
  status: "accepted" | "declined"
): Promise<FreelanceInquiry | null> {
  const admin = createAdminClient();
  const { data: inquiry, error: inquiryError } = await admin
    .from("freelance_inquiries")
    .select("*, freelance_services(title)")
    .eq("id", inquiryId)
    .maybeSingle();
  if (inquiryError) throw inquiryError;
  if (!inquiry || inquiry.seller_id !== sellerId) return null;

  const { data, error } = await admin
    .from("freelance_inquiries")
    .update({ status })
    .eq("id", inquiryId)
    .select("*, freelance_services(title)")
    .single();
  if (error) throw error;

  if (status === "accepted") {
    const { data: existingSession } = await admin
      .from("freelance_chat_sessions")
      .select("id")
      .eq("buyer_id", inquiry.buyer_id)
      .eq("seller_id", inquiry.seller_id)
      .is("order_id", null)
      .maybeSingle();

    if (existingSession) {
      await admin
        .from("freelance_chat_sessions")
        .update({ is_unlocked: true, unlock_reason: "inquiry_accepted" })
        .eq("id", existingSession.id);
    } else {
      await admin.from("freelance_chat_sessions").insert({
        buyer_id: inquiry.buyer_id,
        seller_id: inquiry.seller_id,
        is_unlocked: true,
        unlock_reason: "inquiry_accepted",
      });
    }
  }

  const row = data as DbInquiryRow & { freelance_services: { title: string } | null };
  return {
    id: row.id,
    buyerName: await resolveAccountName(row.buyer_id),
    serviceTitle: row.freelance_services?.title ?? "Service",
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}
