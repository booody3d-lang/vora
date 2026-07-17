-- VORA Billing, Payments & Escrow

CREATE TYPE subscription_plan AS ENUM ('free', 'premium_monthly', 'premium_yearly', 'company_annual');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'expired');
CREATE TYPE wallet_ledger_type AS ENUM ('pending', 'available', 'withdrawn');
CREATE TYPE transaction_type AS ENUM (
  'order_escrow',
  'order_release',
  'platform_commission',
  'subscription_payment',
  'withdrawal',
  'withdrawal_completed',
  'refund'
);
CREATE TYPE withdrawal_status AS ENUM ('pending_review', 'approved', 'rejected', 'completed');
CREATE TYPE invoice_type AS ENUM ('subscription', 'marketplace_purchase', 'commission', 'withdrawal');

-- User subscription state
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tri-wallet balances (denormalized for fast reads)
CREATE TABLE IF NOT EXISTS public.user_wallets (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  withdrawn_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (withdrawn_total >= 0),
  currency TEXT NOT NULL DEFAULT 'SAR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  ledger wallet_ledger_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  order_id UUID REFERENCES public.freelance_orders(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 50),
  iban TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending_review',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type invoice_type NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  line_items JSONB NOT NULL DEFAULT '[]',
  stripe_payment_intent_id TEXT,
  transaction_id TEXT NOT NULL UNIQUE,
  company_tax_id TEXT,
  company_name TEXT,
  company_address TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  plan subscription_plan,
  order_id UUID REFERENCES public.freelance_orders(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Commission split function
CREATE OR REPLACE FUNCTION public.process_order_completion(
  p_order_id UUID,
  p_seller_id UUID,
  p_total NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_commission NUMERIC;
  v_net NUMERIC;
BEGIN
  v_commission := ROUND(p_total * 0.10, 2);
  v_net := ROUND(p_total - v_commission, 2);

  UPDATE public.user_wallets
  SET pending_balance = pending_balance - p_total,
      available_balance = available_balance + v_net,
      updated_at = NOW()
  WHERE account_id = p_seller_id;

  INSERT INTO public.wallet_transactions (account_id, type, ledger, amount, order_id, description)
  VALUES
    (p_seller_id, 'order_release', 'available', v_net, p_order_id, 'Order completion — net earnings'),
    (p_seller_id, 'platform_commission', 'available', v_commission, p_order_id, 'VORA 10% platform commission');

  RETURN jsonb_build_object(
    'total', p_total,
    'commission', v_commission,
    'net_earnings', v_net
  );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own" ON public.user_subscriptions
  FOR ALL USING (auth.uid() = account_id);
CREATE POLICY "wallets_own" ON public.user_wallets
  FOR ALL USING (auth.uid() = account_id);
CREATE POLICY "transactions_own" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = account_id);
CREATE POLICY "withdrawals_own" ON public.withdrawal_requests
  FOR ALL USING (auth.uid() = account_id);
CREATE POLICY "invoices_own" ON public.invoices
  FOR SELECT USING (auth.uid() = account_id);
