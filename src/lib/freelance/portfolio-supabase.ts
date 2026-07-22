import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PortfolioItem } from "@/types/freelance";

interface DbPortfolioRow {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  created_at: string;
}

export function mapPortfolioRow(row: DbPortfolioRow): PortfolioItem {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url ?? "",
    category: row.description ?? undefined,
  };
}

export async function listPortfolioByStoreFromSupabase(storeId: string): Promise<PortfolioItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("freelance_portfolios")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapPortfolioRow(row as DbPortfolioRow));
}

export async function replacePortfolioForStoreInSupabase(
  storeId: string,
  items: PortfolioItem[]
): Promise<PortfolioItem[]> {
  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("freelance_portfolios")
    .delete()
    .eq("store_id", storeId);

  if (deleteError) throw deleteError;

  if (items.length === 0) return [];

  const rows = items.map((item) => ({
    store_id: storeId,
    title: item.title.trim(),
    description: item.category?.trim() || null,
    image_url: item.imageUrl || null,
    project_url: null,
  }));

  const { data, error } = await admin.from("freelance_portfolios").insert(rows).select("*");
  if (error) throw error;

  return (data ?? []).map((row) => mapPortfolioRow(row as DbPortfolioRow));
}
