-- VORA Freelance Marketplace — Orders, Escrow, Reviews

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'awaiting_requirements',
  'in_progress',
  'delivered',
  'revision_requested',
  'completed',
  'disputed',
  'cancelled'
);
CREATE TYPE dispute_status AS ENUM ('open', 'reviewing', 'resolved_buyer', 'resolved_seller');

-- Service extensions
ALTER TABLE public.freelance_services
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS revisions_included INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.freelancer_stores
  ADD COLUMN IF NOT EXISTS video_intro_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seo_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(5, 2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  extra_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freelance_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  buyer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.freelance_services(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.freelancer_stores(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending_payment',
  base_price NUMERIC(10, 2) NOT NULL,
  addons_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  delivery_days INTEGER NOT NULL,
  revisions_remaining INTEGER NOT NULL DEFAULT 2,
  selected_addons JSONB DEFAULT '[]',
  requirements_text TEXT,
  requirements_files TEXT[] DEFAULT '{}',
  delivery_files TEXT[] DEFAULT '{}',
  escrow_released BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.freelance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.freelance_services(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.freelancer_stores(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  overall_quality INTEGER NOT NULL CHECK (overall_quality >= 1 AND overall_quality <= 5),
  communication INTEGER NOT NULL CHECK (communication >= 1 AND communication <= 5),
  delivery_punctuality INTEGER NOT NULL CHECK (delivery_punctuality >= 1 AND delivery_punctuality <= 5),
  public_review TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.freelancer_stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  UNIQUE (store_id, date)
);

ALTER TABLE public.freelance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
