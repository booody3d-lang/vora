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
import { DEMO_ORDER, DEMO_ORDER_MESSAGES } from "@/lib/freelance/mock-data";
import {
  canAccessOrder,
  createOrderInSupabase,
  getOrderByIdFromSupabase,
  insertOrderMessageInSupabase,
  listOrderMessagesFromSupabase,
  listOrdersForAccountFromSupabase,
  updateOrderInSupabase,
  type CreateOrderInput,
  type OrderUpdateInput,
} from "@/lib/freelance/orders-supabase";
import { getMarketplaceServiceBySlug } from "@/lib/freelance/services-store";
import { resolveAccountIdForStoreSlugLive } from "@/lib/freelance/store-store";
import type { FreelanceOrder, OrderMessage } from "@/types/freelance";

const ORDERS_FILE = "freelance-orders.json";

interface OrdersDataFile {
  orders: FreelanceOrder[];
  messagesByOrderId: Record<string, OrderMessage[]>;
}

let ordersTableProbed = false;
let ordersTableAvailable = false;

export async function isOrdersSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (ordersTableProbed) return ordersTableAvailable;

  ordersTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelance_orders").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelance_orders missing", error);
      }
      ordersTableAvailable = false;
      return false;
    }
    ordersTableAvailable = true;
    return true;
  } catch {
    ordersTableAvailable = false;
    return false;
  }
}

function readOrdersData(): OrdersDataFile {
  const data = readJsonStore(ORDERS_FILE, () => ({
    orders: [] as FreelanceOrder[],
    messagesByOrderId: {} as Record<string, OrderMessage[]>,
  }));
  if (!data.messagesByOrderId) data.messagesByOrderId = {};
  if (!data.orders) data.orders = [];
  return data;
}

function writeOrdersData(data: OrdersDataFile) {
  writeJsonStore(ORDERS_FILE, data);
}

function generateJsonOrderNumber(): string {
  const year = new Date().getFullYear();
  return `VORA-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function buildCreateOrderInput(
  buyerId: string,
  sellerId: string,
  service: NonNullable<Awaited<ReturnType<typeof getMarketplaceServiceBySlug>>>,
  selectedAddonIds: string[]
): CreateOrderInput {
  const selectedAddons = service.addons.filter((addon) => selectedAddonIds.includes(addon.id));
  const basePrice = service.price ?? 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const extraDays = selectedAddons.reduce((sum, addon) => sum + addon.extraDays, 0);
  const totalPrice = basePrice + addonsTotal;

  return {
    buyerId,
    sellerId,
    service,
    selectedAddonIds,
    basePrice,
    addonsTotal,
    totalPrice,
    deliveryDays: Math.max(1, service.deliveryDays + extraDays),
  };
}

function createOrderInJson(input: CreateOrderInput): FreelanceOrder {
  const data = readOrdersData();
  const order: FreelanceOrder = {
    id: randomUUID(),
    orderNumber: generateJsonOrderNumber(),
    status: "pending_payment",
    service: input.service,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    basePrice: input.basePrice,
    addonsTotal: input.addonsTotal,
    totalPrice: input.totalPrice,
    currency: "SAR",
    deliveryDays: input.deliveryDays,
    revisionsRemaining: input.service.revisionsIncluded,
    selectedAddonIds: input.selectedAddonIds,
    requirementsFiles: [],
    deliveryFiles: [],
    escrowReleased: false,
    createdAt: new Date().toISOString(),
  };

  data.orders.unshift(order);
  data.messagesByOrderId[order.id] = [];
  writeOrdersData(data);
  return order;
}

function getDemoOrder(orderId: string): FreelanceOrder | null {
  if (orderId === DEMO_ORDER.id || orderId === "ord-new") {
    return { ...DEMO_ORDER, id: orderId === "ord-new" ? DEMO_ORDER.id : orderId };
  }
  return null;
}

export async function createOrderForBuyer(
  buyerId: string,
  input: { serviceSlug: string; selectedAddonIds?: string[] }
): Promise<FreelanceOrder | null> {
  const service = await getMarketplaceServiceBySlug(input.serviceSlug);
  if (!service) return null;

  const selectedAddonIds = input.selectedAddonIds ?? [];
  const sellerId = (await resolveAccountIdForStoreSlugLive(service.storeSlug)) ?? "seller-demo";
  if (sellerId === buyerId) {
    throw new Error("You cannot order your own service");
  }

  const hasFixedPrice = service.price != null && service.price > 0;
  const addonsTotal = service.addons
    .filter((addon) => selectedAddonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.price, 0);
  if (!hasFixedPrice && addonsTotal <= 0) {
    throw new Error("This service requires a custom quote");
  }

  const createInput = buildCreateOrderInput(buyerId, sellerId, service, selectedAddonIds);

  if (!(await isOrdersSupabaseReady()) || !isValidBillingUuid(service.id)) {
    return createOrderInJson(createInput);
  }

  return runOptionalDbSync(
    "createOrderForBuyer",
    () => createOrderInSupabase(createInput),
    createOrderInJson(createInput)
  );
}

export async function getOrderForParticipant(
  orderId: string,
  accountId: string | null
): Promise<{ order: FreelanceOrder; messages: OrderMessage[]; isBuyer: boolean } | null> {
  const demoOrder = getDemoOrder(orderId);
  if (demoOrder) {
    return {
      order: demoOrder,
      messages: DEMO_ORDER_MESSAGES,
      isBuyer: accountId ? demoOrder.buyerId === accountId : true,
    };
  }

  const jsonData = readOrdersData();
  const jsonOrder = jsonData.orders.find((order) => order.id === orderId);
  if (jsonOrder) {
    if (accountId && !canAccessOrder(jsonOrder, accountId)) return null;
    return {
      order: jsonOrder,
      messages: jsonData.messagesByOrderId[orderId] ?? [],
      isBuyer: accountId ? jsonOrder.buyerId === accountId : false,
    };
  }

  if (!(await isOrdersSupabaseReady()) || !isValidBillingUuid(orderId)) {
    return null;
  }

  return runOptionalDbSync(
    "getOrderForParticipant",
    async () => {
      const order = await getOrderByIdFromSupabase(orderId);
      if (!order) return null;
      if (accountId && !canAccessOrder(order, accountId)) return null;
      const messages = await listOrderMessagesFromSupabase(orderId);
      return {
        order,
        messages,
        isBuyer: accountId ? order.buyerId === accountId : false,
      };
    },
    null
  );
}

export async function listOrdersForAccount(accountId: string): Promise<FreelanceOrder[]> {
  const jsonOrders = readOrdersData().orders.filter(
    (order) => order.buyerId === accountId || order.sellerId === accountId
  );

  if (!(await isOrdersSupabaseReady()) || !isValidBillingUuid(accountId)) {
    return jsonOrders;
  }

  return runOptionalDbSync(
    "listOrdersForAccount",
    () => listOrdersForAccountFromSupabase(accountId),
    jsonOrders
  );
}

export async function updateOrderForParticipant(
  orderId: string,
  accountId: string,
  updates: OrderUpdateInput
): Promise<FreelanceOrder | null> {
  const demoOrder = getDemoOrder(orderId);
  if (demoOrder) {
    if (accountId && !canAccessOrder(demoOrder, accountId)) return null;
    return { ...demoOrder, ...updates };
  }

  const data = readOrdersData();
  const jsonIndex = data.orders.findIndex((order) => order.id === orderId);
  if (jsonIndex >= 0) {
    const current = data.orders[jsonIndex];
    if (!canAccessOrder(current, accountId)) return null;
    const updated = { ...current, ...updates };
    data.orders[jsonIndex] = updated;
    writeOrdersData(data);
    return updated;
  }

  if (!(await isOrdersSupabaseReady()) || !isValidBillingUuid(orderId)) {
    return null;
  }

  const existing = await getOrderByIdFromSupabase(orderId);
  if (!existing || !canAccessOrder(existing, accountId)) return null;

  return runOptionalDbSync(
    "updateOrderForParticipant",
    () => updateOrderInSupabase(orderId, updates),
    { ...existing, ...updates }
  );
}

export async function addMessageToOrder(
  orderId: string,
  accountId: string,
  input: {
    content?: string;
    fileUrl?: string;
    fileName?: string;
    isSystem?: boolean;
    senderName?: string;
  }
): Promise<OrderMessage | null> {
  const demoOrder = getDemoOrder(orderId);
  if (demoOrder) {
    return {
      id: `msg-${Date.now()}`,
      senderId: input.isSystem ? "system" : accountId,
      senderName: input.isSystem ? "VORA Escrow" : (input.senderName ?? "Participant"),
      content: input.content,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      isSystem: input.isSystem ?? false,
      createdAt: new Date().toISOString(),
    };
  }

  const data = readOrdersData();
  const jsonOrder = data.orders.find((order) => order.id === orderId);
  if (jsonOrder) {
    if (!input.isSystem && !canAccessOrder(jsonOrder, accountId)) return null;
    const message: OrderMessage = {
      id: randomUUID(),
      senderId: input.isSystem ? "system" : accountId,
      senderName: input.isSystem ? "VORA Escrow" : (input.senderName ?? "Participant"),
      content: input.content,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      isSystem: input.isSystem ?? false,
      createdAt: new Date().toISOString(),
    };
    if (!data.messagesByOrderId[orderId]) data.messagesByOrderId[orderId] = [];
    data.messagesByOrderId[orderId].push(message);
    writeOrdersData(data);
    return message;
  }

  if (!(await isOrdersSupabaseReady()) || !isValidBillingUuid(orderId)) {
    return null;
  }

  const existing = await getOrderByIdFromSupabase(orderId);
  if (!existing) return null;
  if (!input.isSystem && !canAccessOrder(existing, accountId)) return null;

  return runOptionalDbSync(
    "addMessageToOrder",
    () =>
      insertOrderMessageInSupabase(orderId, {
        senderId: input.isSystem ? accountId || "system" : accountId,
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        isSystem: input.isSystem,
        senderName: input.senderName,
      }),
    {
      id: randomUUID(),
      senderId: input.isSystem ? "system" : accountId,
      senderName: input.isSystem ? "VORA Escrow" : (input.senderName ?? "Participant"),
      content: input.content,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      isSystem: input.isSystem ?? false,
      createdAt: new Date().toISOString(),
    }
  );
}

export function isOrdersPersistenceActive(): boolean {
  return ordersTableAvailable;
}
