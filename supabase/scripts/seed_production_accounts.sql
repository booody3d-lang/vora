-- =============================================================================
-- VORA — Production account roles, profiles, companies, and premium badges
-- =============================================================================
-- IMPORTANT:
--   1. Create auth users FIRST in Supabase Dashboard (Authentication → Users)
--      or via signup API. This script does NOT create auth.users or passwords.
--   2. Matches ACTUAL production schema (PostgREST-probed):
--        accounts:                    id, email, account_type, status
--        profiles:                    id, full_name, updated_at  (NOT professional_profiles)
--        companies:                   id, owner_account_id, slug, name, updated_at
--        account_subscription_assignments: account_id, tier_id, status, expires_at, updated_at
--        subscription_manual_overrides: account_id, tier_id, reason
--   3. Safe to re-run: uses email-based upserts only.
--
-- See docs/PRODUCTION_ACCOUNTS.md for account purposes and manual setup steps.
-- Prefer: node scripts/seed-production-accounts-rest.mjs (uses service role REST)
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
    account_type = 'owner',
    status = 'active'
  WHERE id = v_id;

  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (v_id, 'Abdullah saeed alBakkar', NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, expires_at, updated_at)
  VALUES (v_id, 'premium-user', 'active', NULL, NOW())
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    expires_at = NULL,
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason)
  VALUES (v_id, 'premium-user', 'Platform owner — lifetime premium')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Company — abadi.5g@outlook.com
--    Company portal only; separate from admin account (b.3d@live.com).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id UUID := _vora_account_id('abadi.5g@outlook.com');
BEGIN
  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP company: abadi.5g@outlook.com — auth user not found';
    RETURN;
  END IF;

  UPDATE public.accounts SET
    account_type = 'company',
    status = 'active'
  WHERE id = v_id;

  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (v_id, 'AlBakkar', NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.companies (owner_account_id, slug, name, updated_at)
  VALUES (v_id, 'albakkar', 'AlBakkar', NOW())
  ON CONFLICT (slug) DO UPDATE SET
    owner_account_id = EXCLUDED.owner_account_id,
    name = EXCLUDED.name,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, expires_at, updated_at)
  VALUES (v_id, 'premium-user', 'active', NULL, NOW())
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    expires_at = NULL,
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason)
  VALUES (v_id, 'premium-user', 'Company account — premium badge')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Limited Admin — b.3d@live.com
--    Admin panel + freelancer store creation (separate email from company).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_id UUID := _vora_account_id('b.3d@live.com');
BEGIN
  IF v_id IS NULL THEN
    RAISE NOTICE 'SKIP admin: b.3d@live.com — auth user not found';
    RETURN;
  END IF;

  UPDATE public.accounts SET
    account_type = 'admin',
    status = 'active'
  WHERE id = v_id;

  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (v_id, 'Saeed Bakka', NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, expires_at, updated_at)
  VALUES (v_id, 'premium-user', 'active', NULL, NOW())
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    expires_at = NULL,
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason)
  VALUES (v_id, 'premium-user', 'Limited admin — premium badge')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Premium User — abod.s.bakkar@hotmail.com
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
    account_type = 'professional',
    status = 'active'
  WHERE id = v_id;

  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (v_id, 'Bakkar.3d', NOW())
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  INSERT INTO public.account_subscription_assignments (account_id, tier_id, status, expires_at, updated_at)
  VALUES (v_id, 'premium-user', 'active', NULL, NOW())
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    status = 'active',
    expires_at = NULL,
    updated_at = NOW();

  INSERT INTO public.subscription_manual_overrides (account_id, tier_id, reason)
  VALUES (v_id, 'premium-user', 'Lifetime free premium — founder account')
  ON CONFLICT (account_id) DO UPDATE SET
    tier_id = 'premium-user',
    reason = EXCLUDED.reason;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Freelancer stores — owner, limited admin, premium user
--    Canonical slugs match profile slug + "-store" (see docs/PRODUCTION_ACCOUNTS.md).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('booody3d@gmail.com', 'abdullah-saeed-albakkar-store', 'Abdullah Store'),
      ('b.3d@live.com', 'saeed-bakka-store', 'Saeed Store'),
      ('abod.s.bakkar@hotmail.com', 'bakkar-3d-store', 'Bakkar Store')
    ) AS t(email, store_slug, store_name)
  LOOP
    DECLARE v_id UUID := _vora_account_id(rec.email);
    BEGIN
      IF v_id IS NULL THEN
        RAISE NOTICE 'SKIP store: % — auth user not found', rec.email;
        CONTINUE;
      END IF;

      INSERT INTO public.freelancer_stores (
        account_id, slug, store_name, updated_at
      )
      VALUES (v_id, rec.store_slug, rec.store_name, NOW())
      ON CONFLICT (account_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        store_name = EXCLUDED.store_name,
        updated_at = NOW();
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
SELECT
  a.email,
  a.account_type,
  a.status,
  p.full_name AS profile_display_name,
  c.name AS company_name,
  c.slug AS company_slug,
  asa.tier_id,
  asa.status AS subscription_status,
  asa.expires_at,
  smo.reason AS override_reason
FROM public.accounts a
LEFT JOIN public.profiles p ON p.id = a.id
LEFT JOIN public.companies c ON c.owner_account_id = a.id
LEFT JOIN public.account_subscription_assignments asa ON asa.account_id = a.id
LEFT JOIN public.subscription_manual_overrides smo ON smo.account_id = a.id
WHERE lower(a.email) IN (
  'booody3d@gmail.com',
  'abadi.5g@outlook.com',
  'b.3d@live.com',
  'abod.s.bakkar@hotmail.com'
)
ORDER BY a.email;

DROP FUNCTION IF EXISTS _vora_account_id(TEXT);

COMMIT;
