-- Add slug column to production `profiles` table for public profile URLs.
-- Safe to run multiple times. Run in Supabase SQL Editor if new users get profile 404s.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug_unique
  ON public.profiles (slug)
  WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.profiles.slug IS 'Public profile slug for /network/profile/{slug}';
