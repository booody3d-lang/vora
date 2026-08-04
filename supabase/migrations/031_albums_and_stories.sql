-- Photo albums + 24h stories for users and companies

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- owner_id is account id when owner_type = 'user', company id when owner_type = 'company'
  owner_type text NOT NULL CHECK (owner_type IN ('user', 'company')),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers_only')),
  cover_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_owner_created_idx
  ON public.albums (owner_type, owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.album_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  mime_type text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS album_photos_album_idx
  ON public.album_photos (album_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.album_photo_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.album_photos(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id, account_id)
);

CREATE INDEX IF NOT EXISTS album_photo_likes_photo_idx
  ON public.album_photo_likes (photo_id);

CREATE TABLE IF NOT EXISTS public.album_photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.album_photos(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS album_photo_comments_photo_idx
  ON public.album_photo_comments (photo_id, created_at);

CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('user', 'company')),
  owner_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type text,
  duration_seconds numeric,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers_only')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stories_owner_expires_idx
  ON public.stories (owner_type, owner_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS stories_feed_expires_idx
  ON public.stories (expires_at DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_story_idx
  ON public.story_views (story_id);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- App uses service-role admin client for mutations; allow authenticated read of public rows.
DO $$ BEGIN
  CREATE POLICY albums_select_authenticated ON public.albums
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY album_photos_select_authenticated ON public.album_photos
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY stories_select_authenticated ON public.stories
    FOR SELECT TO authenticated USING (expires_at > now());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
