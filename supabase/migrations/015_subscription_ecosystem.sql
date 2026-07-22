-- Flexible subscription tiers + account state (Phase 4A)
-- Complements 005_billing_payments.sql user_subscriptions (Stripe IDs deferred to Phase 4B)

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('user', 'company')),
  price_sar NUMERIC(12, 2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'none'
    CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime', 'none')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon_url TEXT,
  icon_svg TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.account_subscription_assignments (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'free'
    CHECK (source IN ('billing', 'manual_override', 'trial', 'free')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_manual_overrides (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  reason TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.stripe_customer_mappings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_payment_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  tier_id TEXT REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
  amount_sar NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'sar',
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed', 'refunded')),
  payload_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_refund_records (
  id TEXT PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  amount_sar NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed')),
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_audience ON public.subscription_tiers(audience, sort_order);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_events_account ON public.stripe_payment_events(account_id, created_at DESC);

-- Seed default tiers (match subscription-store defaults)
INSERT INTO public.subscription_tiers (
  id, name_en, name_ar, audience, price_sar, billing_cycle, features, sort_order, is_active, icon_svg
) VALUES
  (
    'free-user', 'Free', 'مجاني', 'user', 0, 'none',
    '[{"key":"network_access","labelEn":"Full network access","labelAr":"وصول كامل للشبكة"},{"key":"marketplace","labelEn":"Marketplace access","labelAr":"وصول للسوق"}]'::jsonb,
    0, TRUE, NULL
  ),
  (
    'premium-user', 'Premium', 'بريميوم', 'user', 20, 'monthly',
    '[{"key":"premium_badge","labelEn":"Premium badge","labelAr":"شارة بريميوم"},{"key":"ai_access","labelEn":"VORA AI access","labelAr":"وصول VORA AI"},{"key":"analytics_full","labelEn":"Full profile analytics","labelAr":"تحليلات كاملة"},{"key":"unlimited_uploads","labelEn":"Unlimited uploads","labelAr":"رفع غير محدود"},{"key":"search_boost","labelEn":"Search visibility boost","labelAr":"تعزيز الظهور في البحث"}]'::jsonb,
    1, TRUE,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/></svg>'
  ),
  (
    'company-standard', 'Company Standard', 'شركات قياسي', 'company', 600, 'yearly',
    '[{"key":"unlimited_jobs","labelEn":"Unlimited job posts","labelAr":"وظائف غير محدودة"},{"key":"ats_full","labelEn":"Full ATS pipeline","labelAr":"نظام ATS كامل"},{"key":"company_analytics","labelEn":"Company analytics","labelAr":"تحليلات الشركة"}]'::jsonb,
    2, TRUE,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B5998"><path d="M12 7V3H2v18h20V7H12zm-2 12H4v-2h6v2zm0-4H4v-2h6v2zm0-4H4V9h6v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2z"/></svg>'
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_subscription_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_manual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_refund_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_tiers_public_read" ON public.subscription_tiers
  FOR SELECT USING (is_active = TRUE OR auth.uid() IS NOT NULL);

CREATE POLICY "account_assignments_own_read" ON public.account_subscription_assignments
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "manual_overrides_own_read" ON public.subscription_manual_overrides
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "stripe_customer_mappings_own_read" ON public.stripe_customer_mappings
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "stripe_payment_events_own_read" ON public.stripe_payment_events
  FOR SELECT USING (account_id IS NULL OR auth.uid() = account_id);
