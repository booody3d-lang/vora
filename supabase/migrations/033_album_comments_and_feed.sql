-- Album comment replies + reactions, and album feed linkage

ALTER TABLE public.album_photo_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.album_photo_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS album_photo_comments_parent_idx
  ON public.album_photo_comments (parent_id, created_at);

CREATE TABLE IF NOT EXISTS public.album_photo_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.album_photo_comments(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('like', 'love', 'laugh', 'wow', 'sad', 'fire')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, account_id)
);

CREATE INDEX IF NOT EXISTS album_photo_comment_reactions_comment_idx
  ON public.album_photo_comment_reactions (comment_id);

ALTER TABLE public.album_photo_comment_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY album_photo_comment_reactions_select_authenticated
    ON public.album_photo_comment_reactions
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS feed_post_id uuid;
