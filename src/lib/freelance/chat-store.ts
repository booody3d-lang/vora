import "server-only";

import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/storage/json-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { isSupabasePersistenceEnabled } from "@/lib/supabase/profile-persistence";
import {
  isMissingRelationError,
  markSupabaseDbSyncUnavailable,
  runOptionalDbSync,
} from "@/lib/supabase/safe-db";
import {
  ensureChatSessionForOrderInSupabase,
  insertChatMessageInSupabase,
  listChatSessionsForAccountFromSupabase,
  listInquiriesForSellerFromSupabase,
  listMessagesForSessionFromSupabase,
  updateInquiryStatusInSupabase,
} from "@/lib/freelance/chat-supabase";
import { listOrdersForAccount } from "@/lib/freelance/orders-store";
import { DEMO_FREELANCE_CHATS, DEMO_INQUIRIES } from "@/lib/notifications/mock-data";
import type { FreelanceChatSession, FreelanceInquiry } from "@/types/notifications";

const CHAT_FILE = "freelance-chat.json";

interface ChatDataFile {
  sessions: FreelanceChatSession[];
  messagesBySessionId: Record<string, Array<{ id: string; senderId: string; content: string; createdAt: string }>>;
  inquiries: FreelanceInquiry[];
}

let chatTableProbed = false;
let chatTableAvailable = false;

export async function isChatSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (chatTableProbed) return chatTableAvailable;

  chatTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelance_chat_sessions").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelance_chat_sessions missing", error);
      }
      chatTableAvailable = false;
      return false;
    }
    chatTableAvailable = true;
    return true;
  } catch {
    chatTableAvailable = false;
    return false;
  }
}

function readChatData(): ChatDataFile {
  const data = readJsonStore(CHAT_FILE, () => ({
    sessions: DEMO_FREELANCE_CHATS,
    messagesBySessionId: {} as ChatDataFile["messagesBySessionId"],
    inquiries: DEMO_INQUIRIES,
  }));
  if (!data.messagesBySessionId) data.messagesBySessionId = {};
  if (!data.inquiries) data.inquiries = DEMO_INQUIRIES;
  if (!data.sessions?.length) data.sessions = DEMO_FREELANCE_CHATS;
  return data;
}

function writeChatData(data: ChatDataFile) {
  writeJsonStore(CHAT_FILE, data);
}

async function syncJsonSessionsFromOrders(accountId: string): Promise<FreelanceChatSession[]> {
  const orders = await listOrdersForAccount(accountId);
  const data = readChatData();
  const sessions = [...data.sessions];

  for (const order of orders) {
    if (sessions.some((session) => session.orderId === order.id)) continue;
    const unlocked = order.status !== "pending_payment" && order.status !== "cancelled";
    sessions.push({
      id: randomUUID(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      buyerName: order.buyerId === accountId ? "You" : "Buyer",
      sellerName: order.sellerId === accountId ? "You" : order.service.storeName,
      isUnlocked: unlocked,
      unlockReason: unlocked ? "escrow_paid" : "locked",
      lastMessage: "",
      lastMessageAt: order.createdAt,
      unreadCount: 0,
    });
  }

  data.sessions = sessions;
  writeChatData(data);
  return sessions.filter(
    (session) =>
      session.buyerName === "You" ||
      session.sellerName === "You" ||
      orders.some((order) => order.id === session.orderId)
  );
}

export async function listChatSessionsForAccount(accountId: string): Promise<FreelanceChatSession[]> {
  const jsonSessions = await syncJsonSessionsFromOrders(accountId);

  if (!(await isChatSupabaseReady()) || !isValidBillingUuid(accountId)) {
    return jsonSessions.length > 0 ? jsonSessions : DEMO_FREELANCE_CHATS;
  }

  for (const order of await listOrdersForAccount(accountId)) {
    if (isValidBillingUuid(order.id)) {
      await runOptionalDbSync(
        "ensureChatSessionForOrder",
        () => ensureChatSessionForOrderInSupabase(order.id),
        null
      );
    }
  }

  return runOptionalDbSync(
    "listChatSessionsForAccount",
    () => listChatSessionsForAccountFromSupabase(accountId),
    jsonSessions
  );
}

export async function listInquiriesForSeller(accountId: string): Promise<FreelanceInquiry[]> {
  const jsonFallback = readChatData().inquiries;

  if (!(await isChatSupabaseReady()) || !isValidBillingUuid(accountId)) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listInquiriesForSeller",
    () => listInquiriesForSellerFromSupabase(accountId),
    jsonFallback
  );
}

export async function listMessagesForSession(
  sessionId: string,
  accountId: string
): Promise<Array<{ id: string; senderId: string; content: string; createdAt: string }>> {
  const jsonFallback = readChatData().messagesBySessionId[sessionId] ?? [];

  if (!(await isChatSupabaseReady()) || !isValidBillingUuid(sessionId)) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listMessagesForSession",
    () => listMessagesForSessionFromSupabase(sessionId, accountId),
    jsonFallback
  );
}

export async function sendMessageToSession(
  sessionId: string,
  accountId: string,
  content: string
): Promise<{ id: string; senderId: string; content: string; createdAt: string } | null> {
  const message = {
    id: randomUUID(),
    senderId: accountId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  const data = readChatData();
  if (!data.messagesBySessionId[sessionId]) data.messagesBySessionId[sessionId] = [];
  data.messagesBySessionId[sessionId].push(message);
  writeChatData(data);

  if (!(await isChatSupabaseReady()) || !isValidBillingUuid(sessionId)) {
    return message;
  }

  return runOptionalDbSync(
    "sendMessageToSession",
    () => insertChatMessageInSupabase(sessionId, accountId, content),
    message
  );
}

export async function respondToInquiry(
  inquiryId: string,
  sellerId: string,
  status: "accepted" | "declined"
): Promise<FreelanceInquiry | null> {
  const data = readChatData();
  const index = data.inquiries.findIndex((inq) => inq.id === inquiryId);
  if (index >= 0) {
    data.inquiries[index] = { ...data.inquiries[index], status };
    writeChatData(data);
  }

  if (!(await isChatSupabaseReady()) || !isValidBillingUuid(inquiryId)) {
    return index >= 0 ? data.inquiries[index] : null;
  }

  return runOptionalDbSync(
    "respondToInquiry",
    () => updateInquiryStatusInSupabase(inquiryId, sellerId, status),
    index >= 0 ? data.inquiries[index] : null
  );
}

export function isChatPersistenceActive(): boolean {
  return chatTableAvailable;
}
