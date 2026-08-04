-- Story reactions (emoji) for 24h stories

CREATE TABLE IF NOT EXISTS public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('like', 'love', 'laugh', 'wow', 'sad', 'fire')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, account_id)
);

CREATE INDEX IF NOT EXISTS story_reactions_story_idx
  ON public.story_reactions (story_id);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY story_reactions_select_authenticated ON public.story_reactions
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
