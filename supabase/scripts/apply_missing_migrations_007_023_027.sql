-- =============================================================================
-- VORA — Apply missing Supabase schema changes (007 partial + 023–027)
-- تطبيق التغييرات الناقصة على مخطط Supabase (007 جزئي + 023–027)
-- =============================================================================
-- Context / السياق:
--   Verification showed otp_codes missing, phone columns missing on accounts,
--   user_sessions & security_audit_log partial (indexes/RLS), 025 already applied.
--   التحقق أظهر: جدول otp_codes مفقود، أعمدة الهاتف مفقودة، جلسات المستخدم
--   وسجل التدقيق جزئيان (فهارس/RLS)، و025 مطبّق مسبقاً.
--
--   NOTE: This script does NOT apply 008_navigation_links.sql. If you need
--   navigation_links (required by 028/029), run:
--   supabase/scripts/apply_navigation_and_accounts.sql
--
-- Usage / الاستخدام (Supabase SQL Editor):
--   1. Review BEFORE verification output below.
--      راجع نتائج التحقق BEFORE أدناه.
--   2. Run this entire script.
--      نفّذ السكربت كاملاً.
--   3. Confirm AFTER verification shows all checks passing.
--      تأكد أن AFTER verification يمرّ بجميع الفحوصات.
--   4. Dry-run: replace COMMIT with ROLLBACK at the bottom.
--      تجربة جافة: استبدل COMMIT بـ ROLLBACK في الأسفل.
-- =============================================================================

BEGIN;

-- =============================================================================
-- BEFORE VERIFICATION / التحقق قبل التطبيق
-- Mirrors scripts/verify-migrations.mjs checks + 007 partial tables
-- =============================================================================

SELECT '=== BEFORE VERIFICATION ===' AS section;

-- 007 partial: tables / جداول 007 الجزئية
SELECT '007_otp_codes' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_codes'
  ) AS table_exists;

SELECT '007_privacy_settings' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'privacy_settings'
  ) AS table_exists;

SELECT '007_data_deletion_requests' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_deletion_requests'
  ) AS table_exists;

-- 007 + 024: accounts phone columns / أعمدة الهاتف في accounts
SELECT 'accounts_phone_columns' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone'
  ) AS has_phone,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_verified'
  ) AS has_phone_verified,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_country'
  ) AS has_phone_country,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'preferred_otp_channel'
  ) AS has_preferred_otp_channel;

-- 023: otp_codes delivery columns / أعمدة تسليم OTP
SELECT '023_otp_codes_columns' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'channel'
  ) AS has_channel,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'provider_ref'
  ) AS has_provider_ref;

-- 025: TOTP audit field (may already exist) / حقل تدقيق TOTP
SELECT '025_totp_enabled_at' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'totp_enabled_at'
  ) AS has_totp_enabled_at;

-- 026: user_sessions / جلسات المستخدم
SELECT '026_user_sessions' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sessions'
  ) AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_user_sessions_token_hash'
  ) AS has_token_hash_index;

-- 027: security_audit_log / سجل تدقيق الأمان
SELECT '027_security_audit_log' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'security_audit_log'
  ) AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_security_audit_account'
  ) AS has_account_index,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_security_audit_event_type'
  ) AS has_event_type_index,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'security_audit_log' AND policyname = 'audit_select_own'
  ) AS has_audit_select_policy;

-- Index hints (023, 024) / فهارس 023 و 024
SELECT 'index_hints' AS check_id,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_otp_phone_channel'
  ) AS idx_otp_phone_channel,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_accounts_phone_verified'
  ) AS idx_accounts_phone_verified;


-- =============================================================================
-- SECTION 007 (partial) — Missing tables & phone columns from security RBAC
-- القسم 007 (جزئي) — الجداول الناقصة وأعمدة الهاتف من RBAC الأمني
-- =============================================================================

-- otp_purpose enum required by otp_codes / نوع otp_purpose مطلوب لجدول otp_codes
DO $$ BEGIN
  CREATE TYPE otp_purpose AS ENUM ('login', 'signup', '2fa', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Phone columns on accounts (007 base) / أعمدة الهاتف على accounts (أساس 007)
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique constraint on phone (idempotent) / قيد فريد على phone
DO $$ BEGIN
  ALTER TABLE public.accounts ADD CONSTRAINT accounts_phone_key UNIQUE (phone);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- otp_codes base table (007) / جدول otp_codes الأساسي (007)
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

CREATE INDEX IF NOT EXISTS idx_otp_phone
  ON public.otp_codes(phone, purpose, created_at DESC);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- privacy_settings (GDPR / Saudi PDPL) / إعدادات الخصوصية
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'members_only', 'connections_only')),
  hide_email BOOLEAN NOT NULL DEFAULT TRUE,
  hide_phone BOOLEAN NOT NULL DEFAULT TRUE,
  hide_contact_info BOOLEAN NOT NULL DEFAULT FALSE,
  feed_activity_visible BOOLEAN NOT NULL DEFAULT TRUE,
  allow_search_indexing BOOLEAN NOT NULL DEFAULT TRUE,
  data_processing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "privacy_own" ON public.privacy_settings;
CREATE POLICY "privacy_own" ON public.privacy_settings
  FOR ALL USING (account_id = auth.uid());

-- data_deletion_requests (GDPR erasure / PDPL) / طلبات حذف البيانات
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  scheduled_deletion_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 023 — OTP delivery metadata (SMS / WhatsApp)
-- القسم 023 — بيانات تسليم OTP (SMS / WhatsApp)
-- =============================================================================

ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS provider_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_otp_phone_channel
  ON public.otp_codes(phone, purpose, channel, created_at DESC);


-- =============================================================================
-- SECTION 024 — Phone auth metadata on accounts
-- القسم 024 — بيانات مصادقة الهاتف على accounts
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS phone_country TEXT,
  ADD COLUMN IF NOT EXISTS preferred_otp_channel TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_phone_verified
  ON public.accounts(phone, phone_verified)
  WHERE phone IS NOT NULL;


-- =============================================================================
-- SECTION 025 — TOTP 2FA persistence (guarded; may already be applied)
-- القسم 025 — حقل تدقيق TOTP (محمي؛ قد يكون مطبّقاً مسبقاً)
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.accounts.totp_secret IS
  'AES-256-GCM encrypted TOTP secret (server-side access only via service role)';

COMMENT ON COLUMN public.accounts.totp_enabled IS
  'When true, email/password login requires a TOTP step-up verification';


-- =============================================================================
-- SECTION 026 — user_sessions indexes and RLS hardening
-- القسم 026 — فهارس user_sessions وتقوية RLS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash
  ON public.user_sessions (session_token_hash);

-- Replace legacy single policy with granular per-operation policies
-- استبدال السياسة القديمة بسياسات دقيقة لكل عملية
DROP POLICY IF EXISTS "sessions_own" ON public.user_sessions;

DROP POLICY IF EXISTS "sessions_select_own" ON public.user_sessions;
CREATE POLICY "sessions_select_own" ON public.user_sessions
  FOR SELECT USING (account_id = auth.uid());

DROP POLICY IF EXISTS "sessions_insert_own" ON public.user_sessions;
CREATE POLICY "sessions_insert_own" ON public.user_sessions
  FOR INSERT WITH CHECK (account_id = auth.uid());

DROP POLICY IF EXISTS "sessions_update_own" ON public.user_sessions;
CREATE POLICY "sessions_update_own" ON public.user_sessions
  FOR UPDATE USING (account_id = auth.uid());

DROP POLICY IF EXISTS "sessions_delete_own" ON public.user_sessions;
CREATE POLICY "sessions_delete_own" ON public.user_sessions
  FOR DELETE USING (account_id = auth.uid());


-- =============================================================================
-- SECTION 027 — security_audit_log indexes and RLS
-- القسم 027 — فهارس security_audit_log و RLS
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_security_audit_account
  ON public.security_audit_log (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type
  ON public.security_audit_log (event_type, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_own" ON public.security_audit_log;
CREATE POLICY "audit_select_own" ON public.security_audit_log
  FOR SELECT USING (account_id = auth.uid());


-- =============================================================================
-- AFTER VERIFICATION / التحقق بعد التطبيق
-- Same checks as BEFORE — all should be true / true
-- =============================================================================

SELECT '=== AFTER VERIFICATION ===' AS section;

SELECT '007_otp_codes' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_codes'
  ) AS table_exists,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'otp_codes'
  ) THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '007_privacy_settings' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'privacy_settings'
  ) AS table_exists,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'privacy_settings'
  ) THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '007_data_deletion_requests' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_deletion_requests'
  ) AS table_exists,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'data_deletion_requests'
  ) THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '023_otp_codes' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'channel'
  ) AS has_channel,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'provider_ref'
  ) AS has_provider_ref,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'purpose'
  ) AS has_purpose,
  CASE WHEN
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otp_codes')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'channel')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'provider_ref')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_codes' AND column_name = 'purpose')
  THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '024_accounts_phone' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_country'
  ) AS has_phone_country,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'preferred_otp_channel'
  ) AS has_preferred_otp_channel,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone'
  ) AS has_phone,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_verified'
  ) AS has_phone_verified,
  CASE WHEN
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_country')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'preferred_otp_channel')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'phone_verified')
  THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '025_totp_enabled_at' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'totp_enabled_at'
  ) AS has_totp_enabled_at,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'totp_enabled_at'
  ) THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '026_user_sessions' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_sessions'
  ) AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_user_sessions_token_hash'
  ) AS has_token_hash_index,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'sessions_select_own'
  ) AS has_select_policy,
  CASE WHEN
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions')
    AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_user_sessions_token_hash')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_sessions' AND policyname = 'sessions_select_own')
  THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT '027_security_audit_log' AS check_id,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'security_audit_log'
  ) AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_security_audit_account'
  ) AS has_account_index,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_security_audit_event_type'
  ) AS has_event_type_index,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'security_audit_log' AND policyname = 'audit_select_own'
  ) AS has_audit_select_policy,
  CASE WHEN
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit_log')
    AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_security_audit_account')
    AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_security_audit_event_type')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_audit_log' AND policyname = 'audit_select_own')
  THEN 'PASS' ELSE 'FAIL' END AS status;

SELECT 'index_hints' AS check_id,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_otp_phone_channel'
  ) AS idx_otp_phone_channel,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_accounts_phone_verified'
  ) AS idx_accounts_phone_verified,
  CASE WHEN
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_otp_phone_channel')
    AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_accounts_phone_verified')
  THEN 'PASS' ELSE 'FAIL' END AS status;

-- Dry-run: replace COMMIT with ROLLBACK / للتجربة: استبدل COMMIT بـ ROLLBACK
COMMIT;
