-- Phase 8B: OTP delivery metadata for SMS / WhatsApp providers

ALTER TABLE public.otp_codes
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'sms',
  ADD COLUMN IF NOT EXISTS provider_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_otp_phone_channel
  ON public.otp_codes(phone, purpose, channel, created_at DESC);
