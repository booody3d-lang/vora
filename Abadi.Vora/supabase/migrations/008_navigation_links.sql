-- Dynamic navigation links for Network / Freelance sidebars
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

CREATE POLICY "navigation_links_public_read"
  ON public.navigation_links FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "navigation_links_admin_write"
  ON public.navigation_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

-- Seed default sidebar links (safe to re-run with ON CONFLICT DO NOTHING pattern via NOT EXISTS)
INSERT INTO public.navigation_links (platform, label_key, label_en, label_ar, href, icon, sort_order, requires_auth, min_role)
SELECT * FROM (VALUES
  ('network'::platform_context, 'nav.home', 'Home', 'الرئيسية', '/network', '🏠', 10, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.profile', 'Profile', 'الملف الشخصي', '/network/profile/alex-morgan', '👤', 20, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.messaging', 'Messaging', 'الرسائل', '/network/messages', '💬', 30, TRUE, 'registered'::vora_role),
  ('network'::platform_context, 'nav.jobs', 'Jobs', 'الوظائف', '/network/jobs', '💼', 40, FALSE, NULL::vora_role),
  ('network'::platform_context, 'nav.voraAi', 'VORA AI', 'VORA AI', '/network/ai', '✨', 50, TRUE, 'professional'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.home', 'Marketplace', 'السوق', '/freelance', '🏠', 10, FALSE, NULL::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.search', 'Search', 'بحث', '/freelance/search', '🔍', 20, FALSE, NULL::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.messages', 'Messages', 'الرسائل', '/freelance/messages', '💬', 30, TRUE, 'registered'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.dashboard', 'My Store', 'متجري', '/freelance/dashboard', '🛍️', 40, TRUE, 'registered'::vora_role),
  ('freelance'::platform_context, 'sidebar.freelance.orders', 'Orders', 'الطلبات', '/freelance/orders/demo-order', '📦', 50, TRUE, 'registered'::vora_role)
) AS seed(platform, label_key, label_en, label_ar, href, icon, sort_order, requires_auth, min_role)
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_links LIMIT 1);
