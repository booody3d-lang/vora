-- VORA Enterprise Security: RBAC, Sessions, OTP, Anti-Abuse, Privacy (GDPR/PDPL)

CREATE TYPE vora_role AS ENUM ('visitor', 'registered', 'professional', 'company', 'admin', 'owner');
CREATE TYPE otp_purpose AS ENUM ('login', 'signup', '2fa', 'password_reset');
CREATE TYPE report_target_type AS ENUM ('post', 'profile', 'store', 'service', 'company', 'message', 'user');
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE abuse_signal_type AS ENUM ('spam_messages', 'duplicate_listings', 'multi_account', 'rate_limit', 'report_spam');

-- Extend accounts with security fields
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS primary_role vora_role NOT NULL DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Active sessions & device tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  device_label TEXT,
  user_agent TEXT,
  ip_address INET,
  location TEXT,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_account ON public.user_sessions(account_id, last_active_at DESC);

-- Phone OTP codes (Saudi telecom optimized)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose otp_purpose NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_codes(phone, purpose, created_at DESC);

-- Rate limiting counters
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(key, window_start)
);

-- Abuse signals & device fingerprints
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  linked_account_ids UUID[] NOT NULL DEFAULT '{}',
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_fp_hash ON public.device_fingerprints(fingerprint_hash);

CREATE TABLE IF NOT EXISTS public.abuse_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  signal_type abuse_signal_type NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}',
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Universal reporting workflow
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  target_type report_target_type NOT NULL,
  target_id TEXT NOT NULL,
  target_label TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'high',
  assigned_admin_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.content_reports(status, priority, created_at DESC);

-- Security audit log (immutable)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Privacy settings (GDPR / Saudi PDPL)
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'members_only', 'connections_only')),
  hide_email BOOLEAN NOT NULL DEFAULT TRUE,
  hide_phone BOOLEAN NOT NULL DEFAULT TRUE,
  hide_contact_info BOOLEAN NOT NULL DEFAULT FALSE,
  feed_activity_visible BOOLEAN NOT NULL DEFAULT TRUE,
  allow_search_indexing BOOLEAN NOT NULL DEFAULT TRUE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data deletion requests (GDPR right to erasure / PDPL)
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  scheduled_deletion_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own" ON public.user_sessions
  FOR ALL USING (account_id = auth.uid());

CREATE POLICY "privacy_own" ON public.privacy_settings
  FOR ALL USING (account_id = auth.uid());

CREATE POLICY "reports_create" ON public.content_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

CREATE POLICY "reports_own" ON public.content_reports
  FOR SELECT USING (reporter_id = auth.uid());
