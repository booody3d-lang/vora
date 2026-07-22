-- Phase 4D: notification preferences RLS + default row bootstrap

CREATE POLICY "prefs_own_select" ON public.notification_preferences
  FOR SELECT USING (account_id = auth.uid());

CREATE POLICY "prefs_own_insert" ON public.notification_preferences
  FOR INSERT WITH CHECK (account_id = auth.uid());

CREATE POLICY "prefs_own_update" ON public.notification_preferences
  FOR UPDATE USING (account_id = auth.uid());

CREATE OR REPLACE FUNCTION public.ensure_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_notification_prefs ON public.accounts;
CREATE TRIGGER trg_accounts_notification_prefs
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.ensure_notification_preferences();
