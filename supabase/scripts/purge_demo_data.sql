-- =============================================================================
-- VORA — Purge demo/fake freelance marketplace data (stores + services)
-- =============================================================================
-- Source of truth for demo identifiers:
--   src/lib/freelance/mock-data.ts  (DEMO_STORE, DEMO_SERVICES)
--   src/lib/security/demo-store.ts  (alex@vora.sa → storeSlug alex-design-studio)
--
-- Safe by design: only rows matching KNOWN demo slugs/names/patterns are removed.
-- Real user stores/services are NOT touched unless they collide with demo slugs.
--
-- FK notes (see migrations 001, 004, 006, 022):
--   freelance_orders.service_id / store_id  → ON DELETE RESTRICT (delete orders first)
--   service_addons, freelance_portfolios    → CASCADE from services/stores
--   freelance_inquiries.service_id          → ON DELETE SET NULL
--   platform_links.freelancer_store_id      → ON DELETE SET NULL
--   saved_services                          → CASCADE from services
--   notifications                           → no service_id column (006 schema)
--
-- Usage (Supabase SQL Editor):
--   1. Review the BEFORE counts below.
--   2. Run this entire script.
--   3. Confirm AFTER counts are zero for demo targets.
--   4. To dry-run without committing, replace COMMIT with ROLLBACK at the bottom.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Demo identifier sets (from mock-data.ts smoke audit)
-- ---------------------------------------------------------------------------
-- Store:  id=store-1 (JSON only), slug=alex-design-studio, name=Alex Design Studio
-- Services: svc-1..svc-10 (JSON only); Supabase rows match by slug + store_id

CREATE TEMP TABLE _demo_store_ids ON COMMIT DROP AS
SELECT id
FROM public.freelancer_stores
WHERE slug IN (
    'alex-design-studio'          -- DEMO_STORE.slug / seoSlug
  )
  OR seo_slug IN ('alex-design-studio')
  OR store_name = 'Alex Design Studio'
  OR slug LIKE 'demo-%'           -- defensive pattern for seeded demo slugs
  OR slug LIKE 'store-%';         -- mock id prefix pattern (e.g. store-1 slugified)

CREATE TEMP TABLE _demo_service_ids ON COMMIT DROP AS
SELECT fs.id
FROM public.freelance_services fs
WHERE fs.store_id IN (SELECT id FROM _demo_store_ids)
   OR fs.slug IN (
    'professional-logo-design',   -- svc-1
    'ui-ux-app-design',           -- svc-2
    'wordpress-website',          -- svc-3
    'seo-audit',                  -- svc-4
    'arabic-english-translation', -- svc-5
    'product-demo-video',         -- svc-6
    'business-plan',              -- svc-7
    'ai-chatbot',                 -- svc-8
    'blog-articles',              -- svc-9
    'podcast-editing'             -- svc-10
  )
  OR fs.slug LIKE 'demo-%'
  OR fs.slug LIKE 'svc-%';

CREATE TEMP TABLE _demo_order_ids ON COMMIT DROP AS
SELECT fo.id
FROM public.freelance_orders fo
WHERE fo.store_id IN (SELECT id FROM _demo_store_ids)
   OR fo.service_id IN (SELECT id FROM _demo_service_ids);

-- ---------------------------------------------------------------------------
-- BEFORE counts (verification)
-- ---------------------------------------------------------------------------
SELECT 'BEFORE' AS phase,
       (SELECT COUNT(*) FROM _demo_store_ids)    AS demo_stores,
       (SELECT COUNT(*) FROM _demo_service_ids)  AS demo_services,
       (SELECT COUNT(*) FROM _demo_order_ids)    AS demo_orders,
       (SELECT COUNT(*) FROM public.freelancer_stores)   AS total_stores,
       (SELECT COUNT(*) FROM public.freelance_services)  AS total_services;

-- ---------------------------------------------------------------------------
-- Deletes (child → parent order)
-- Guarded with to_regclass / information_schema for partial migration states.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.order_messages') IS NOT NULL THEN
    DELETE FROM public.order_messages
    WHERE order_id IN (SELECT id FROM _demo_order_ids);
  END IF;

  IF to_regclass('public.order_disputes') IS NOT NULL THEN
    DELETE FROM public.order_disputes
    WHERE order_id IN (SELECT id FROM _demo_order_ids);
  END IF;

  IF to_regclass('public.freelance_reviews') IS NOT NULL THEN
    -- 001 schema: service_id only. 022+ adds order_id and store_id.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'freelance_reviews'
        AND column_name = 'order_id'
    ) THEN
      DELETE FROM public.freelance_reviews
      WHERE order_id IN (SELECT id FROM _demo_order_ids);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'freelance_reviews'
        AND column_name = 'service_id'
    ) THEN
      DELETE FROM public.freelance_reviews
      WHERE service_id IN (SELECT id FROM _demo_service_ids);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'freelance_reviews'
        AND column_name = 'store_id'
    ) THEN
      DELETE FROM public.freelance_reviews
      WHERE store_id IN (SELECT id FROM _demo_store_ids);
    END IF;
  END IF;

  IF to_regclass('public.freelance_orders') IS NOT NULL THEN
    DELETE FROM public.freelance_orders
    WHERE id IN (SELECT id FROM _demo_order_ids);
  END IF;

  IF to_regclass('public.freelance_messages') IS NOT NULL
     AND to_regclass('public.freelance_chat_sessions') IS NOT NULL THEN
    DELETE FROM public.freelance_messages
    WHERE session_id IN (
      SELECT cs.id
      FROM public.freelance_chat_sessions cs
      WHERE cs.order_id IN (SELECT id FROM _demo_order_ids)
         OR cs.seller_id IN (
           SELECT account_id FROM public.freelancer_stores WHERE id IN (SELECT id FROM _demo_store_ids)
         )
    );
  END IF;

  IF to_regclass('public.freelance_chat_sessions') IS NOT NULL THEN
    DELETE FROM public.freelance_chat_sessions
    WHERE order_id IN (SELECT id FROM _demo_order_ids)
       OR seller_id IN (
         SELECT account_id FROM public.freelancer_stores WHERE id IN (SELECT id FROM _demo_store_ids)
       );
  END IF;

  IF to_regclass('public.freelance_inquiries') IS NOT NULL THEN
    DELETE FROM public.freelance_inquiries
    WHERE service_id IN (SELECT id FROM _demo_service_ids)
       OR seller_id IN (
         SELECT account_id FROM public.freelancer_stores WHERE id IN (SELECT id FROM _demo_store_ids)
       );
  END IF;

  IF to_regclass('public.saved_services') IS NOT NULL THEN
    DELETE FROM public.saved_services
    WHERE service_id IN (SELECT id FROM _demo_service_ids);
  END IF;

  IF to_regclass('public.service_addons') IS NOT NULL THEN
    DELETE FROM public.service_addons
    WHERE service_id IN (SELECT id FROM _demo_service_ids);
  END IF;

  IF to_regclass('public.freelance_services') IS NOT NULL THEN
    DELETE FROM public.freelance_services
    WHERE id IN (SELECT id FROM _demo_service_ids);
  END IF;

  IF to_regclass('public.freelance_portfolios') IS NOT NULL THEN
    DELETE FROM public.freelance_portfolios
    WHERE store_id IN (SELECT id FROM _demo_store_ids);
  END IF;

  IF to_regclass('public.store_analytics_daily') IS NOT NULL THEN
    DELETE FROM public.store_analytics_daily
    WHERE store_id IN (SELECT id FROM _demo_store_ids);
  END IF;

  IF to_regclass('public.platform_links') IS NOT NULL THEN
    -- CHECK requires at least one link target; delete rows with only a demo store link.
    DELETE FROM public.platform_links
    WHERE freelancer_store_id IN (SELECT id FROM _demo_store_ids)
      AND professional_profile_id IS NULL;

    UPDATE public.platform_links
    SET freelancer_store_id = NULL
    WHERE freelancer_store_id IN (SELECT id FROM _demo_store_ids)
      AND professional_profile_id IS NOT NULL;
  END IF;

  DELETE FROM public.freelancer_stores
  WHERE id IN (SELECT id FROM _demo_store_ids);
END $$;

-- ---------------------------------------------------------------------------
-- AFTER counts (verification — demo targets should be 0)
-- ---------------------------------------------------------------------------
SELECT 'AFTER' AS phase,
       (SELECT COUNT(*)
        FROM public.freelancer_stores
        WHERE slug IN ('alex-design-studio')
           OR seo_slug IN ('alex-design-studio')
           OR store_name = 'Alex Design Studio'
           OR slug LIKE 'demo-%'
           OR slug LIKE 'store-%') AS remaining_demo_stores,
       (SELECT COUNT(*)
        FROM public.freelance_services
        WHERE slug IN (
          'professional-logo-design', 'ui-ux-app-design', 'wordpress-website',
          'seo-audit', 'arabic-english-translation', 'product-demo-video',
          'business-plan', 'ai-chatbot', 'blog-articles', 'podcast-editing'
        )
        OR slug LIKE 'demo-%'
        OR slug LIKE 'svc-%') AS remaining_demo_services,
       (SELECT COUNT(*) FROM public.freelancer_stores)  AS total_stores,
       (SELECT COUNT(*) FROM public.freelance_services) AS total_services;

COMMIT;
-- Replace COMMIT with ROLLBACK above for a dry-run (no permanent changes).
