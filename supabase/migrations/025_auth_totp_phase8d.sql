-- Phase 8D: TOTP 2FA persistence audit field

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.accounts.totp_secret IS
  'AES-256-GCM encrypted TOTP secret (server-side access only via service role)';

COMMENT ON COLUMN public.accounts.totp_enabled IS
  'When true, email/password login requires a TOTP step-up verification';
