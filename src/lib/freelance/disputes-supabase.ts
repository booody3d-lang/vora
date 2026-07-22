import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import type {
  DisputeMessage,
  DisputeStatus,
  DisputeTicket,
  DisputeTransactionEntry,
} from "@/types/admin";

type DbDisputeStatus = "open" | "reviewing" | "resolved_buyer" | "resolved_seller";

interface DbDisputeRow {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: DbDisputeStatus;
  created_at: string;
}

function mapDbStatusToUi(status: DbDisputeStatus): DisputeStatus {
  switch (status) {
    case "open":
      return "urgent";
    case "reviewing":
      return "in_review";
    case "resolved_buyer":
      return "resolved_refund";
    case "resolved_seller":
      return "resolved_pay_seller";
    default:
      return "in_review";
  }
}

function mapUiStatusToDb(status: DisputeStatus): DbDisputeStatus {
  switch (status) {
    case "urgent":
      return "open";
    case "in_review":
      return "reviewing";
    case "resolved_refund":
      return "resolved_buyer";
    case "resolved_pay_seller":
      return "resolved_seller";
    default:
      return "reviewing";
  }
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

async function mapDisputeRow(row: DbDisputeRow): Promise<DisputeTicket> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("freelance_orders")
    .select("order_number, buyer_id, seller_id, total_price, status, service_id, created_at")
    .eq("id", row.order_id)
    .maybeSingle();

  const buyerName = order ? await resolveAccountName(order.buyer_id as string) : "Buyer";
  const sellerName = order ? await resolveAccountName(order.seller_id as string) : "Seller";

  let serviceTitle = "Service";
  if (order?.service_id) {
    const { data: service } = await admin
      .from("freelance_services")
      .select("title")
      .eq("id", order.service_id as string)
      .maybeSingle();
    serviceTitle = (service?.title as string) ?? serviceTitle;
  }

  const { data: orderMessages } = await admin
    .from("order_messages")
    .select("*")
    .eq("order_id", row.order_id)
    .order("created_at", { ascending: true });

  const messages: DisputeMessage[] = [
    {
      id: `sys-${row.id}`,
      senderName: "System",
      senderRole: "system",
      content: "Dispute ticket opened.",
      createdAt: row.created_at,
    },
  ];

  for (const msg of orderMessages ?? []) {
    const senderId = msg.sender_id as string;
    const senderName = msg.is_system
      ? "System"
      : senderId === order?.buyer_id
        ? buyerName
        : senderId === order?.seller_id
          ? sellerName
          : "Participant";
    messages.push({
      id: msg.id as string,
      senderName,
      senderRole: msg.is_system
        ? "system"
        : senderId === order?.buyer_id
          ? "buyer"
          : "seller",
      content: (msg.content as string | null) ?? "",
      createdAt: msg.created_at as string,
    });
  }

  const transactionLog: DisputeTransactionEntry[] = [
    {
      id: `tx-${row.order_id}-created`,
      action: "Order placed — escrow locked",
      amount: order ? Number(order.total_price) : undefined,
      timestamp: (order?.created_at as string) ?? row.created_at,
    },
    {
      id: `tx-${row.id}-dispute`,
      action: "Dispute opened — funds frozen",
      amount: order ? Number(order.total_price) : undefined,
      timestamp: row.created_at,
    },
  ];

  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: (order?.order_number as string) ?? row.order_id,
    serviceTitle,
    buyerName,
    sellerName,
    amount: order ? Number(order.total_price) : 0,
    status: mapDbStatusToUi(row.status),
    reason: row.reason,
    openedAt: row.created_at,
    messages,
    attachments: [],
    transactionLog,
  };
}

export async function listDisputesFromSupabase(): Promise<DisputeTicket[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_disputes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const tickets: DisputeTicket[] = [];
  for (const row of (data ?? []) as DbDisputeRow[]) {
    tickets.push(await mapDisputeRow(row));
  }
  return tickets;
}

export async function getDisputeByIdFromSupabase(id: string): Promise<DisputeTicket | null> {
  if (!isValidBillingUuid(id)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.from("order_disputes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return await mapDisputeRow(data as DbDisputeRow);
}

export async function createDisputeInSupabase(
  orderId: string,
  openedBy: string,
  reason: string
): Promise<DisputeTicket> {
  if (!isValidBillingUuid(orderId) || !isValidBillingUuid(openedBy)) {
    throw new Error("Invalid dispute target");
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("freelance_orders")
    .select("buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error("Order not found");
  if (order.buyer_id !== openedBy) throw new Error("Only the buyer can open a dispute");

  const { data: existing } = await admin
    .from("order_disputes")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) throw new Error("Dispute already exists");

  const { data, error } = await admin
    .from("order_disputes")
    .insert({
      order_id: orderId,
      opened_by: openedBy,
      reason: reason.trim(),
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;

  await admin.from("freelance_orders").update({ status: "disputed" }).eq("id", orderId);

  return await mapDisputeRow(data as DbDisputeRow);
}

export async function updateDisputeStatusInSupabase(
  disputeId: string,
  status: DisputeStatus
): Promise<DisputeTicket | null> {
  if (!isValidBillingUuid(disputeId)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("order_disputes")
    .update({ status: mapUiStatusToDb(status) })
    .eq("id", disputeId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return await mapDisputeRow(data as DbDisputeRow);
}

export function countUrgentDisputes(tickets: DisputeTicket[]): number {
  return tickets.filter((ticket) => ticket.status === "urgent" || ticket.status === "in_review").length;
}
