-- =============================================================================
-- VORA — Ensure navigation_links exists, seed defaults, apply href fixes
-- تأكيد وجود navigation_links، بذر الروابط الافتراضية، وتصحيح href
-- =============================================================================
-- Use when migration 028/029 fail with:
--   relation "public.navigation_links" does not exist
--
-- Root cause: partial migration path (e.g. apply_missing_migrations_007_023_027.sql)
-- skips 008_navigation_links.sql. Run this script once, then 028/029 are optional
-- (this script already includes their fixes).
--
-- Usage (Supabase SQL Editor):
--   1. Review BEFORE verification output.
--   2. Run this entire script.
--   3. Confirm AFTER verification shows navigation_links PASS.
--   4. Dry-run: replace COMMIT with ROLLBACK at the bottom.
-- =============================================================================

BEGIN;

-- =============================================================================
-- BEFORE VERIFICATION
-- =============================================================================

SELECT '=== BEFORE VERIFICATION ===' AS section;

SELECT '008_navigation_links' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'navigation_links'
  ) AS table_exists;


-- =============================================================================
-- SECTION 008 — navigation_links table, RLS, seed (from 008_navigation_links.sql)
-- Requires: platform_context (001), vora_role + accounts (007)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.navigation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_context NOT NULL,
  placement TEXT NOT NULL DEFAULT 'sidebar',
  label_key TEXT,
  label_en TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  requires_auth BOOLEAN NOT NULL DEFAULT FALSE,
  min_role vora_role,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_links_platform
  ON public.navigation_links (platform, placement, sort_order)
  WHERE is_active = TRUE;

ALTER TABLE public.navigation_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "navigation_links_public_read" ON public.navigation_links;
CREATE POLICY "navigation_links_public_read"
  ON public.navigation_links FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "navigation_links_admin_write" ON public.navigation_links;
CREATE POLICY "navigation_links_admin_write"
  ON public.navigation_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

INSERT INTO public.navigation_links (platform, label_key, label_en, label_ar, href, icon, sort_order, requires_auth, min_role)
SELECT * FROM (VALUES
  ('network'::platform_context, 'nav.home', 'Home', 'الرئيسية', '/network', '🏠', 10, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.profile', 'Profile', 'الملف الشخصي', '/network/profile/{profileSlug}', '👤', 20, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.messaging', 'Messaging', 'الرسائل', '/network/messages', '💬', 30, TRUE, 'registered'::vora_role),
  ('network'::platform_context, 'nav.jobs', 'Jobs', 'الوظائف', '/network/jobs', '💼', 40, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.voraAi', 'VORA AI', 'VORA AI', '/network/ai', '✨', 50, TRUE, 'professional'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.home', 'Marketplace', 'السوق', '/freelance', '🏠', 10, FALSE, NULL::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.search', 'Search', 'بحث', '/freelance/search', '🔍', 20, FALSE, NULL::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.messages', 'Messages', 'الرسائل', '/freelance/messages', '💬', 30, TRUE, 'registered'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.dashboard', 'My Store', 'متجري', '/freelance/dashboard', '🛍️', 40, TRUE, 'registered'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.orders', 'Orders', 'الطلبات', '/freelance/orders', '📦', 50, TRUE, 'registered'::vora_role)
) AS seed(platform, label_key, label_en, label_ar, href, icon, sort_order, requires_auth, min_role)
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_links LIMIT 1);


-- =============================================================================
-- SECTION 028 — fix hardcoded demo profile slug (028_fix_navigation_profile_href.sql)
-- =============================================================================

UPDATE public.navigation_links
SET href = '/network/profile/{profileSlug}',
    updated_at = NOW()
WHERE platform = 'network'
  AND label_key = 'nav.profile'
  AND href = '/network/profile/alex-morgan';


-- =============================================================================
-- SECTION 029 — fix remaining demo hrefs (029_fix_navigation_demo_hrefs.sql)
-- =============================================================================

UPDATE public.navigation_links
SET href = '/network/profile/{profileSlug}',
    updated_at = NOW()
WHERE platform = 'network'
  AND label_key = 'nav.profile'
  AND href LIKE '/network/profile/%'
  AND href NOT LIKE '%{profileSlug}%';

UPDATE public.navigation_links
SET href = '/freelance/orders',
    updated_at = NOW()
WHERE platform = 'freelance'
  AND label_key = 'sidebar.freelance.orders'
  AND href = '/freelance/orders/demo-order';


-- =============================================================================
-- AFTER VERIFICATION
-- =============================================================================

SELECT '=== AFTER VERIFICATION ===' AS section;

SELECT '008_navigation_links' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'navigation_links'
  ) AS table_exists,
  (SELECT COUNT(*)::int FROM public.navigation_links) AS row_count,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'navigation_links'
      AND policyname = 'navigation_links_public_read'
  ) AS has_read_policy,
  CASE WHEN
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'navigation_links'
    )
    AND (SELECT COUNT(*) FROM public.navigation_links) >= 10
    AND EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'navigation_links'
        AND policyname = 'navigation_links_public_read'
    )
  THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '028_029_profile_href' AS check_id,
  NOT EXISTS (
    SELECT 1 FROM public.navigation_links
    WHERE platform = 'network'
      AND label_key = 'nav.profile'
      AND href LIKE '/network/profile/%'
      AND href NOT LIKE '%{profileSlug}%'
  ) AS profile_hrefs_ok,
  NOT EXISTS (
    SELECT 1 FROM public.navigation_links
    WHERE platform = 'freelance'
      AND label_key = 'sidebar.freelance.orders'
      AND href = '/freelance/orders/demo-order'
  ) AS orders_href_ok,
  CASE WHEN
    NOT EXISTS (
      SELECT 1 FROM public.navigation_links
      WHERE platform = 'network'
        AND label_key = 'nav.profile'
        AND href LIKE '/network/profile/%'
        AND href NOT LIKE '%{profileSlug}%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.navigation_links
      WHERE platform = 'freelance'
        AND label_key = 'sidebar.freelance.orders'
        AND href = '/freelance/orders/demo-order'
    )
  THEN 'PASS' ELSE 'FAIL' END AS status;

COMMIT;
