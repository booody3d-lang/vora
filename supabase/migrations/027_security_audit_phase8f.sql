-- Phase 8F: security audit log indexes and RLS for user activity reads

CREATE INDEX IF NOT EXISTS idx_security_audit_account
  ON public.security_audit_log (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type
  ON public.security_audit_log (event_type, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_own" ON public.security_audit_log;

CREATE POLICY "audit_select_own" ON public.security_audit_log
  FOR SELECT USING (account_id = auth.uid());
