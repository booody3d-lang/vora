-- Phase 5A: company RLS gaps + subscription bootstrap on company insert

-- Auto-create trial subscription when a company is registered
CREATE OR REPLACE FUNCTION public.bootstrap_company_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_subscriptions (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_bootstrap_subscription ON public.companies;
CREATE TRIGGER companies_bootstrap_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.bootstrap_company_subscription();

-- company_posts: public read; owners manage
CREATE POLICY "company_posts_public_read" ON public.company_posts
  FOR SELECT USING (TRUE);

CREATE POLICY "company_posts_owner_write" ON public.company_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_account_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_account_id = auth.uid()
    )
  );

-- company_followers: public counts; users manage own follows
CREATE POLICY "company_followers_public_read" ON public.company_followers
  FOR SELECT USING (TRUE);

CREATE POLICY "company_followers_insert_own" ON public.company_followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "company_followers_delete_own" ON public.company_followers
  FOR DELETE USING (auth.uid() = follower_id);

-- company_analytics_daily: owners read their metrics
ALTER TABLE public.company_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_analytics_owner_read" ON public.company_analytics_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_account_id = auth.uid()
    )
  );

CREATE POLICY "company_analytics_owner_write" ON public.company_analytics_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_account_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id AND c.owner_account_id = auth.uid()
    )
  );

-- job_applications: company owners can update ATS stage (Phase 5D prep)
CREATE POLICY "applications_update_company_owner" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_account_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.companies c ON c.id = j.company_id
      WHERE j.id = job_id AND c.owner_account_id = auth.uid()
    )
  );
