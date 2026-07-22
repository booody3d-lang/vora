import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBillingUuid } from "@/lib/billing/billing-supabase";
import type { ReviewSubmission, StoreReview } from "@/types/freelance";

interface DbReviewRow {
  id: string;
  order_id: string | null;
  service_id: string;
  store_id: string;
  reviewer_id: string;
  overall_quality: number;
  communication: number;
  delivery_punctuality: number;
  public_review: string;
  created_at: string;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function mapReviewRow(
  row: DbReviewRow,
  buyer: { name: string; avatar?: string },
  serviceTitle: string
): StoreReview {
  return {
    id: row.id,
    buyerName: buyer.name,
    buyerAvatar: buyer.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(buyer.name)}`,
    serviceTitle,
    overallQuality: row.overall_quality,
    communication: row.communication,
    deliveryPunctuality: row.delivery_punctuality,
    publicReview: row.public_review,
    createdAt: row.created_at,
  };
}

async function resolveReviewerProfile(reviewerId: string): Promise<{ name: string; avatar?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("accounts")
    .select("full_name, email, avatar_url")
    .eq("id", reviewerId)
    .maybeSingle();

  if (!data) return { name: "Buyer" };
  return {
    name: (data.full_name as string | null) ?? (data.email as string) ?? "Buyer",
    avatar: (data.avatar_url as string | null) ?? undefined,
  };
}

async function recalculateStoreRatings(storeId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_reviews")
    .select("overall_quality")
    .eq("store_id", storeId);

  if (error) throw error;

  const ratings = (data ?? []).map((row) => Number(row.overall_quality));
  await admin
    .from("freelancer_stores")
    .update({
      rating_avg: average(ratings),
      total_reviews: ratings.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
}

async function recalculateServiceRatings(serviceId: string): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_reviews")
    .select("overall_quality")
    .eq("service_id", serviceId);

  if (error) throw error;

  const ratings = (data ?? []).map((row) => Number(row.overall_quality));
  await admin
    .from("freelance_services")
    .update({
      rating_avg: average(ratings),
      review_count: ratings.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);
}

export async function listReviewsByStoreFromSupabase(storeId: string): Promise<StoreReview[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_reviews")
    .select("*, freelance_services(title)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const reviews: StoreReview[] = [];
  for (const row of data ?? []) {
    const reviewRow = row as DbReviewRow & { freelance_services: { title: string } | null };
    const buyer = await resolveReviewerProfile(reviewRow.reviewer_id);
    reviews.push(
      mapReviewRow(reviewRow, buyer, reviewRow.freelance_services?.title ?? "Service")
    );
  }

  return reviews;
}

export async function getReviewByOrderFromSupabase(orderId: string): Promise<StoreReview | null> {
  if (!isValidBillingUuid(orderId)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_reviews")
    .select("*, freelance_services(title)")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbReviewRow & { freelance_services: { title: string } | null };
  const buyer = await resolveReviewerProfile(row.reviewer_id);
  return mapReviewRow(row, buyer, row.freelance_services?.title ?? "Service");
}

export async function insertReviewInSupabase(
  orderId: string,
  reviewerId: string,
  submission: ReviewSubmission
): Promise<StoreReview> {
  if (!isValidBillingUuid(orderId) || !isValidBillingUuid(reviewerId)) {
    throw new Error("Invalid review target");
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("freelance_orders")
    .select("id, buyer_id, seller_id, service_id, store_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) throw new Error("Order not found");
  if (order.buyer_id !== reviewerId) throw new Error("Only the buyer can submit a review");
  if (order.status !== "completed") throw new Error("Order must be completed before reviewing");

  const { data: existing } = await admin
    .from("freelance_reviews")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) throw new Error("Review already submitted");

  const { data: service } = await admin
    .from("freelance_services")
    .select("title")
    .eq("id", order.service_id as string)
    .maybeSingle();

  const { data, error } = await admin
    .from("freelance_reviews")
    .insert({
      order_id: orderId,
      service_id: order.service_id,
      store_id: order.store_id,
      reviewer_id: reviewerId,
      overall_quality: submission.overallQuality,
      communication: submission.communication,
      delivery_punctuality: submission.deliveryPunctuality,
      public_review: submission.publicReview.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;

  await Promise.all([
    recalculateStoreRatings(order.store_id as string),
    recalculateServiceRatings(order.service_id as string),
  ]);

  const buyer = await resolveReviewerProfile(reviewerId);
  return mapReviewRow(data as DbReviewRow, buyer, (service?.title as string) ?? "Service");
}
