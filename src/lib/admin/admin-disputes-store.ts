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
  countUrgentDisputes,
  createDisputeInSupabase,
  getDisputeByIdFromSupabase,
  listDisputesFromSupabase,
  updateDisputeStatusInSupabase,
} from "@/lib/freelance/disputes-supabase";
import { updateOrderForParticipant } from "@/lib/freelance/orders-store";
import { ADMIN_DISPUTES } from "@/lib/admin/mock-data";
import type { DisputeStatus, DisputeTicket } from "@/types/admin";

const DISPUTES_FILE = "freelance-disputes.json";

interface DisputesDataFile {
  tickets: DisputeTicket[];
}

let disputesTableProbed = false;
let disputesTableAvailable = false;

export async function isDisputesSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (disputesTableProbed) return disputesTableAvailable;

  disputesTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("order_disputes").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("order_disputes missing", error);
      }
      disputesTableAvailable = false;
      return false;
    }
    disputesTableAvailable = true;
    return true;
  } catch {
    disputesTableAvailable = false;
    return false;
  }
}

function readDisputesData(): DisputesDataFile {
  return readJsonStore(DISPUTES_FILE, () => ({
    tickets: ADMIN_DISPUTES,
  }));
}

function writeDisputesData(data: DisputesDataFile) {
  writeJsonStore(DISPUTES_FILE, data);
}

export async function listDisputesForAdmin(): Promise<DisputeTicket[]> {
  const jsonFallback = readDisputesData().tickets;

  if (!(await isDisputesSupabaseReady())) {
    return jsonFallback;
  }

  return runOptionalDbSync("listDisputesForAdmin", () => listDisputesFromSupabase(), jsonFallback);
}

export async function getDisputeForAdmin(disputeId: string): Promise<DisputeTicket | null> {
  const jsonFallback = readDisputesData().tickets.find((ticket) => ticket.id === disputeId) ?? null;

  if (!(await isDisputesSupabaseReady()) || !isValidBillingUuid(disputeId)) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "getDisputeForAdmin",
    () => getDisputeByIdFromSupabase(disputeId),
    jsonFallback
  );
}

export async function openDisputeForOrder(
  orderId: string,
  buyerId: string,
  reason: string,
  orderMeta?: {
    orderNumber: string;
    serviceTitle: string;
    buyerName: string;
    sellerName: string;
    amount: number;
  }
): Promise<DisputeTicket | null> {
  await updateOrderForParticipant(orderId, buyerId, { status: "disputed" });

  const jsonTicket: DisputeTicket = {
    id: randomUUID(),
    orderId,
    orderNumber: orderMeta?.orderNumber ?? orderId,
    serviceTitle: orderMeta?.serviceTitle ?? "Service",
    buyerName: orderMeta?.buyerName ?? "Buyer",
    sellerName: orderMeta?.sellerName ?? "Seller",
    amount: orderMeta?.amount ?? 0,
    status: "urgent",
    reason: reason.trim() || "Buyer opened a dispute for this order.",
    openedAt: new Date().toISOString(),
    messages: [
      {
        id: randomUUID(),
        senderName: "System",
        senderRole: "system",
        content: "Dispute ticket opened by buyer.",
        createdAt: new Date().toISOString(),
      },
    ],
    attachments: [],
    transactionLog: [
      {
        id: randomUUID(),
        action: "Dispute opened — funds frozen",
        amount: orderMeta?.amount,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const data = readDisputesData();
  data.tickets.unshift(jsonTicket);
  writeDisputesData(data);

  if (!(await isDisputesSupabaseReady()) || !isValidBillingUuid(orderId)) {
    return jsonTicket;
  }

  return runOptionalDbSync(
    "openDisputeForOrder",
    () => createDisputeInSupabase(orderId, buyerId, reason),
    jsonTicket
  );
}

export async function resolveDisputeForAdmin(
  disputeId: string,
  status: DisputeStatus
): Promise<DisputeTicket | null> {
  const data = readDisputesData();
  const index = data.tickets.findIndex((ticket) => ticket.id === disputeId);
  if (index >= 0) {
    data.tickets[index] = { ...data.tickets[index], status };
    writeDisputesData(data);
  }

  if (!(await isDisputesSupabaseReady()) || !isValidBillingUuid(disputeId)) {
    return index >= 0 ? data.tickets[index] : null;
  }

  return runOptionalDbSync(
    "resolveDisputeForAdmin",
    () => updateDisputeStatusInSupabase(disputeId, status),
    index >= 0 ? data.tickets[index] : null
  );
}

export async function getUrgentDisputeCountLive(): Promise<number> {
  const tickets = await listDisputesForAdmin();
  return countUrgentDisputes(tickets);
}

export function isDisputesPersistenceActive(): boolean {
  return disputesTableAvailable;
}
