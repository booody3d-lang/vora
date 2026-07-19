-- Extend auth.users signup trigger to persist role + gender into public.accounts

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role text := NEW.raw_user_meta_data->>'role';
  meta_gender text := NEW.raw_user_meta_data->>'gender';
  resolved_role vora_role := 'registered';
BEGIN
  IF meta_role IN ('registered', 'professional', 'company', 'admin', 'owner') THEN
    resolved_role := meta_role::vora_role;
  END IF;

  INSERT INTO public.accounts (
    id,
    email,
    full_name,
    tier,
    primary_role,
    gender,
    professional_unlocked,
    has_freelancer_store
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN resolved_role = 'professional' THEN 'professional'::account_tier
      ELSE 'basic'::account_tier
    END,
    resolved_role,
    CASE WHEN meta_gender IN ('male', 'female') THEN meta_gender ELSE NULL END,
    resolved_role IN ('professional', 'admin', 'owner'),
    resolved_role = 'professional'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.accounts.full_name),
    primary_role = EXCLUDED.primary_role,
    gender = COALESCE(EXCLUDED.gender, public.accounts.gender),
    professional_unlocked = EXCLUDED.professional_unlocked,
    has_freelancer_store = EXCLUDED.has_freelancer_store,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
