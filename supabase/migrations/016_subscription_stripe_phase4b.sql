-- Phase 4B: Stripe price IDs per checkout plan + subscription linkage on assignments

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_ids JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.account_subscription_assignments
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_assignments_stripe_sub
  ON public.account_subscription_assignments(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.subscription_tiers.stripe_price_ids IS
  'Checkout plan id -> Stripe Price ID map, e.g. {"premium_monthly":"price_xxx"}';
