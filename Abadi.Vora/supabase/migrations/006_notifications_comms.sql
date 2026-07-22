-- VORA Communication & Notifications

CREATE TYPE notification_category AS ENUM ('social', 'employment', 'financial', 'owner', 'security', 'moderation');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');
CREATE TYPE chat_type AS ENUM ('network', 'freelance');
CREATE TYPE inquiry_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  category notification_category NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT NOT NULL,
  body_ar TEXT,
  href TEXT,
  amount_sar NUMERIC(12, 2),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  channels notification_channel[] NOT NULL DEFAULT '{in_app}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  global_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  category_settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Freelance chat sessions (escrow-gated)
CREATE TABLE IF NOT EXISTS public.freelance_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.freelance_orders(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_reason TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freelance_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.freelance_services(id) ON DELETE SET NULL,
  buyer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status inquiry_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freelance_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.freelance_chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  status message_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_account ON public.notifications(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(account_id) WHERE is_read = FALSE;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (account_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.freelance_messages;
