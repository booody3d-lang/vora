-- VORA Company Ecosystem — ATS, Subscriptions, Analytics

CREATE TYPE account_type AS ENUM ('individual', 'company');
CREATE TYPE work_location AS ENUM ('onsite', 'hybrid', 'remote');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract');
CREATE TYPE ats_stage AS ENUM (
  'new_applications',
  'under_review',
  'interview_scheduled',
  'final_review',
  'hired',
  'rejected'
);
CREATE TYPE company_subscription_status AS ENUM ('trial', 'active', 'expired', 'locked');

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_type account_type NOT NULL DEFAULT 'individual';

-- Company subscription tracking
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  status company_subscription_status NOT NULL DEFAULT 'trial',
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 months'),
  jobs_published_count INTEGER NOT NULL DEFAULT 0,
  free_jobs_limit INTEGER NOT NULL DEFAULT 3,
  subscription_started_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  annual_price_sar NUMERIC(10, 2) NOT NULL DEFAULT 600.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extend companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS announcement TEXT;

-- Extend jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS work_location work_location DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS employment_type employment_type DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS show_salary BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS require_video_pitch BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS impressions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER NOT NULL DEFAULT 0;

-- Extend job applications for ATS
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ats_stage ats_stage NOT NULL DEFAULT 'new_applications',
  ADD COLUMN IF NOT EXISTS video_pitch_url TEXT,
  ADD COLUMN IF NOT EXISTS hr_rating INTEGER CHECK (hr_rating >= 1 AND hr_rating <= 5),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.application_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  post_type TEXT NOT NULL DEFAULT 'text',
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, follower_id)
);

CREATE TABLE IF NOT EXISTS public.company_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  applications INTEGER NOT NULL DEFAULT 0,
  hires INTEGER NOT NULL DEFAULT 0,
  job_impressions INTEGER NOT NULL DEFAULT 0,
  job_clicks INTEGER NOT NULL DEFAULT 0,
  UNIQUE (company_id, date)
);

-- Publish guardrail function
CREATE OR REPLACE FUNCTION public.can_company_publish_job(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT * INTO v_sub FROM public.company_subscriptions WHERE company_id = p_company_id;
  IF NOT FOUND THEN RETURN TRUE; END IF;

  IF v_sub.status = 'active' AND v_sub.subscription_expires_at > NOW() THEN
    RETURN TRUE;
  END IF;

  IF v_sub.status = 'trial' AND v_sub.trial_ends_at > NOW() AND v_sub.jobs_published_count < v_sub.free_jobs_limit THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_subscriptions_owner" ON public.company_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_account_id = auth.uid())
  );

CREATE POLICY "internal_notes_company_owner" ON public.application_internal_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.jobs j ON j.id = ja.job_id
      JOIN public.companies c ON c.id = j.company_id
      WHERE ja.id = application_id AND c.owner_account_id = auth.uid()
    )
  );
