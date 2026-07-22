-- Phase 4C: Email delivery audit log (Resend + console fallback)

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  trigger_type TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('console', 'resend')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  message_id TEXT,
  error_message TEXT,
  payload_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_created
  ON public.email_delivery_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_to
  ON public.email_delivery_log(to_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_trigger
  ON public.email_delivery_log(trigger_type, created_at DESC)
  WHERE trigger_type IS NOT NULL;

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

-- Service-role writes only; no public read policies in Phase 4C
