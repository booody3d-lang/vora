-- Fix remaining hardcoded demo navigation hrefs from migration 008 seed.
-- Safe to re-run: only updates rows that still carry demo slugs.

-- Profile: replace any hardcoded slug (not just alex-morgan) with placeholder.
UPDATE public.navigation_links
SET href = '/network/profile/{profileSlug}',
    updated_at = NOW()
WHERE platform = 'network'
  AND label_key = 'nav.profile'
  AND href LIKE '/network/profile/%'
  AND href NOT LIKE '%{profileSlug}%';

-- Freelance orders: link to list page, not a non-existent demo order.
UPDATE public.navigation_links
SET href = '/freelance/orders',
    updated_at = NOW()
WHERE platform = 'freelance'
  AND label_key = 'sidebar.freelance.orders'
  AND href = '/freelance/orders/demo-order';
