-- VORA Foundation Schema
-- CRITICAL: Professional Network and Freelance Marketplace remain completely separated.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE account_tier AS ENUM ('visitor', 'basic', 'professional');
CREATE TYPE platform_context AS ENUM ('network', 'freelance');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'closed', 'archived');
CREATE TYPE service_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE application_status AS ENUM ('submitted', 'reviewing', 'shortlisted', 'rejected', 'hired');

-- ============================================================
-- UNIFIED ACCOUNT (single login, dual platform access)
-- ============================================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  tier account_tier NOT NULL DEFAULT 'basic',
  professional_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  has_freelancer_store BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_platform platform_context NOT NULL DEFAULT 'network',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visitor view tracking (unregistered sessions)
CREATE TABLE public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  profile_views INTEGER NOT NULL DEFAULT 0,
  job_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VORA NETWORK — Professional profiles (SEPARATE from freelance)
-- ============================================================
CREATE TABLE public.professional_profiles (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.professional_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.professional_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  proficiency INTEGER CHECK (proficiency >= 1 AND proficiency <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, name)
);

CREATE TABLE public.professional_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_organization TEXT NOT NULL,
  issue_date DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  about TEXT,
  industry TEXT,
  size_range TEXT,
  headquarters TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  salary_range TEXT,
  status job_status NOT NULL DEFAULT 'active',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  professional_score_at_apply INTEGER NOT NULL,
  resume_url TEXT NOT NULL,
  cover_letter TEXT,
  status application_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, applicant_account_id)
);

-- ============================================================
-- VORA FREELANCE — Stores & services (SEPARATE from professional)
-- ============================================================
CREATE TABLE public.freelancer_stores (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.freelance_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.freelancer_stores(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  delivery_days INTEGER NOT NULL CHECK (delivery_days > 0),
  thumbnail_url TEXT,
  status service_status NOT NULL DEFAULT 'active',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, slug)
);

CREATE TABLE public.freelance_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.freelancer_stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.freelance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  reviewer_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, reviewer_account_id)
);

CREATE TABLE public.saved_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, service_id)
);

-- ============================================================
-- Cross-platform link (read-only navigation between separated views)
-- ============================================================
CREATE TABLE public.platform_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  freelancer_store_id UUID REFERENCES public.freelancer_stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    professional_profile_id IS NOT NULL OR freelancer_store_id IS NOT NULL
  )
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_professional_profiles_account ON public.professional_profiles(account_id);
CREATE INDEX idx_professional_profiles_slug ON public.professional_profiles(slug);
CREATE INDEX idx_freelancer_stores_account ON public.freelancer_stores(account_id);
CREATE INDEX idx_freelancer_stores_slug ON public.freelancer_stores(slug);
CREATE INDEX idx_jobs_company ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_freelance_services_store ON public.freelance_services(store_id);
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_account_id);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER freelancer_stores_updated_at
  BEFORE UPDATE ON public.freelancer_stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER freelance_services_updated_at
  BEFORE UPDATE ON public.freelance_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Professional Score recalculation function
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_professional_score(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_profile RECORD;
  v_exp_count INTEGER;
  v_edu_count INTEGER;
  v_skill_count INTEGER;
  v_cert_count INTEGER;
BEGIN
  SELECT * INTO v_profile FROM public.professional_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_profile.profile_photo_url IS NOT NULL AND length(trim(v_profile.profile_photo_url)) > 0 THEN
    v_score := v_score + 10;
  END IF;

  IF v_profile.cover_image_url IS NOT NULL AND length(trim(v_profile.cover_image_url)) > 0 THEN
    v_score := v_score + 10;
  END IF;

  IF v_profile.headline IS NOT NULL AND length(trim(v_profile.headline)) > 0
     AND v_profile.about IS NOT NULL AND length(trim(v_profile.about)) > 0 THEN
    v_score := v_score + 15;
  END IF;

  SELECT COUNT(*) INTO v_exp_count
  FROM public.professional_experiences
  WHERE profile_id = p_profile_id AND is_verified = TRUE;

  IF v_exp_count >= 1 THEN v_score := v_score + 20; END IF;

  SELECT COUNT(*) INTO v_edu_count
  FROM public.professional_education
  WHERE profile_id = p_profile_id AND is_verified = TRUE;

  IF v_edu_count >= 1 THEN v_score := v_score + 15; END IF;

  SELECT COUNT(*) INTO v_skill_count FROM public.professional_skills WHERE profile_id = p_profile_id;
  SELECT COUNT(*) INTO v_cert_count FROM public.professional_certifications WHERE profile_id = p_profile_id;

  IF v_skill_count >= 3 OR v_cert_count >= 1 THEN v_score := v_score + 10; END IF;

  IF v_profile.resume_url IS NOT NULL AND length(trim(v_profile.resume_url)) > 0 THEN
    v_score := v_score + 10;
  END IF;

  IF v_profile.video_intro_url IS NOT NULL AND length(trim(v_profile.video_intro_url)) > 0 THEN
    v_score := v_score + 10;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.refresh_professional_score()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_new_score INTEGER;
BEGIN
  v_profile_id := COALESCE(NEW.profile_id, OLD.profile_id);
  v_new_score := public.calculate_professional_score(v_profile_id);

  UPDATE public.professional_profiles
  SET professional_score = v_new_score,
      updated_at = NOW()
  WHERE id = v_profile_id;

  UPDATE public.accounts a
  SET professional_unlocked = (
    v_new_score >= 70
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = v_profile_id
        AND pp.profile_photo_url IS NOT NULL
        AND pp.cover_image_url IS NOT NULL
        AND pp.headline IS NOT NULL AND length(trim(pp.headline)) > 0
        AND pp.about IS NOT NULL AND length(trim(pp.about)) > 0
        AND pp.resume_url IS NOT NULL
    )
    AND (SELECT COUNT(*) FROM public.professional_experiences e WHERE e.profile_id = v_profile_id AND e.is_verified = TRUE) >= 1
    AND (SELECT COUNT(*) FROM public.professional_education ed WHERE ed.profile_id = v_profile_id AND ed.is_verified = TRUE) >= 1
    AND (SELECT COUNT(*) FROM public.professional_skills s WHERE s.profile_id = v_profile_id) >= 3
  ),
  tier = CASE
    WHEN (
      v_new_score >= 70
      AND EXISTS (
        SELECT 1 FROM public.professional_profiles pp
        WHERE pp.id = v_profile_id
          AND pp.profile_photo_url IS NOT NULL
          AND pp.cover_image_url IS NOT NULL
          AND pp.headline IS NOT NULL AND length(trim(pp.headline)) > 0
          AND pp.about IS NOT NULL AND length(trim(pp.about)) > 0
          AND pp.resume_url IS NOT NULL
      )
      AND (SELECT COUNT(*) FROM public.professional_experiences e WHERE e.profile_id = v_profile_id AND e.is_verified = TRUE) >= 1
      AND (SELECT COUNT(*) FROM public.professional_education ed WHERE ed.profile_id = v_profile_id AND ed.is_verified = TRUE) >= 1
      AND (SELECT COUNT(*) FROM public.professional_skills s WHERE s.profile_id = v_profile_id) >= 3
    ) THEN 'professional'::account_tier
    ELSE a.tier
  END,
  updated_at = NOW()
  FROM public.professional_profiles pp
  WHERE pp.id = v_profile_id AND a.id = pp.account_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_refresh_score_on_profile
  AFTER INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.refresh_professional_score();

CREATE TRIGGER trg_refresh_score_on_experience
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_experiences
  FOR EACH ROW EXECUTE FUNCTION public.refresh_professional_score();

CREATE TRIGGER trg_refresh_score_on_education
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_education
  FOR EACH ROW EXECUTE FUNCTION public.refresh_professional_score();

CREATE TRIGGER trg_refresh_score_on_skills
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_skills
  FOR EACH ROW EXECUTE FUNCTION public.refresh_professional_score();

CREATE TRIGGER trg_refresh_score_on_certifications
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_certifications
  FOR EACH ROW EXECUTE FUNCTION public.refresh_professional_score();

-- Auto-create account on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (id, email, full_name, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'basic'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_links ENABLE ROW LEVEL SECURITY;

-- Accounts: own record only
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE USING (auth.uid() = id);

-- Visitor sessions: public insert/read by token (handled server-side)
CREATE POLICY "visitor_sessions_all" ON public.visitor_sessions
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Professional profiles: limited public read, full own access
CREATE POLICY "professional_profiles_public_read" ON public.professional_profiles
  FOR SELECT USING (is_public = TRUE OR auth.uid() = account_id);
CREATE POLICY "professional_profiles_own_write" ON public.professional_profiles
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);

-- Professional sub-tables: public read limited fields via profile visibility
CREATE POLICY "experiences_read" ON public.professional_experiences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND (p.is_public = TRUE OR p.account_id = auth.uid())
    )
  );
CREATE POLICY "experiences_own_write" ON public.professional_experiences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "education_read" ON public.professional_education
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND (p.is_public = TRUE OR p.account_id = auth.uid())
    )
  );
CREATE POLICY "education_own_write" ON public.professional_education
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "skills_read" ON public.professional_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND (p.is_public = TRUE OR p.account_id = auth.uid())
    )
  );
CREATE POLICY "skills_own_write" ON public.professional_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND p.account_id = auth.uid()
    )
  );

CREATE POLICY "certifications_read" ON public.professional_certifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND (p.is_public = TRUE OR p.account_id = auth.uid())
    )
  );
CREATE POLICY "certifications_own_write" ON public.professional_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles p
      WHERE p.id = profile_id AND p.account_id = auth.uid()
    )
  );

-- Companies & jobs: public read for active/public
CREATE POLICY "companies_public_read" ON public.companies
  FOR SELECT USING (is_public = TRUE OR auth.uid() = owner_account_id);
CREATE POLICY "companies_owner_write" ON public.companies
  FOR ALL USING (auth.uid() = owner_account_id) WITH CHECK (auth.uid() = owner_account_id);

CREATE POLICY "jobs_public_read" ON public.jobs
  FOR SELECT USING (
    is_public = TRUE AND status = 'active'
    OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_account_id = auth.uid())
  );
CREATE POLICY "jobs_owner_write" ON public.jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_account_id = auth.uid())
  );

-- Job applications: professional users only (enforced at app layer + RLS)
CREATE POLICY "applications_select_own_or_company" ON public.job_applications
  FOR SELECT USING (
    auth.uid() = applicant_account_id
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_account_id = auth.uid()
    )
  );
CREATE POLICY "applications_insert_professional" ON public.job_applications
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_account_id
    AND EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.professional_unlocked = TRUE
    )
  );

-- Freelance: public browse for stores/services
CREATE POLICY "stores_public_read" ON public.freelancer_stores
  FOR SELECT USING (is_active = TRUE OR auth.uid() = account_id);
CREATE POLICY "stores_own_write" ON public.freelancer_stores
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);

CREATE POLICY "services_public_read" ON public.freelance_services
  FOR SELECT USING (
    status = 'active'
    OR EXISTS (SELECT 1 FROM public.freelancer_stores s WHERE s.id = store_id AND s.account_id = auth.uid())
  );
CREATE POLICY "services_owner_write" ON public.freelance_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.freelancer_stores s WHERE s.id = store_id AND s.account_id = auth.uid())
  );

CREATE POLICY "portfolios_public_read" ON public.freelance_portfolios
  FOR SELECT USING (TRUE);
CREATE POLICY "portfolios_owner_write" ON public.freelance_portfolios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.freelancer_stores s WHERE s.id = store_id AND s.account_id = auth.uid())
  );

CREATE POLICY "reviews_public_read" ON public.freelance_reviews
  FOR SELECT USING (TRUE);
CREATE POLICY "reviews_registered_write" ON public.freelance_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_account_id AND auth.uid() IS NOT NULL);

CREATE POLICY "saved_services_own" ON public.saved_services
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);

CREATE POLICY "platform_links_read" ON public.platform_links
  FOR SELECT USING (TRUE);
CREATE POLICY "platform_links_own_write" ON public.platform_links
  FOR ALL USING (auth.uid() = account_id) WITH CHECK (auth.uid() = account_id);
