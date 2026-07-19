import { NextResponse } from "next/server";
import { searchIndex, type SearchResultType } from "@/lib/search/search-index";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") as SearchResultType | null;
  const limit = Number(searchParams.get("limit") ?? "12");

  const results = searchIndex(q, {
    type: type ?? undefined,
    limit: Number.isFinite(limit) ? limit : 12,
  });

  return NextResponse.json({ query: q, results });
}
