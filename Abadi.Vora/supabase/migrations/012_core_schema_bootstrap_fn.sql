-- Minimal idempotent bootstrap for empty Supabase projects.
-- Run once in Supabase SQL editor, or invoke via service role: select vora_ensure_core_schema();

DO $$ BEGIN
  CREATE TYPE account_tier AS ENUM ('visitor', 'basic', 'professional');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE platform_context AS ENUM ('network', 'freelance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vora_role AS ENUM ('visitor', 'registered', 'professional', 'company', 'admin', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  tier account_tier NOT NULL DEFAULT 'basic',
  professional_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  has_freelancer_store BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_platform platform_context NOT NULL DEFAULT 'network',
  primary_role vora_role NOT NULL DEFAULT 'registered',
  gender TEXT CHECK (gender IN ('male', 'female')),
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  headline TEXT,
  about TEXT,
  profile_photo_url TEXT,
  cover_image_url TEXT,
  resume_url TEXT,
  video_intro_url TEXT,
  professional_score INTEGER NOT NULL DEFAULT 0 CHECK (professional_score >= 0 AND professional_score <= 100),
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  location TEXT,
  full_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  current_role TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freelancer_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  video_intro_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  seo_slug TEXT UNIQUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  freelancer_store_id UUID REFERENCES public.freelancer_stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.vora_ensure_core_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1;
  RETURN jsonb_build_object(
    'ok', true,
    'accounts', to_regclass('public.accounts') IS NOT NULL,
    'professional_profiles', to_regclass('public.professional_profiles') IS NOT NULL,
    'freelancer_stores', to_regclass('public.freelancer_stores') IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vora_ensure_core_schema() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role text := NEW.raw_user_meta_data->>'role';
  meta_gender text := NEW.raw_user_meta_data->>'gender';
  resolved_role vora_role := 'registered';
BEGIN
  IF to_regclass('public.accounts') IS NULL THEN
    RETURN NEW;
  END IF;

  IF meta_role IN ('registered', 'professional', 'company', 'admin', 'owner') THEN
    resolved_role := meta_role::vora_role;
  END IF;

  INSERT INTO public.accounts (
    id, email, full_name, tier, primary_role, gender,
    professional_unlocked, has_freelancer_store
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN resolved_role = 'professional' THEN 'professional'::account_tier ELSE 'basic'::account_tier END,
    resolved_role,
    CASE WHEN meta_gender IN ('male', 'female') THEN meta_gender ELSE NULL END,
    resolved_role IN ('professional', 'admin', 'owner'),
    resolved_role = 'professional'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.accounts.full_name),
    primary_role = EXCLUDED.primary_role,
    gender = COALESCE(EXCLUDED.gender, public.accounts.gender),
    professional_unlocked = EXCLUDED.professional_unlocked,
    has_freelancer_store = EXCLUDED.has_freelancer_store,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "professional_profiles_public_read" ON public.professional_profiles;
CREATE POLICY "professional_profiles_public_read" ON public.professional_profiles
  FOR SELECT USING (is_public = TRUE OR auth.uid() = account_id);

DROP POLICY IF EXISTS "professional_profiles_own_write" ON public.professional_profiles;
CREATE POLICY "professional_profiles_own_write" ON public.professional_profiles
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);

DROP POLICY IF EXISTS "stores_public_read" ON public.freelancer_stores;
CREATE POLICY "stores_public_read" ON public.freelancer_stores
  FOR SELECT USING (is_active = TRUE OR auth.uid() = account_id);

DROP POLICY IF EXISTS "stores_own_write" ON public.freelancer_stores;
CREATE POLICY "stores_own_write" ON public.freelancer_stores
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
