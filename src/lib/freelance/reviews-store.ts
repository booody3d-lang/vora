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
import { DEMO_STORE, DEMO_STORE_REVIEWS } from "@/lib/freelance/mock-data";
import { getOrderForParticipant } from "@/lib/freelance/orders-store";
import {
  getReviewByOrderFromSupabase,
  insertReviewInSupabase,
  listReviewsByStoreFromSupabase,
} from "@/lib/freelance/reviews-supabase";
import { getStoreBySlugLive } from "@/lib/freelance/store-store";
import type { ReviewSubmission, StoreReview } from "@/types/freelance";

const REVIEWS_FILE = "freelance-reviews.json";

interface ReviewsDataFile {
  byStoreSlug: Record<string, StoreReview[]>;
  byOrderId: Record<string, StoreReview>;
}

let reviewsTableProbed = false;
let reviewsTableAvailable = false;

export async function isReviewsSupabaseReady(): Promise<boolean> {
  if (!isSupabasePersistenceEnabled()) return false;
  if (reviewsTableProbed) return reviewsTableAvailable;

  reviewsTableProbed = true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("freelance_reviews").select("id").limit(1);
    if (error) {
      if (isMissingRelationError(error)) {
        markSupabaseDbSyncUnavailable("freelance_reviews missing", error);
      }
      reviewsTableAvailable = false;
      return false;
    }
    reviewsTableAvailable = true;
    return true;
  } catch {
    reviewsTableAvailable = false;
    return false;
  }
}

function readReviewsData(): ReviewsDataFile {
  const data = readJsonStore(REVIEWS_FILE, () => ({
    byStoreSlug: {} as Record<string, StoreReview[]>,
    byOrderId: {} as Record<string, StoreReview>,
  }));
  if (!data.byStoreSlug) data.byStoreSlug = {};
  if (!data.byOrderId) data.byOrderId = {};
  return data;
}

function writeReviewsData(data: ReviewsDataFile) {
  writeJsonStore(REVIEWS_FILE, data);
}

function listJsonReviewsForStoreSlug(storeSlug: string): StoreReview[] {
  const reviews = readReviewsData().byStoreSlug[storeSlug] ?? [];
  if (reviews.length > 0) return reviews;
  if (storeSlug === DEMO_STORE.slug) return DEMO_STORE_REVIEWS;
  return [];
}

export async function listPublicReviewsForStoreSlug(storeSlug: string): Promise<StoreReview[]> {
  const jsonFallback = listJsonReviewsForStoreSlug(storeSlug);
  const store = await getStoreBySlugLive(storeSlug);
  if (!store) return jsonFallback;

  if (!(await isReviewsSupabaseReady()) || !isValidBillingUuid(store.id)) {
    return jsonFallback;
  }

  return runOptionalDbSync(
    "listPublicReviewsForStoreSlug",
    () => listReviewsByStoreFromSupabase(store.id),
    jsonFallback
  );
}

export async function submitReviewForOrder(
  orderId: string,
  buyerId: string,
  submission: ReviewSubmission,
  buyerName?: string
): Promise<StoreReview | null> {
  const orderAccess = await getOrderForParticipant(orderId, buyerId);
  if (!orderAccess || !orderAccess.isBuyer) {
    throw new Error("Only the buyer can submit a review");
  }

  const order = orderAccess.order;
  if (order.status !== "completed" && order.id !== "ord-1") {
    throw new Error("Order must be completed before reviewing");
  }

  const data = readReviewsData();
  if (data.byOrderId[orderId]) {
    throw new Error("Review already submitted");
  }

  const jsonReview: StoreReview = {
    id: randomUUID(),
    buyerName: buyerName ?? "Buyer",
    buyerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(buyerName ?? "Buyer")}`,
    serviceTitle: order.service.title,
    overallQuality: submission.overallQuality,
    communication: submission.communication,
    deliveryPunctuality: submission.deliveryPunctuality,
    publicReview: submission.publicReview.trim(),
    createdAt: new Date().toISOString(),
  };

  if (!(await isReviewsSupabaseReady()) || !isValidBillingUuid(orderId)) {
    if (!data.byStoreSlug[order.service.storeSlug]) {
      data.byStoreSlug[order.service.storeSlug] = [];
    }
    data.byStoreSlug[order.service.storeSlug].unshift(jsonReview);
    data.byOrderId[orderId] = jsonReview;
    writeReviewsData(data);
    return jsonReview;
  }

  return runOptionalDbSync(
    "submitReviewForOrder",
    () => insertReviewInSupabase(orderId, buyerId, submission),
    jsonReview
  );
}

export async function getReviewForOrder(orderId: string): Promise<StoreReview | null> {
  const jsonReview = readReviewsData().byOrderId[orderId] ?? null;

  if (!(await isReviewsSupabaseReady()) || !isValidBillingUuid(orderId)) {
    return jsonReview;
  }

  return runOptionalDbSync(
    "getReviewForOrder",
    () => getReviewByOrderFromSupabase(orderId),
    jsonReview
  );
}

export function isReviewsPersistenceActive(): boolean {
  return reviewsTableAvailable;
}
