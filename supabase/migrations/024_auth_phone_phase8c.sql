-- Phase 8C: phone auth metadata on accounts

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS phone_country TEXT,
  ADD COLUMN IF NOT EXISTS preferred_otp_channel TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_phone_verified
  ON public.accounts(phone, phone_verified)
  WHERE phone IS NOT NULL;
