-- VORA Network Ecosystem — Social, Connections, Messaging
-- Builds on 001_initial_schema.sql

-- Enums
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'article', 'poll');
CREATE TYPE reaction_type AS ENUM ('like', 'insightful', 'support', 'celebrate');
CREATE TYPE proficiency_level AS ENUM ('elementary', 'limited', 'professional', 'full', 'native');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- ============================================================
-- Profile extensions
-- ============================================================
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_role TEXT,
  ADD COLUMN IF NOT EXISTS current_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.professional_experiences
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.professional_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  proficiency proficiency_level NOT NULL DEFAULT 'professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professional_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.professional_skills
  ADD COLUMN IF NOT EXISTS endorsement_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_video_url TEXT;

-- ============================================================
-- Connections & Following
-- ============================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, recipient_id),
  CHECK (requester_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ============================================================
-- Social Feed
-- ============================================================
CREATE TABLE IF NOT EXISTS public.network_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  post_type post_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  article_title TEXT,
  article_cover_url TEXT,
  poll_question TEXT,
  poll_options JSONB,
  poll_expires_at TIMESTAMPTZ,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reaction reaction_type NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  sharer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  quote_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.network_posts(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL CHECK (option_index >= 0 AND option_index <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, voter_id)
);

-- ============================================================
-- Real-time Messaging
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  participant_b UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  company_initiated BOOLEAN NOT NULL DEFAULT FALSE,
  job_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  status message_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, account_id)
);

-- ============================================================
-- Profile Analytics (Premium)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_network_posts_author ON public.network_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_network_posts_created ON public.network_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(participant_a, participant_b);

-- RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "connections_select_own" ON public.connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "connections_insert" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "connections_update_recipient" ON public.connections
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Follows policies
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Posts policies
CREATE POLICY "posts_public_read" ON public.network_posts
  FOR SELECT USING (is_public = TRUE OR auth.uid() = author_id);
CREATE POLICY "posts_author_write" ON public.network_posts
  FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Messages: only connected users or company-applicant
CREATE POLICY "conversations_participant" ON public.conversations
  FOR SELECT USING (auth.uid() = participant_a OR auth.uid() = participant_b);
CREATE POLICY "messages_participant_read" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );
CREATE POLICY "messages_participant_send" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- Realtime publication for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
