-- Phase 8E: user sessions indexes and RLS hardening for active devices

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash
  ON public.user_sessions (session_token_hash);

-- Ensure users can manage only their own sessions (service role bypasses RLS)
DROP POLICY IF EXISTS "sessions_own" ON public.user_sessions;

CREATE POLICY "sessions_select_own" ON public.user_sessions
  FOR SELECT USING (account_id = auth.uid());

CREATE POLICY "sessions_insert_own" ON public.user_sessions
  FOR INSERT WITH CHECK (account_id = auth.uid());

CREATE POLICY "sessions_update_own" ON public.user_sessions
  FOR UPDATE USING (account_id = auth.uid());

CREATE POLICY "sessions_delete_own" ON public.user_sessions
  FOR DELETE USING (account_id = auth.uid());
