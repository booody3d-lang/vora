import { createClient } from "@/lib/supabase/server";
import { FALLBACK_NAVIGATION_LINKS } from "@/lib/navigation/fallback-links";
import { filterNavigationLinks } from "@/lib/navigation/filter-nav-links";
import { appendRoleShortcuts } from "@/lib/navigation/role-shortcuts";
import type { NavigationLinkRecord, ResolvedNavigationLink } from "@/types/navigation";
import type { PlatformContext } from "@/types/vora";
import type { VoraRole } from "@/types/security";

interface DbNavRow {
  id: string;
  platform: PlatformContext;
  placement: string;
  label_key: string | null;
  label_en: string;
  label_ar: string;
  href: string;
  icon: string | null;
  sort_order: number;
  requires_auth: boolean;
  min_role: VoraRole | null;
  is_active: boolean;
}

function mapRow(row: DbNavRow): NavigationLinkRecord {
  return {
    id: row.id,
    platform: row.platform,
    placement: row.placement,
    labelKey: row.label_key,
    labelEn: row.label_en,
    labelAr: row.label_ar,
    href: row.href,
    icon: row.icon,
    sortOrder: row.sort_order,
    requiresAuth: row.requires_auth,
    minRole: row.min_role,
    isActive: row.is_active,
  };
}

async function fetchNavigationLinksFromDb(): Promise<NavigationLinkRecord[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("navigation_links")
      .select(
        "id, platform, placement, label_key, label_en, label_ar, href, icon, sort_order, requires_auth, min_role, is_active"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) return null;
    return (data as DbNavRow[]).map(mapRow);
  } catch {
    return null;
  }
}

export async function getNavigationLinksForUser(options: {
  platform: PlatformContext;
  isAuthenticated: boolean;
  role: VoraRole;
  profileSlug?: string | null;
  storeSlug?: string | null;
}): Promise<{ links: ResolvedNavigationLink[]; source: "supabase" | "fallback" }> {
  // Supabase seed is outdated; local fallback has dual-identity freelance sidebar links.
  const allLinks = FALLBACK_NAVIGATION_LINKS;

  const filtered = filterNavigationLinks(allLinks, options);
  const links = appendRoleShortcuts(filtered, options);

  return {
    links,
    source: "fallback",
  };
}
