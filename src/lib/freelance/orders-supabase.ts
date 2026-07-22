import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import { mapServiceRow } from "@/lib/freelance/services-supabase";
import type {
  FreelanceOrder,
  MarketplaceService,
  OrderMessage,
  OrderStatus,
} from "@/types/freelance";

interface DbOrderRow {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  service_id: string;
  store_id: string;
  status: OrderStatus;
  base_price: number;
  addons_total: number;
  total_price: number;
  currency: string;
  delivery_days: number;
  revisions_remaining: number;
  selected_addons: unknown;
  requirements_text: string | null;
  requirements_files: string[] | null;
  delivery_files: string[] | null;
  escrow_released: boolean;
  created_at: string;
  updated_at: string;
}

interface DbMessageRow {
  id: string;
  order_id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  is_system: boolean;
  created_at: string;
}

export interface CreateOrderInput {
  buyerId: string;
  sellerId: string;
  service: MarketplaceService;
  selectedAddonIds: string[];
  basePrice: number;
  addonsTotal: number;
  totalPrice: number;
  deliveryDays: number;
}

function parseSelectedAddonIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapOrderRow(row: DbOrderRow, service: MarketplaceService): FreelanceOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    service,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    basePrice: Number(row.base_price),
    addonsTotal: Number(row.addons_total),
    totalPrice: Number(row.total_price),
    currency: row.currency,
    deliveryDays: row.delivery_days,
    revisionsRemaining: row.revisions_remaining,
    selectedAddonIds: parseSelectedAddonIds(row.selected_addons),
    requirementsText: row.requirements_text ?? undefined,
    requirementsFiles: row.requirements_files ?? [],
    deliveryFiles: row.delivery_files ?? [],
    escrowReleased: row.escrow_released,
    createdAt: row.created_at,
  };
}

export function mapMessageRow(row: DbMessageRow, senderName: string): OrderMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName,
    content: row.content ?? undefined,
    fileUrl: row.file_url ?? undefined,
    fileName: row.file_name ?? undefined,
    isSystem: row.is_system,
    createdAt: row.created_at,
  };
}

async function loadServiceForOrder(serviceId: string): Promise<MarketplaceService | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_services")
    .select("*, freelancer_stores(id, slug, store_name, logo_url)")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const store = data.freelancer_stores as {
    id: string;
    slug: string;
    store_name: string;
    logo_url: string | null;
  } | null;
  if (!store) return null;

  const { data: addonRows, error: addonError } = await admin
    .from("service_addons")
    .select("*")
    .eq("service_id", serviceId);
  if (addonError) throw addonError;

  const addons = (addonRows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    price: Number(row.price),
    extraDays: row.extra_days as number,
  }));

  return mapServiceRow(
    data as Parameters<typeof mapServiceRow>[0],
    {
      id: store.id,
      slug: store.slug,
      storeName: store.store_name,
      logoUrl: store.logo_url ?? undefined,
    },
    addons
  );
}

async function resolveSenderName(senderId: string, order: DbOrderRow): Promise<string> {
  if (senderId === "system") return "VORA Escrow";
  if (senderId === order.buyer_id) return "Buyer";
  if (senderId === order.seller_id) return "Seller";

  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select("full_name, email")
    .eq("id", senderId)
    .maybeSingle();

  if (!data) return "Participant";
  return (data.full_name as string | null) ?? (data.email as string) ?? "Participant";
}

export async function generateUniqueOrderNumber(): Promise<string> {
  const admin = createAdminClient();
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `VORA-${year}-${suffix}`;
    const { data } = await admin
      .from("freelance_orders")
      .select("id")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!data) return orderNumber;
  }

  return `VORA-${year}-${Date.now().toString().slice(-6)}`;
}

export async function createOrderInSupabase(input: CreateOrderInput): Promise<FreelanceOrder> {
  if (!isValidBillingUuid(input.buyerId)) {
    throw new Error("Invalid buyer account");
  }
  if (!isValidBillingUuid(input.sellerId)) {
    throw new Error("Invalid seller account");
  }
  if (!isValidBillingUuid(input.service.id) || !isValidBillingUuid(input.service.storeId)) {
    throw new Error("Service must be persisted before ordering");
  }

  const admin = createAdminClient();
  const orderNumber = await generateUniqueOrderNumber();

  const { data, error } = await admin
    .from("freelance_orders")
    .insert({
      order_number: orderNumber,
      buyer_id: input.buyerId,
      seller_id: input.sellerId,
      service_id: input.service.id,
      store_id: input.service.storeId,
      status: "pending_payment",
      base_price: input.basePrice,
      addons_total: input.addonsTotal,
      total_price: input.totalPrice,
      currency: "SAR",
      delivery_days: input.deliveryDays,
      revisions_remaining: input.service.revisionsIncluded,
      selected_addons: input.selectedAddonIds,
      requirements_files: [],
      delivery_files: [],
      escrow_released: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapOrderRow(data as DbOrderRow, input.service);
}

export async function getOrderByIdFromSupabase(orderId: string): Promise<FreelanceOrder | null> {
  if (!isValidBillingUuid(orderId)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.from("freelance_orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as DbOrderRow;
  const service = await loadServiceForOrder(row.service_id);
  if (!service) return null;

  return mapOrderRow(row, service);
}

export async function listOrdersForAccountFromSupabase(accountId: string): Promise<FreelanceOrder[]> {
  if (!isValidBillingUuid(accountId)) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_orders")
    .select("*")
    .or(`buyer_id.eq.${accountId},seller_id.eq.${accountId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const orders: FreelanceOrder[] = [];
  for (const row of (data ?? []) as DbOrderRow[]) {
    const service = await loadServiceForOrder(row.service_id);
    if (service) orders.push(mapOrderRow(row, service));
  }

  return orders;
}

export type OrderUpdateInput = Partial<
  Pick<
    FreelanceOrder,
    | "status"
    | "requirementsText"
    | "requirementsFiles"
    | "deliveryFiles"
    | "revisionsRemaining"
    | "escrowReleased"
  >
>;

export async function updateOrderInSupabase(
  orderId: string,
  updates: OrderUpdateInput
): Promise<FreelanceOrder | null> {
  if (!isValidBillingUuid(orderId)) return null;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.requirementsText !== undefined) patch.requirements_text = updates.requirementsText;
  if (updates.requirementsFiles !== undefined) patch.requirements_files = updates.requirementsFiles;
  if (updates.deliveryFiles !== undefined) patch.delivery_files = updates.deliveryFiles;
  if (updates.revisionsRemaining !== undefined) patch.revisions_remaining = updates.revisionsRemaining;
  if (updates.escrowReleased !== undefined) patch.escrow_released = updates.escrowReleased;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbOrderRow;
  const service = await loadServiceForOrder(row.service_id);
  if (!service) return null;

  return mapOrderRow(row, service);
}

export async function listOrderMessagesFromSupabase(orderId: string): Promise<OrderMessage[]> {
  if (!isValidBillingUuid(orderId)) return [];

  const admin = createAdminClient();
  const [{ data: orderRow }, { data: messages, error }] = await Promise.all([
    admin.from("freelance_orders").select("*").eq("id", orderId).maybeSingle(),
    admin
      .from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  if (error) throw error;
  if (!orderRow) return [];

  const order = orderRow as DbOrderRow;
  const rows = (messages ?? []) as DbMessageRow[];
  const result: OrderMessage[] = [];

  for (const row of rows) {
    const senderName = row.is_system ? "VORA Escrow" : await resolveSenderName(row.sender_id, order);
    result.push(mapMessageRow(row, senderName));
  }

  return result;
}

export async function insertOrderMessageInSupabase(
  orderId: string,
  input: {
    senderId: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    isSystem?: boolean;
    senderName?: string;
  }
): Promise<OrderMessage> {
  if (!isValidBillingUuid(orderId)) {
    throw new Error("Invalid order id");
  }

  const admin = createAdminClient();
  const { data: orderRow, error: orderError } = await admin
    .from("freelance_orders")
    .select("buyer_id, seller_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!orderRow) throw new Error("Order not found");

  const order = orderRow as Pick<DbOrderRow, "buyer_id" | "seller_id">;
  const senderId = input.isSystem ? order.buyer_id : input.senderId;

  const { data, error } = await admin
    .from("order_messages")
    .insert({
      order_id: orderId,
      sender_id: senderId,
      content: input.content ?? null,
      file_url: input.fileUrl ?? null,
      file_name: input.fileName ?? null,
      is_system: input.isSystem ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;

  const row = data as DbMessageRow;
  const senderName = input.isSystem
    ? "VORA Escrow"
    : (input.senderName ?? (await resolveSenderName(row.sender_id, order as DbOrderRow)));

  return mapMessageRow(row, senderName);
}

export function canAccessOrder(order: FreelanceOrder, accountId: string): boolean {
  return order.buyerId === accountId || order.sellerId === accountId;
}
