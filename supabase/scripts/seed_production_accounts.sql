-- =============================================================================
-- VORA — Production account roles, profiles, companies, and premium badges
-- =============================================================================
-- IMPORTANT:
--   1. Create auth users FIRST in Supabase Dashboard (Authentication → Users)
--      or via signup API. This script does NOT create auth.users or passwords.
--   2. Run AFTER all migrations (001–029) are applied.
--   3. Safe to re-run: uses email-based upserts only.
--
-- See docs/PRODUCTION_ACCOUNTS.md for account purposes and manual setup steps.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: resolve account id by email (case-insensitive)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _vora_account_id(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.accounts WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 1. Platform Owner — booody3d@gmail.com
--    Effective owner role is also gated by VORA_PLATFORM_OWNER_EMAIL env var.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id UUID := _vora_account_id('booody3d@gmail.com');
BEGIN
  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP owner: booody3d@gmail.com — auth user not found';
    RETURN;
  END IF;

  UPDATE public.accounts SET
    full_name = 'Abdullah saeed alBakkar',
    primary_role = 'owner',
    account_type = 'individual',
    tier = 'professional',
    professional_unlocked = TRUE,
    has_freelancer_store = TRUE,
    updated_at = NOW()
  WHERE id = v_id;

  INSERT INTO public.professional_profiles (account_id, slug, headline, is_public, is_premium)
  VALUES (v_id, 'abdullah-saeed-albakkar', 'Platform Owner', TRUE, TRUE)
  ON CONFLICT (account_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    is_premium = TRUE,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, source)
  VALUES (v_id, 'premium-user', 'active', 'manual_override')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    source = 'manual_override',
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason, granted_by)
  VALUES (v_id, 'premium-user', 'Platform owner — lifetime premium', 'seed_production_accounts')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason,
    granted_at = NOW();
END $$;

-- ---------------------------------------------------------------------------
-- 2. Company + Limited Admin — abadi.5g@outlook.com
--    ONE auth user serves both company portal and admin panel access.
--    See docs/PRODUCTION_ACCOUNTS.md for duplicate-email resolution.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id UUID := _vora_account_id('abadi.5g@outlook.com');
BEGIN
  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP company/admin: abadi.5g@outlook.com — auth user not found';
    RETURN;
  END IF;

  UPDATE public.accounts SET
    full_name = 'Saeed Bakka',
    primary_role = 'admin',
    account_type = 'company',
    tier = 'professional',
    professional_unlocked = TRUE,
    has_freelancer_store = TRUE,
    updated_at = NOW()
  WHERE id = v_id;

  INSERT INTO public.professional_profiles (account_id, slug, headline, is_public, is_premium)
  VALUES (v_id, 'saeed-bakka', 'Administrator', TRUE, TRUE)
  ON CONFLICT (account_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    is_premium = TRUE,
    updated_at = NOW();

  INSERT INTO public.companies (owner_account_id, slug, name, is_public)
  VALUES (v_id, 'albakkar', 'AlBakkar', TRUE)
  ON CONFLICT (slug) DO UPDATE SET
    owner_account_id = EXCLUDED.owner_account_id,
    name = EXCLUDED.name,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, source)
  VALUES (v_id, 'premium-user', 'active', 'manual_override')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    source = 'manual_override',
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason, granted_by)
  VALUES (v_id, 'premium-user', 'Company admin — premium badge', 'seed_production_accounts')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason,
    granted_at = NOW();
END $$;

-- ---------------------------------------------------------------------------
-- 3. Premium User — abod.s.bakkar@hotmail.com
--    Lifetime free premium + premium badge.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id UUID := _vora_account_id('abod.s.bakkar@hotmail.com');
BEGIN
  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP premium user: abod.s.bakkar@hotmail.com — auth user not found';
    RETURN;
  END IF;

  UPDATE public.accounts SET
    full_name = 'Bakkar.3d',
    primary_role = 'professional',
    account_type = 'individual',
    tier = 'professional',
    professional_unlocked = TRUE,
    has_freelancer_store = TRUE,
    updated_at = NOW()
  WHERE id = v_id;

  INSERT INTO public.professional_profiles (account_id, slug, headline, is_public, is_premium)
  VALUES (v_id, 'bakkar-3d', 'Premium Member', TRUE, TRUE)
  ON CONFLICT (account_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    is_premium = TRUE,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, source, expires_at)
  VALUES (v_id, 'premium-user', 'active', 'manual_override', NULL)
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    source = 'manual_override',
    expires_at = NULL,
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason, granted_by, expires_at)
  VALUES (v_id, 'premium-user', 'Lifetime free premium — founder account', 'seed_production_accounts', NULL)
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason,
    expires_at = NULL,
    granted_at = NOW();
END $$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT
  a.email,
  a.full_name,
  a.primary_role,
  a.account_type,
  pp.slug AS profile_slug,
  pp.is_premium,
  c.name AS company_name,
  c.slug AS company_slug,
  asa.tier_id,
  smo.reason AS override_reason
FROM public.accounts a
LEFT JOIN public.professional_profiles pp ON pp.account_id = a.id
LEFT JOIN public.companies c ON c.owner_account_id = a.id
LEFT JOIN public.account_subscription_assignments asa ON asa.account_id = a.id
LEFT JOIN public.subscription_manual_overrides smo ON smo.account_id = a.id
WHERE lower(a.email) IN (
  'booody3d@gmail.com',
  'abadi.5g@outlook.com',
  'abod.s.bakkar@hotmail.com'
)
ORDER BY a.email;

DROP FUNCTION IF EXISTS _vora_account_id(TEXT);

COMMIT;
