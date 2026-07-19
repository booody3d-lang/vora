-- Optional gender field for accounts and professional profiles (avatar defaults, personalization)

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN public.accounts.gender IS 'User-selected gender for avatar defaults and profile personalization';
COMMENT ON COLUMN public.professional_profiles.gender IS 'Mirrors accounts.gender for public profile rendering';
