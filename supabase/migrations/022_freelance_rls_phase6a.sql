-- Phase 6A: freelance schema reconciliation + RLS for stores, services, orders

-- ============================================================
-- Schema extensions (align TS types with DB)
-- ============================================================

ALTER TABLE public.freelance_services
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.freelancer_stores
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate freelance_reviews from 001 (simple) to order-linked multi-axis (004 intent)
ALTER TABLE public.freelance_reviews
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.freelancer_stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS overall_quality INTEGER CHECK (overall_quality >= 1 AND overall_quality <= 5),
  ADD COLUMN IF NOT EXISTS communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  ADD COLUMN IF NOT EXISTS delivery_punctuality INTEGER CHECK (delivery_punctuality >= 1 AND delivery_punctuality <= 5),
  ADD COLUMN IF NOT EXISTS public_review TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'freelance_reviews'
      AND column_name = 'reviewer_account_id'
  ) THEN
    UPDATE public.freelance_reviews fr
    SET
      reviewer_id = COALESCE(fr.reviewer_id, fr.reviewer_account_id),
      overall_quality = COALESCE(fr.overall_quality, fr.rating),
      communication = COALESCE(fr.communication, fr.rating),
      delivery_punctuality = COALESCE(fr.delivery_punctuality, fr.rating),
      public_review = COALESCE(fr.public_review, fr.comment, '')
    WHERE fr.reviewer_id IS NULL
       OR fr.overall_quality IS NULL
       OR fr.public_review IS NULL;

    UPDATE public.freelance_reviews fr
    SET store_id = fs.store_id
    FROM public.freelance_services fs
    WHERE fr.service_id = fs.id
      AND fr.store_id IS NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "reviews_public_read" ON public.freelance_reviews;
DROP POLICY IF EXISTS "reviews_registered_write" ON public.freelance_reviews;

ALTER TABLE public.freelance_reviews
  DROP CONSTRAINT IF EXISTS freelance_reviews_service_id_reviewer_account_id_key;

ALTER TABLE public.freelance_reviews
  DROP COLUMN IF EXISTS reviewer_account_id,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS comment;

CREATE UNIQUE INDEX IF NOT EXISTS idx_freelance_reviews_order_id
  ON public.freelance_reviews(order_id)
  WHERE order_id IS NOT NULL;

-- ============================================================
-- Marketplace + order indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_freelance_services_status_category
  ON public.freelance_services(status, category)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_freelance_services_featured
  ON public.freelance_services(is_featured, is_sponsored)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_freelance_orders_buyer
  ON public.freelance_orders(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_freelance_orders_seller
  ON public.freelance_orders(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_freelance_orders_number
  ON public.freelance_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_messages_order
  ON public.order_messages(order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_service_addons_service
  ON public.service_addons(service_id);

CREATE INDEX IF NOT EXISTS idx_freelance_inquiries_seller
  ON public.freelance_inquiries(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_freelance_chat_sessions_participants
  ON public.freelance_chat_sessions(buyer_id, seller_id);

-- ============================================================
-- Order number generator (UUID orders + human-readable numbers)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.freelance_order_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_freelance_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT := to_char(NOW(), 'YYYY');
  seq_val BIGINT;
BEGIN
  SELECT nextval('public.freelance_order_number_seq') INTO seq_val;
  RETURN 'VORA-' || year_part || '-' || lpad(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Triggers
-- ============================================================

DROP TRIGGER IF EXISTS freelance_orders_updated_at ON public.freelance_orders;
CREATE TRIGGER freelance_orders_updated_at
  BEFORE UPDATE ON public.freelance_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.bootstrap_store_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.store_analytics_daily (store_id, date)
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (store_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS freelancer_stores_bootstrap_analytics ON public.freelancer_stores;
CREATE TRIGGER freelancer_stores_bootstrap_analytics
  AFTER INSERT ON public.freelancer_stores
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_store_analytics();

-- ============================================================
-- Enable RLS on tables missing policies
-- ============================================================

ALTER TABLE public.store_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelance_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- service_addons: public read for active services; store owners manage
-- ============================================================

DROP POLICY IF EXISTS "service_addons_public_read" ON public.service_addons;
CREATE POLICY "service_addons_public_read" ON public.service_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.freelance_services svc
      WHERE svc.id = service_id
        AND (
          svc.status = 'active'
          OR EXISTS (
            SELECT 1 FROM public.freelancer_stores s
            WHERE s.id = svc.store_id AND s.account_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "service_addons_owner_write" ON public.service_addons;
CREATE POLICY "service_addons_owner_write" ON public.service_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.freelance_services svc
      JOIN public.freelancer_stores s ON s.id = svc.store_id
      WHERE svc.id = service_id AND s.account_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.freelance_services svc
      JOIN public.freelancer_stores s ON s.id = svc.store_id
      WHERE svc.id = service_id AND s.account_id = auth.uid()
    )
  );

-- ============================================================
-- freelance_orders: buyer/seller participants (+ admin read)
-- ============================================================

DROP POLICY IF EXISTS "freelance_orders_participant_read" ON public.freelance_orders;
CREATE POLICY "freelance_orders_participant_read" ON public.freelance_orders
  FOR SELECT USING (
    auth.uid() = buyer_id
    OR auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "freelance_orders_buyer_insert" ON public.freelance_orders;
CREATE POLICY "freelance_orders_buyer_insert" ON public.freelance_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "freelance_orders_participant_update" ON public.freelance_orders;
CREATE POLICY "freelance_orders_participant_update" ON public.freelance_orders
  FOR UPDATE USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  ) WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

-- ============================================================
-- order_messages: order participants only
-- ============================================================

DROP POLICY IF EXISTS "order_messages_participant_read" ON public.order_messages;
CREATE POLICY "order_messages_participant_read" ON public.order_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.freelance_orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "order_messages_participant_insert" ON public.order_messages;
CREATE POLICY "order_messages_participant_insert" ON public.order_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.freelance_orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ============================================================
-- order_disputes: participants open; admins resolve
-- ============================================================

DROP POLICY IF EXISTS "order_disputes_participant_read" ON public.order_disputes;
CREATE POLICY "order_disputes_participant_read" ON public.order_disputes
  FOR SELECT USING (
    auth.uid() = opened_by
    OR EXISTS (
      SELECT 1 FROM public.freelance_orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "order_disputes_participant_insert" ON public.order_disputes;
CREATE POLICY "order_disputes_participant_insert" ON public.order_disputes
  FOR INSERT WITH CHECK (
    auth.uid() = opened_by
    AND EXISTS (
      SELECT 1 FROM public.freelance_orders o
      WHERE o.id = order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "order_disputes_admin_update" ON public.order_disputes;
CREATE POLICY "order_disputes_admin_update" ON public.order_disputes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = auth.uid() AND a.primary_role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- store_analytics_daily: store owners only
-- ============================================================

DROP POLICY IF EXISTS "store_analytics_owner_read" ON public.store_analytics_daily;
CREATE POLICY "store_analytics_owner_read" ON public.store_analytics_daily
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_stores s
      WHERE s.id = store_id AND s.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "store_analytics_owner_write" ON public.store_analytics_daily;
CREATE POLICY "store_analytics_owner_write" ON public.store_analytics_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_stores s
      WHERE s.id = store_id AND s.account_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_stores s
      WHERE s.id = store_id AND s.account_id = auth.uid()
    )
  );

-- ============================================================
-- freelance_reviews: public read; buyers review completed orders
-- ============================================================

CREATE POLICY "freelance_reviews_public_read" ON public.freelance_reviews
  FOR SELECT USING (TRUE);

CREATE POLICY "freelance_reviews_buyer_insert" ON public.freelance_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.freelance_orders o
      WHERE o.id = order_id
        AND o.buyer_id = auth.uid()
        AND o.status = 'completed'
    )
  );

-- ============================================================
-- freelance_chat_sessions + messages: buyer/seller only
-- ============================================================

DROP POLICY IF EXISTS "freelance_chat_sessions_participant" ON public.freelance_chat_sessions;
CREATE POLICY "freelance_chat_sessions_participant" ON public.freelance_chat_sessions
  FOR ALL USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  ) WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

DROP POLICY IF EXISTS "freelance_messages_participant_read" ON public.freelance_messages;
CREATE POLICY "freelance_messages_participant_read" ON public.freelance_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.freelance_chat_sessions cs
      WHERE cs.id = session_id
        AND (cs.buyer_id = auth.uid() OR cs.seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "freelance_messages_participant_insert" ON public.freelance_messages;
CREATE POLICY "freelance_messages_participant_insert" ON public.freelance_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.freelance_chat_sessions cs
      WHERE cs.id = session_id
        AND (cs.buyer_id = auth.uid() OR cs.seller_id = auth.uid())
    )
  );

-- ============================================================
-- freelance_inquiries: buyer sends; seller responds
-- ============================================================

DROP POLICY IF EXISTS "freelance_inquiries_buyer_insert" ON public.freelance_inquiries;
CREATE POLICY "freelance_inquiries_buyer_insert" ON public.freelance_inquiries
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "freelance_inquiries_participant_read" ON public.freelance_inquiries;
CREATE POLICY "freelance_inquiries_participant_read" ON public.freelance_inquiries
  FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
  );

DROP POLICY IF EXISTS "freelance_inquiries_seller_update" ON public.freelance_inquiries;
CREATE POLICY "freelance_inquiries_seller_update" ON public.freelance_inquiries
  FOR UPDATE USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);
